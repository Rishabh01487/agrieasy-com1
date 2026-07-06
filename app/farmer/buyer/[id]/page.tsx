'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  quality?: string
  paymentConditions?: string
  firmLocation?: string
  buyerId: { _id: string; firmName: string; address: string }
  createdAt: string
}

export default function BuyerListingDetail() {
  const params = useParams()
  const listingId = params.id as string
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!listingId) return
    const fetchListing = async () => {
      try {
        const res = await authFetch('/api/listings/' + listingId)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'Failed to load listing')
          return
        }
        const data = await res.json()
        if (data.listing) {
          setListing(data.listing)
        } else {
          setError('Listing not found')
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchListing()
  }, [listingId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FARMER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading listing details…
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <p style={{ color: FARMER.muted }}>{error || 'Listing not found'}</p>
        <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to Search Buyers</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, color: FARMER.text }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← Search Buyers</Link>
          <span style={{ color: FARMER.muted }}>›</span>
          <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>{listing.commodity}</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowLg, transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ color: FARMER.textSecondary, fontWeight: 900, fontSize: '1.8rem', margin: '0 0 6px' }}>{listing.commodity}</h1>
              <p style={{ color: FARMER.muted, fontSize: '0.875rem', margin: 0 }}>Posted on {new Date(listing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <Link href={`/farmer/book-vehicle?listingId=${listing._id}`}
              style={{ background: FARMER.primary, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', boxShadow: '0 4px 14px rgba(101,163,13,0.25)', transition: 'all 0.2s ease' }}>
              Book Vehicle
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {[
              ['Quantity', `${listing.quantity} ${listing.unit || 'kg'}`],
              ['Price per Unit', `₹${listing.pricePerUnit}`],
              ['Total Value', `₹${(listing.quantity * listing.pricePerUnit).toLocaleString('en-IN')}`],
              ['Quality', listing.quality || 'Not specified'],
              ['Payment Terms', listing.paymentConditions || '—'],
              ['Location', listing.firmLocation || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: FARMER.bg, borderRadius: '12px', padding: '14px 18px', border: `1px solid ${FARMER.border}` }}>
                <div style={{ color: FARMER.muted, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ color: FARMER.text, fontWeight: 700, fontSize: '1rem' }}>{value}</div>
              </div>
            ))}
          </div>

          {listing.buyerId && (
            <div style={{ background: FARMER.primaryLight, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${FARMER.border}` }}>
              <h3 style={{ color: FARMER.textSecondary, fontWeight: 700, fontSize: '0.95rem', margin: '0 0 12px' }}>Buyer Information</h3>
              <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>{listing.buyerId.firmName || '—'}</p>
              <p style={{ color: FARMER.muted, fontSize: '0.875rem', margin: 0 }}>{listing.buyerId.address || '—'}</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <Link href="/farmer/dashboard" style={{ color: FARMER.muted, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}