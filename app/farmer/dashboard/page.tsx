'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch, logout } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  buyerId: { firmName: string; address: string }
}

export default function FarmerDashboard() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await authFetch('/api/listings')
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          setError(data.error || 'Failed to fetch listings')
          return
        }
        const data = await response.json()
        setListings(data.listings || [])
      } catch (err) {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [])

  const card = {
    ...cardStyle(FARMER),
    boxShadow: SHARED.shadowMd,
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{ minHeight: '100vh', background: FARMER.bg, fontFamily: SHARED.font, color: FARMER.text }}>
      <nav style={{ ...navStyle(FARMER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', background: FARMER.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AgriEasy</span>
            <span style={{ background: FARMER.primaryLight, color: FARMER.primary, border: `1px solid ${FARMER.border}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, boxShadow: SHARED.shadow }}>Farmer</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>Search Buyers</Link>
            <Link href="/farmer/book-vehicle" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>Book Vehicle</Link>
            <Link href="/farmer/my-bookings" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>My Bookings</Link>
            <Link href="/agrisocial" style={{ color: FARMER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: FARMER.primaryLight, transition: 'all 0.2s ease' }}>AgriSocial</Link>
            <button onClick={logout} style={{ color: FARMER.red, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: SHARED.errorLight, border: '1px solid #fca5a5', cursor: 'pointer', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: FARMER.textSecondary }}>Jai Kisan!</h2>
          <p style={{ margin: '6px 0 0', color: FARMER.muted }}>Here&apos;s what&apos;s happening with buyer listings today.</p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Buyer Listings', value: listings.length, icon: '🛒' },
            { label: 'My Bookings', value: 'View →', icon: '📦', href: '/farmer/my-bookings' },
            { label: 'Book a Vehicle', value: 'Now →', icon: '🚛', href: '/farmer/book-vehicle' },
          ].map(c => (
            <div key={c.label} style={card}>
              <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{c.icon}</div>
              <div style={{ color: FARMER.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{c.label}</div>
              {c.href
                ? <Link href={c.href} style={{ color: FARMER.primary, fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>{c.value}</Link>
                : <div style={{ color: FARMER.textSecondary, fontWeight: 800, fontSize: '2rem' }}>{c.value}</div>}
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: FARMER.textSecondary }}>Available Buyer Listings</h3>
            <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ color: FARMER.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: FARMER.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌱</div>
              <p style={{ marginBottom: '16px' }}>No buyer listings yet</p>
              <Link href="/farmer/search-buyers" style={{ color: FARMER.primary, fontWeight: 600, textDecoration: 'none' }}>Search for buyers →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
              {listings.map(l => (
                <div key={l._id} style={{ background: FARMER.bg, border: `1px solid ${FARMER.border}`, borderRadius: '12px', padding: '18px', transition: 'all 0.2s ease' }}>
                  <h4 style={{ color: FARMER.primary, fontWeight: 800, margin: '0 0 8px' }}>{l.commodity}</h4>
                  <p style={{ color: FARMER.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>Qty: <b style={{ color: FARMER.text }}>{l.quantity} kg</b></p>
                  <p style={{ color: FARMER.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>Price: <b style={{ color: FARMER.text }}>₹{l.pricePerUnit}/unit</b></p>
                  <p style={{ color: FARMER.muted, fontSize: '0.875rem', margin: '0 0 14px' }}>Buyer: <b style={{ color: FARMER.text }}>{l.buyerId?.firmName || '—'}</b></p>
                  <Link href={`/farmer/buyer/${l._id}`} style={{ background: FARMER.primaryLight, color: FARMER.primary, border: `1px solid ${FARMER.border}`, borderRadius: '8px', padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s ease' }}>View Details →</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}