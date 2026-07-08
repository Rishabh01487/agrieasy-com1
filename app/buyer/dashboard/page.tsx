'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  createdAt: string
  location?: string
  status?: string
}

const COMMODITY_CATEGORIES = [
  { name: 'Wheat', icon: '🌾', color: '#f59e0b' },
  { name: 'Rice', icon: '🍚', color: '#84cc16' },
  { name: 'Maize', icon: '🌽', color: '#eab308' },
  { name: 'Barley', icon: '🌾', color: '#a16207' },
  { name: 'Paddy', icon: '🌱', color: '#16a34a' },
  { name: 'Oilseeds', icon: '🌻', color: '#d97706' },
  { name: 'Pulses', icon: '🫘', color: '#dc2626' },
  { name: 'Vegetables', icon: '🥬', color: '#22c55e' },
]

function StatCard({ icon, label, value, sub, href, accent }: { icon: string; label: string; value: string | number; sub?: string; href?: string; accent?: string }) {
  const inner = (
    <div style={{ ...cardStyle(BUYER), padding: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHARED.shadowMd, transition: 'transform 0.2s, box-shadow 0.2s', cursor: href ? 'pointer' : 'default', border: `1px solid ${BUYER.borderLight}` }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: accent ? `${accent}18` : BUYER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: BUYER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ color: BUYER.text, fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: BUYER.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function QuickAction({ icon, label, href, color }: { icon: string; label: string; href: string; color?: string }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
      <div style={{ background: BUYER.white, border: `1px solid ${BUYER.borderLight}`, borderRadius: 14, padding: '16px 12px', textAlign: 'center', transition: 'all 0.2s', boxShadow: SHARED.shadow }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: color ? `${color}18` : BUYER.primaryLight, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
        <p style={{ color: BUYER.text, fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>{label}</p>
      </div>
    </Link>
  )
}

export default function BuyerDashboard() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const { userId, userEmail } = getUserInfo()
    if (!userId) {
      // Not logged in — redirect to login instead of showing a broken page
      router.replace('/auth/login')
      return
    }
    setUserEmail(userEmail || '')
    const fetchListings = async () => {
      try {
        const url = '/api/listings?buyerId=' + userId
        const response = await authFetch(url)
        if (!response.ok) {
          setError('Failed to load listings')
          return
        }
        const data = await response.json()
        setListings(data?.data?.listings || data?.listings || [])
      } catch (err) {
        console.error('Error fetching listings:', err)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchListings()
  }, [router])

  const activeCount = listings.length
  const totalDemandQty = listings.reduce((s, l) => s + (l.quantity || 0), 0)
  const avgPrice = listings.length > 0 ? Math.round(listings.reduce((s, l) => s + l.pricePerUnit, 0) / listings.length) : 0

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      {/* Nav */}
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BUYER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🛒</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: BUYER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: BUYER.muted }}>Buyer workspace</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/agrisocial" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight, transition: 'all 0.2s ease' }}>📱 AgriSocial</Link>
            <Link href="/agripay" style={{ color: BUYER.primary, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, background: BUYER.primaryLight, transition: 'all 0.2s ease' }}>💳 Wallet</Link>
            <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 60px' }}>
        {/* Hero header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: BUYER.text, letterSpacing: '-0.02em' }}>Welcome back 👋</h1>
          <p style={{ margin: '6px 0 0', color: BUYER.muted, fontSize: '0.95rem' }}>
            Source fresh produce directly from farmers across India. {userEmail && <span style={{ color: BUYER.textSecondary }}>({userEmail})</span>}
          </p>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: SHARED.error, fontSize: '0.88rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 24 }}>
          <StatCard icon="📋" label="Active Listings" value={activeCount} sub="Live demand posts" href="/buyer/create-listing" />
          <StatCard icon="⚖️" label="Total Demand" value={`${totalDemandQty.toLocaleString('en-IN')} kg`} sub="Across all listings" accent="#3b82f6" />
          <StatCard icon="💰" label="Avg Price" value={`₹${avgPrice}`} sub="Per unit across listings" accent="#10b981" />
          <StatCard icon="➕" label="New Listing" value="Create →" sub="Post your demand" href="/buyer/create-listing" accent="#f59e0b" />
        </div>

        {/* Quick actions */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: BUYER.text, fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px' }}>Quick actions</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <QuickAction icon="📝" label="Post Demand" href="/buyer/create-listing" color="#3b82f6" />
            <QuickAction icon="🧾" label="Billing" href="/buyer/billing" color="#10b981" />
            <QuickAction icon="💳" label="Payment" href="/buyer/payment" color="#f59e0b" />
            <QuickAction icon="📱" label="AgriSocial" href="/agrisocial" color="#8b5cf6" />
            <QuickAction icon="🌾" label="Browse Sellers" href="/farmer/search-buyers" color="#16a34a" />
          </div>
        </div>

        {/* Commodity chips */}
        <div style={{ ...cardStyle(BUYER), marginBottom: 24, padding: 18, border: `1px solid ${BUYER.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontWeight: 800, color: BUYER.text, fontSize: '1rem' }}>Commodity categories</h3>
            <span style={{ color: BUYER.muted, fontSize: '0.78rem' }}>Tap to filter when posting</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COMMODITY_CATEGORIES.map(c => (
              <span key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${c.color}12`, border: `1px solid ${c.color}30`, color: c.color, borderRadius: 100, padding: '6px 14px', fontSize: '0.84rem', fontWeight: 700, transition: 'all 0.2s ease' }}>
                <span style={{ fontSize: '0.95rem' }}>{c.icon}</span>{c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Listings table */}
        <div style={{ ...cardStyle(BUYER), border: `1px solid ${BUYER.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${BUYER.borderLight}` }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: BUYER.text }}>Your listings</h3>
              <p style={{ margin: '4px 0 0', color: BUYER.muted, fontSize: '0.78rem' }}>{activeCount} {activeCount === 1 ? 'demand' : 'demands'} visible to farmers</p>
            </div>
            <Link href="/buyer/create-listing" style={{ background: BUYER.primary, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: '0.86rem', fontWeight: 700, textDecoration: 'none', boxShadow: `0 4px 14px ${BUYER.primary}40`, transition: 'all 0.2s ease' }}>+ New Listing</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 64, background: BUYER.bgSub, borderRadius: 10 }} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: BUYER.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
              <h4 style={{ color: BUYER.text, margin: '0 0 6px', fontSize: '1rem' }}>No listings yet</h4>
              <p style={{ marginBottom: 16, fontSize: '0.86rem' }}>Post your first demand to connect with farmers across India.</p>
              <Link href="/buyer/create-listing" style={{ display: 'inline-block', color: BUYER.primary, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>+ Create your first listing</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listings.map(l => (
                <Link key={l._id} href={`/buyer/listing/${l._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${BUYER.borderLight}`, background: BUYER.white, transition: 'all 0.15s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: BUYER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🌾</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>{l.commodity}</p>
                    <p style={{ color: BUYER.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>
                      <span style={{ color: BUYER.textSecondary, fontWeight: 600 }}>{l.quantity} {l.unit || 'kg'}</span>
                      {' · '}₹{l.pricePerUnit}/{l.unit || 'unit'}
                      {l.location && ` · 📍 ${l.location}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: BUYER.muted, fontSize: '0.72rem', margin: 0 }}>{new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <p style={{ color: BUYER.primary, fontSize: '0.78rem', fontWeight: 700, margin: '2px 0 0' }}>Edit →</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
