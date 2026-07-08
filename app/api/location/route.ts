import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Booking from '@/lib/models/Booking'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'

// POST /api/location — update the authenticated user's live location
// Body: { latitude, longitude, bookingId? }
//   - If bookingId is provided, also store the location on the booking
//     (so the farmer/buyer can track the transporter for that specific booking)
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Too many location updates.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()

        if (typeof body.latitude !== 'number' || typeof body.longitude !== 'number') {
            return validationError('latitude and longitude must be numbers')
        }
        if (body.latitude < -90 || body.latitude > 90 || body.longitude < -180 || body.longitude > 180) {
            return validationError('Invalid coordinates')
        }

        // Update the user's location
        await User.findByIdAndUpdate(auth.user.userId, {
            $set: {
                'location.latitude': body.latitude,
                'location.longitude': body.longitude,
                'location.updatedAt': new Date(),
            },
        })

        // If a bookingId is provided, also update the booking's live tracking
        if (body.bookingId) {
            const booking = await Booking.findById(body.bookingId)
            if (booking && booking.transporterId?.toString() === auth.user.userId) {
                booking.driverLocation = {
                    latitude: body.latitude,
                    longitude: body.longitude,
                    updatedAt: new Date(),
                }
                await booking.save()
            }
        }

        return NextResponse.json({ success: true, location: { latitude: body.latitude, longitude: body.longitude } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }
}

// GET /api/location?userId= or ?bookingId=
//   - ?userId=  → returns that user's last known location
//   - ?bookingId= → returns the booking's driver location + farmer + buyer locations
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const bookingId = searchParams.get('bookingId')

        if (bookingId) {
            // Return all 3 parties' locations for a booking
            const booking = await Booking.findById(bookingId)
                .populate('farmerId', 'farmerName firmName role location')
                .populate('buyerId', 'farmerName firmName role location')
                .populate('transporterId', 'farmerName firmName role location')
                .lean()

            if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

            return NextResponse.json({
                success: true,
                booking: {
                    _id: booking._id,
                    status: booking.status,
                    commodity: booking.commodity,
                    quantity: booking.quantity,
                    pickupLocation: booking.pickupLocation || '',
                    deliveryLocation: booking.deliveryLocation || '',
                    driverLocation: booking.driverLocation || null,
                    farmer: booking.farmerId,
                    buyer: booking.buyerId,
                    transporter: booking.transporterId,
                },
            })
        }

        if (userId) {
            const user = await User.findById(userId).select('farmerName firmName role location').lean()
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
            return NextResponse.json({ success: true, user })
        }

        return validationError('Provide userId or bookingId')
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 })
    }
}
