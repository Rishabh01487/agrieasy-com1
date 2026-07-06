'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle, getStatusStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  pricePerUnit: number
  createdAt: string
}

export default function BuyerDashboard() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const commodities = ['Wheat', 'Rice', 'Maize', 'Barley', 'Paddy', 'Oilseeds']

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { userId } = getUserInfo()
        if (!userId) { setError('Please log in'); setLoading(false); return }
        const url = '/api/listings?buyerId=' + userId
        const response = await authFetch(url)
        if (!response.ok) {
          setError('Failed to load listings')
          return
        }
        const data = await response.json()
        setListings(data.listings || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [])

  const card = {
    ...cardStyle(BUYER),
    boxShadow: SHARED.shadowMd,
    transition: 'all 0.2s ease',
  }

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '36px', height: '36px', borderRadius: '8px' }} />
            <span style={{ fontWeight: 800, fontSize: '1.15rem', background: BUYER.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AgriEasy</span>
            <span style={{ background: BUYER.primaryLight, color: BUYER.primary, border: `1px solid ${BUYER.border}`, borderRadius: '100px', padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, boxShadow: SHARED.shadow }}>🛒 Buyer</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/buyer/create-listing" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: BUYER.primaryLight, transition: 'all 0.2s ease' }}>+ New Listing</Link>
            <Link href="/buyer/payment" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: BUYER.primaryLight, transition: 'all 0.2s ease' }}>Payments</Link>
            <Link href="/agrisocial" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, background: BUYER.primaryLight, transition: 'all 0.2s ease' }}>📱 AgriSocial</Link>
            <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: BUYER.textSecondary }}>Welcome, Buyer! 🛒</h2>
          <p style={{ margin: '6px 0 0', color: BUYER.muted }}>Source fresh produce directly from farmers across India.</p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Active Listings', value: listings.length, icon: '📋' },
            { label: 'Commodity Types', value: commodities.length, icon: '🌾' },
            { label: 'Post New Demand', value: 'Create →', icon: '➕', href: '/buyer/create-listing' },
          ].map(c => (
            <div key={c.label} style={card}>
              <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{c.icon}</div>
              <div style={{ color: BUYER.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{c.label}</div>
              {c.href
                ? <Link href={c.href} style={{ color: BUYER.primary, fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>{c.value}</Link>
                : <div style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '2rem' }}>{c.value}</div>}
            </div>
          ))}
        </div>

        {/* Commodity tags */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontWeight: 700, color: BUYER.textSecondary }}>Available Commodity Categories</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {commodities.map(c => (
              <span key={c} style={{ background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, color: BUYER.primary, borderRadius: '100px', padding: '6px 18px', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>{c}</span>
            ))}
          </div>
        </div>

        {/* Listings table */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: BUYER.textSecondary }}>Your Listings</h3>
            <Link href="/buyer/create-listing" style={{ background: BUYER.primary, color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 18px', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(5,150,105,0.25)', transition: 'all 0.2s ease' }}>+ Create Listing</Link>
          </div>
          {loading ? (
            <div style={{ color: BUYER.muted, textAlign: 'center', padding: '40px 0' }}>Loading…</div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: BUYER.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
              <p style={{ marginBottom: '16px' }}>No listings yet — post your demand to connect with farmers!</p>
              <Link href="/buyer/create-listing" style={{ color: BUYER.primary, fontWeight: 600, textDecoration: 'none' }}>Create your first listing →</Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BUYER.border}` }}>
                    {['Commodity', 'Quantity', 'Price/Unit', 'Date', 'Action'].map(h => (
                      <th key={h} style={{ color: BUYER.textSecondary, fontWeight: 700, fontSize: '0.8rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listings.map(l => (
                    <tr key={l._id} style={{ borderBottom: `1px solid ${BUYER.bg}` }}>
                      <td style={{ color: BUYER.text, padding: '12px 14px', fontWeight: 600 }}>{l.commodity}</td>
                      <td style={{ color: BUYER.muted, padding: '12px 14px' }}>{l.quantity} kg</td>
                      <td style={{ color: BUYER.muted, padding: '12px 14px' }}>₹{l.pricePerUnit}</td>
                      <td style={{ color: BUYER.muted, padding: '12px 14px', fontSize: '0.875rem' }}>{new Date(l.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link href={`/buyer/listing/${l._id}`} style={{ color: BUYER.primary, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>Edit →</Link>
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