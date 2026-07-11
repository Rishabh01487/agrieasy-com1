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

        // If a bookingId is provided, also update the booking's live tracking.
        // The driver is either:
        //   - the transporter (when booking.transporterId matches), OR
        //   - the buyer's own driver (when booking.buyerVehicleId is set and
        //     the buyer owns that vehicle)
        if (body.bookingId) {
            const booking = await Booking.findById(body.bookingId)
            if (booking) {
                const isTransporter = booking.transporterId?.toString() === auth.user.userId
                let isBuyerVehicleOwner = false
                if (booking.buyerVehicleId) {
                    const BuyerVehicle = (await import('@/lib/models/BuyerVehicle')).default
                    const bv = await BuyerVehicle.findById(booking.buyerVehicleId).lean()
                    if (bv && bv.buyerId.toString() === auth.user.userId) {
                        isBuyerVehicleOwner = true
                    }
                }
                if (isTransporter || isBuyerVehicleOwner) {
                    booking.driverLocation = {
                        latitude: body.latitude,
                        longitude: body.longitude,
                        updatedAt: new Date(),
                    }
                    // Also push to tracking history
                    if (!Array.isArray(booking.trackingUpdates)) {
                        ;(booking as any).trackingUpdates = []
                    }
                    booking.trackingUpdates.push({
                        timestamp: new Date(),
                        location: { latitude: body.latitude, longitude: body.longitude },
                        status: booking.status,
                    })
                    // Cap history at 100 entries to avoid unbounded growth
                    if (booking.trackingUpdates.length > 100) {
                        booking.trackingUpdates = booking.trackingUpdates.slice(-100)
                    }
                    await booking.save()
                }
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
                .populate('farmerId', 'farmerName firmName role location phone')
                .populate('buyerId', 'farmerName firmName role location phone')
                .populate('transporterId', 'farmerName firmName transporterCompanyName role location phone')
                .populate('vehicleId', 'vehicleType registrationNumber driverName driverPhone')
                .populate('buyerVehicleId', 'vehicleType vehicleDisplayName registrationNumber driverName driverPhone')
                .lean()

            if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

            // Build a commodity summary that works for both new multi-commodity
            // bookings and legacy single-commodity ones.
            let commoditySummary = booking.commodity || ''
            let totalQty = booking.quantity || 0
            if (Array.isArray(booking.commodities) && booking.commodities.length > 0) {
                commoditySummary = booking.commodities.map((c: any) => `${c.name} (${c.quantity} kg)`).join(' · ')
                totalQty = booking.totalQuantity || booking.commodities.reduce((s: number, c: any) => s + (c.quantity || 0), 0)
            }

            return NextResponse.json({
                success: true,
                booking: {
                    _id: booking._id,
                    status: booking.status,
                    commodity: commoditySummary,
                    commodities: booking.commodities || [],
                    totalQuantity: totalQty,
                    quantity: totalQty,  // legacy field
                    pickupLocation: booking.pickupLocation || '',
                    deliveryLocation: booking.deliveryLocation || '',
                    driverLocation: booking.driverLocation || null,
                    trackingUpdates: (booking.trackingUpdates || []).slice(-20),  // last 20 pings
                    estimatedArrivalTime: booking.estimatedArrivalTime || null,
                    farmer: booking.farmerId,
                    buyer: booking.buyerId,
                    transporter: booking.transporterId,
                    vehicle: booking.vehicleId,
                    buyerVehicle: booking.buyerVehicleId,
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
