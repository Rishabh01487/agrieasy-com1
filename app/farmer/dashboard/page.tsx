'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  buyerId: { firmName: string; phone: string }
}

// Light Brinjal Palette
const C = {
  bg: '#faf7ff',           // near-white with a hint of purple
  white: '#ffffff',
  brinjal: '#6d28d9',      // core brinjal/purple
  brLight: '#ede9fe',      // light lavender
  brMid: '#c4b5fd',        // medium lavender
  brDark: '#4c1d95',       // deep brinjal
  text: '#1e1b4b',         // dark purple-navy text
  muted: '#6b7280',        // gray
  border: '#ddd6fe',       // lavender border
  red: '#dc2626',
}

const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 8px rgba(109,40,217,0.07)',
}

export default function FarmerDashboard() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('/api/listings')
        const data = await response.json()
        setListings(data.listings || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
      {/* Navbar */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: C.brinjal }}>AgriEasy</span>
            <span style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>🌾 Farmer</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/farmer/search-buyers" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>Search Buyers</Link>
            <Link href="/farmer/book-vehicle" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>Book Vehicle</Link>
            <Link href="/" style={{ color: C.red, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: '#fee2e2', border: '1px solid #fca5a5' }}>Logout</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: C.brDark }}>Jai Kisan! 🌾</h2>
          <p style={{ margin: '6px 0 0', color: C.muted }}>Here&apos;s what&apos;s happening with your listings today.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Buyer Listings', value: listings.length, icon: '🛒' },
            { label: 'My Bookings', value: 'View →', icon: '📦', href: '/farmer/my-bookings' },
            { label: 'Book a Vehicle', value: 'Now →', icon: '🚛', href: '/farmer/book-vehicle' },
          ].map(c => (
            <div key={c.label} style={card}>
              <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{c.icon}</div>
              <div style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{c.label}</div>
              {c.href
                ? <Link href={c.href} style={{ color: C.brinjal, fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>{c.value}</Link>
                : <div style={{ color: C.brDark, fontWeight: 800, fontSize: '2rem' }}>{c.value}</div>}
            </div>
          ))}
        </div>

        {/* Listings */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.brDark }}>Available Buyer Listings</h3>
            <Link href="/farmer/search-buyers" style={{ color: C.brinjal, fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ color: C.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌱</div>
              <p style={{ marginBottom: '16px' }}>No buyer listings yet</p>
              <Link href="/farmer/search-buyers" style={{ color: C.brinjal, fontWeight: 600, textDecoration: 'none' }}>Search for buyers →</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }}>
              {listings.map(l => (
                <div key={l._id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
                  <h4 style={{ color: C.brinjal, fontWeight: 800, margin: '0 0 8px' }}>{l.commodity}</h4>
                  <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>Qty: <b style={{ color: C.text }}>{l.quantity} kg</b></p>
                  <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 4px' }}>Price: <b style={{ color: C.text }}>₹{l.pricePerUnit}/unit</b></p>
                  <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 14px' }}>Buyer: <b style={{ color: C.text }}>{l.buyerId?.firmName || '—'}</b></p>
                  <Link href={`/farmer/buyer/${l._id}`} style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '8px', padding: '6px 14px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>View Details →</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}