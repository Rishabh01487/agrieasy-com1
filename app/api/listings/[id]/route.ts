import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Listing from '@/lib/models/Listing'
import { z } from 'zod/v4'
import { positiveAmountSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { verifyCsrf } from '@/lib/csrf'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  }
  // SECURITY FIX (HIGH — JWT algorithm-confusion):
  // Previously this route did an inline `jwt.verify(token, secret)`
  // WITHOUT specifying `algorithms: ['HS256']`, allowing an attacker
  // to forge a token with `alg: 'none'` or RS256/HS256 confusion.
  // Now we delegate to authenticateRequest() which pins the algorithm.
  // Only buyers can edit listings (they own them) — enforce the role.
  const auth = authenticateRequest(request, ['buyer'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden('Only buyers can edit listings')

  try {
    await dbConnect()
    const { id } = await params

    const body = await request.json()

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
    const textFields = ['commodity', 'quality', 'paymentConditions', 'firmLocation', 'location', 'description']
    const validUnits = ['kg', 'quintal', 'ton', 'bags']
    const xss = (await import('xss')).default
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (textFields.includes(field)) {
          updateData[field] = xss(String(body[field]))
        } else if (field === 'unit' && !validUnits.includes(body[field])) {
          return validationError('Invalid unit', [{ field: 'unit', message: `Must be one of: ${validUnits.join(', ')}` }])
        } else {
          updateData[field] = body[field]
        }
      }
    }
    if (updateData.priceDate) {
      const d = new Date(updateData.priceDate as string)
      if (isNaN(d.getTime())) {
        return validationError('Invalid priceDate', [{ field: 'priceDate', message: 'Could not parse date' }])
      }
      updateData.priceDate = d
    }
    updateData.updatedAt = new Date()

    const listing = await Listing.findOneAndUpdate(
      { _id: id, buyerId: auth.user.userId },
      updateData,
      { new: true }
    )

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found or you do not own it' }, { status: 404 })
    }

    return NextResponse.json({ success: true, listing })
  } catch (error: unknown) {
    console.error('Update listing error:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  }
  // SECURITY FIX (HIGH — JWT algorithm-confusion): see PATCH above.
  const auth = authenticateRequest(request, ['buyer'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden('Only buyers can delete listings')

  try {
    await dbConnect()
    const { id } = await params

    const listing = await Listing.findOneAndDelete({ _id: id, buyerId: auth.user.userId })
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found or you do not own it' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete listing error:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}