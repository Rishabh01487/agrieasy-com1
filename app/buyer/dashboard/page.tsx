'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  createdAt: string
}

const C = {
  bg: '#faf7ff',
  white: '#ffffff',
  brinjal: '#6d28d9',
  brLight: '#ede9fe',
  brMid: '#c4b5fd',
  brDark: '#4c1d95',
  text: '#1e1b4b',
  muted: '#6b7280',
  border: '#ddd6fe',
  red: '#dc2626',
}

const card: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 1px 8px rgba(109,40,217,0.07)',
}

export default function BuyerDashboard() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const commodities = ['Wheat', 'Rice', 'Maize', 'Barley', 'Paddy', 'Oilseeds']

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch('/api/listings')
        const data = await response.json()
        setListings(data.listings || [])
      } catch (error) {
        console.error('Error fetching listings:', error)
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: C.brinjal }}>AgriEasy</span>
            <span style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>🛒 Buyer</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/buyer/create-listing" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>+ New Listing</Link>
            <Link href="/buyer/payment" style={{ color: C.brinjal, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: C.brLight }}>Payments</Link>
            <Link href="/" style={{ color: C.red, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: '#fee2e2', border: '1px solid #fca5a5' }}>Logout</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: C.brDark }}>Welcome, Buyer! 🛒</h2>
          <p style={{ margin: '6px 0 0', color: C.muted }}>Source fresh produce directly from farmers across India.</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Active Listings', value: listings.length, icon: '📋' },
            { label: 'Commodity Types', value: commodities.length, icon: '🌾' },
            { label: 'Post New Demand', value: 'Create →', icon: '➕', href: '/buyer/create-listing' },
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

        {/* Commodity tags */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontWeight: 700, color: C.brDark }}>Available Commodity Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {commodities.map(c => (
              <span key={c} style={{ background: C.brLight, border: `1px solid ${C.brMid}`, color: C.brinjal, borderRadius: '100px', padding: '6px 18px', fontSize: '0.875rem', fontWeight: 600 }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Listings table */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: C.brDark }}>Your Listings</h3>
            <Link href="/buyer/create-listing" style={{ background: C.brinjal, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 18px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>+ Create Listing</Link>
          </div>
          {loading ? (
            <div style={{ color: C.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p style={{ marginBottom: '16px' }}>No listings yet — post your demand to connect with farmers!</p>
              <Link href="/buyer/create-listing" style={{ color: C.brinjal, fontWeight: 600, textDecoration: 'none' }}>Create your first listing →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Commodity', 'Quantity', 'Price/Unit', 'Date', 'Action'].map(h => (
                      <th key={h} style={{ color: C.brDark, fontWeight: 700, fontSize: '0.8rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => (
                    <tr key={l._id} style={{ borderBottom: `1px solid ${C.bg}` }}>
                      <td style={{ color: C.text, padding: '12px 14px', fontWeight: 600 }}>{l.commodity}</td>
                      <td style={{ color: C.muted, padding: '12px 14px' }}>{l.quantity} kg</td>
                      <td style={{ color: C.muted, padding: '12px 14px' }}>₹{l.pricePerUnit}</td>
                      <td style={{ color: C.muted, padding: '12px 14px', fontSize: '0.875rem' }}>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/buyer/listing/${l._id}`} style={{ color: C.brinjal, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Edit →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}