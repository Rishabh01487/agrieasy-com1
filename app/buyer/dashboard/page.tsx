'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle } from '@/lib/styles'
import { DashboardSkeleton } from '@/app/components/DashboardSkeleton'
import { useIsMobile } from '@/lib/use-is-mobile'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  priceDate?: string
  createdAt: string
  commodityPhoto?: string
  location?: string
  isActive?: boolean
}

interface BuyerProfile {
  firmName?: string
  shopPhoto?: string
  visitingCardPhoto?: string
  gstin?: string
  address?: string
}

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function freshnessBadge(dateStr?: string) {
  const d = daysSince(dateStr)
  if (d === null) return null
  if (d === 0) return { bg: '#dcfce7', color: '#065f46', label: 'Today' }
  if (d === 1) return { bg: '#dbeafe', color: '#1e40af', label: '1d ago' }
  if (d <= 3) return { bg: '#fef3c7', color: '#92400e', label: `${d}d ago` }
  return { bg: '#fee2e2', color: '#991b1b', label: `${d}d ago` }
}

export default function BuyerDashboard() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [listings, setListings] = useState<Listing[]>([])
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const { userId } = getUserInfo()
    if (!userId) {
      router.replace('/auth/login')
      return
    }
    const fetchAll = async () => {
      try {
        const [listingsRes, profileRes, bookingsRes] = await Promise.all([
          authFetch('/api/listings?buyerId=' + userId),
          authFetch('/api/buyer/profile').catch(() => null),
          authFetch('/api/bookings?role=buyer&status=pending&limit=100').catch(() => null),
        ])
        if (!listingsRes.ok) {
          setError('Failed to load commodities')
        } else {
          const data = await listingsRes.json()
          setListings(data?.data?.listings || data?.listings || [])
        }
        if (profileRes && profileRes.ok) {
          const pdata = await profileRes.json()
          const p = pdata?.data?.profile || pdata?.profile
          if (p) setProfile(p)
        }
        if (bookingsRes && bookingsRes.ok) {
          const bdata = await bookingsRes.json()
          const bs = bdata?.data?.bookings || bdata?.bookings || []
          setPendingBookings(bs.length)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [router])

  const activeCount = listings.filter(l => l.isActive !== false).length

  if (loading) {
    return (
      <DashboardSkeleton
        role="buyer"
        primary={BUYER.primary}
        primaryLight={BUYER.primaryLight}
        bg={BUYER.bg}
        bgSub={BUYER.bgSub}
        border={BUYER.border}
        text={BUYER.text}
        muted={BUYER.muted}
        gradient={BUYER.gradient}
      />
    )
  }

  return (
    <div className="dashboard-content" style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      {/* Clean nav — just logo + name + logout */}
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: BUYER.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>🛒</div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: BUYER.text, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: BUYER.muted }}>Buyer</p>
            </div>
          </div>
          <button onClick={logout} style={{ color: BUYER.red, background: SHARED.errorLight, border: '1px solid #fca5a5', padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '16px 12px 80px' : '24px 20px 60px' }}>
        {/* Welcome — firm name + add commodity CTA */}
        <div style={{
          background: BUYER.gradient,
          borderRadius: 16, padding: isMobile ? 18 : 24,
          marginBottom: 16, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          boxShadow: `0 8px 24px ${BUYER.primary}30`,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {profile?.firmName ? `${profile.firmName} 👋` : 'Welcome back 👋'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', opacity: 0.9 }}>
              {profile?.address || 'Set up your shop profile'}
            </p>
          </div>
          <Link href="/buyer/create-listing" style={{
            background: '#fff', color: BUYER.primary, border: 'none',
            borderRadius: 12, padding: '11px 22px', fontSize: '0.9rem', fontWeight: 800,
            textDecoration: 'none', whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}>
            + Add Commodity
          </Link>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Pending bookings alert — most prominent when present */}
        {pendingBookings > 0 && (
          <Link href="/buyer/bookings" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            <div style={{
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1.5px solid #f59e0b',
              borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: SHARED.shadowMd,
            }}>
              <span style={{ fontSize: '1.6rem' }}>📅</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: '#92400e', fontWeight: 800, fontSize: '0.92rem' }}>
                  {pendingBookings} {pendingBookings === 1 ? 'farmer wants' : 'farmers want'} to sell to your shop!
                </p>
                <p style={{ margin: '2px 0 0', color: '#92400e', fontSize: '0.78rem' }}>
                  Tap to review and confirm.
                </p>
              </div>
              <span style={{ color: '#92400e', fontWeight: 800, fontSize: '1.2rem' }}>›</span>
            </div>
          </Link>
        )}

        {/* 2 stat cards — only what matters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Link href="/buyer/create-listing" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${BUYER.borderLight}`, boxShadow: SHARED.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${BUYER.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>📋</div>
                <div>
                  <p style={{ margin: 0, color: BUYER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Commodities</p>
                  <p style={{ margin: '2px 0 0', color: BUYER.text, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{activeCount}</p>
                  <p style={{ margin: '2px 0 0', color: BUYER.muted, fontSize: '0.7rem' }}>in your price-list</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/buyer/bookings" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 14, border: `1px solid ${BUYER.borderLight}`, boxShadow: SHARED.shadow }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#f59e0b15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>📅</div>
                <div>
                  <p style={{ margin: 0, color: BUYER.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending</p>
                  <p style={{ margin: '2px 0 0', color: pendingBookings > 0 ? '#d97706' : BUYER.text, fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{pendingBookings}</p>
                  <p style={{ margin: '2px 0 0', color: BUYER.muted, fontSize: '0.7rem' }}>{pendingBookings > 0 ? 'awaiting confirmation' : 'no new bookings'}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Commodity price-list — main content */}
        <div style={{ ...cardStyle(BUYER), border: `1px solid ${BUYER.borderLight}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${BUYER.borderLight}` }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: BUYER.text }}>Your commodities</h3>
            <Link href="/buyer/create-listing" style={{ background: BUYER.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none' }}>+ Add</Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />)}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: BUYER.muted }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🌾</div>
              <p style={{ fontSize: '0.86rem', margin: '0 0 12px' }}>No commodities yet. Add what you buy at your shop.</p>
              <Link href="/buyer/create-listing" style={{ display: 'inline-block', color: '#fff', background: BUYER.primary, padding: '9px 18px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>+ Add your first commodity</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listings.map(l => {
                const badge = freshnessBadge(l.priceDate || l.createdAt)
                return (
                  <Link key={l._id} href={`/buyer/listing/${l._id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, border: `1px solid ${BUYER.borderLight}`, background: BUYER.white, transition: 'all 0.15s' }}>
                      {l.commodityPhoto ? (
                        <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: BUYER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>🌾</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{l.commodity}</p>
                        <p style={{ color: BUYER.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>
                          <span style={{ color: BUYER.primary, fontWeight: 700 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</span>
                          {l.quantity > 0 && ` · ${l.quantity} ${l.unit || 'kg'} needed`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        {badge && <span style={{ background: badge.bg, color: badge.color, fontSize: '0.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{badge.label}</span>}
                        <span style={{ color: BUYER.primary, fontSize: '0.76rem', fontWeight: 700 }}>Edit ›</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
