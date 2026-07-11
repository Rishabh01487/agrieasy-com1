import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Listing from '@/lib/models/Listing'
import { z } from 'zod/v4'
import { positiveAmountSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'

// GET /api/listings/[id] — fetch a single listing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect()
    const { id } = await params

    if (!id) return NextResponse.json({ error: 'Listing ID required' }, { status: 400 })

    const listing = await Listing.findById(id).populate('buyerId', 'firmName phone address')
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Get listing error:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

// PATCH /api/listings/[id] — update a listing (auth required)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const jwt = (await import('jsonwebtoken')).default
    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const payload = jwt.verify(token, secret) as { userId: string; role: string }

    await dbConnect()
    const { id } = await params

    const body = await request.json()

    // Validate key numeric fields if provided
    if (body.quantity !== undefined) {
      const q = z.number().positive('Quantity must be positive').max(100_000).safeParse(body.quantity)
      if (!q.success) return validationError('Invalid quantity', q.error.issues.map(i => ({ field: 'quantity', message: i.message })))
      body.quantity = q.data
    }
    if (body.pricePerUnit !== undefined) {
      const p = positiveAmountSchema.safeParse(body.pricePerUnit)
      if (!p.success) return validationError('Invalid pricePerUnit', p.error.issues.map(i => ({ field: 'pricePerUnit', message: i.message })))
      body.pricePerUnit = p.data
    }

    const allowedFields = ['commodity', 'quantity', 'unit', 'pricePerUnit', 'quality', 'paymentConditions', 'firmLocation', 'location', 'isActive', 'commodityPhoto', 'priceDate', 'description']
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }
    // Normalize priceDate if provided
    if (updateData.priceDate) {
      const d = new Date(updateData.priceDate as string)
      if (isNaN(d.getTime())) {
        return validationError('Invalid priceDate', [{ field: 'priceDate', message: 'Could not parse date' }])
      }
      updateData.priceDate = d
    }
    updateData.updatedAt = new Date()

    const listing = await Listing.findOneAndUpdate(
      { _id: id, buyerId: payload.userId },
      updateData,
      { new: true }
    )

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found or you do not own it' }, { status: 404 })
    }

    return NextResponse.json({ success: true, listing })
  } catch (error: unknown) {
    console.error('Update listing error:', error)
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

// DELETE /api/listings/[id] — delete a listing (auth required)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    const jwt = (await import('jsonwebtoken')).default
    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const payload = jwt.verify(token, secret) as { userId: string; role: string }

    await dbConnect()
    const { id } = await params

    const listing = await Listing.findOneAndDelete({ _id: id, buyerId: payload.userId })
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found or you do not own it' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete listing error:', error)
    if (error instanceof Error && error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}