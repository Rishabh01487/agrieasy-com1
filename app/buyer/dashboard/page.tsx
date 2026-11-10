'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { useIsMobile } from '@/lib/use-is-mobile'
import {
  MH, mhPageBg, mhCardStyle, mhPrimaryBtn, mhSecondaryBtn, mhNavStyle,
  PlusIcon, AlertTriangleIcon, ArrowRightIcon, LogOutIcon, MapPinIcon, ClockIcon,
  StoreIcon, TagIcon, ListIcon, DollarSignIcon, FileTextIcon, ReceiptIcon, UserIcon, WheatIcon,
} from '@/lib/madhubani'
import { BuyerIcon, TransporterIcon, SocialIcon, WalletIcon, LedgerIcon } from '@/app/components/CardIcons'

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

const COMMODITY_CATEGORIES = [
  { name: 'Wheat' },
  { name: 'Rice' },
  { name: 'Maize' },
  { name: 'Barley' },
  { name: 'Paddy' },
  { name: 'Oilseeds' },
  { name: 'Pulses' },
  { name: 'Vegetables' },
]

function StatCard({ icon, label, value, sub, href, isMobile }: { icon: React.ReactNode; label: string; value: string | number; sub?: React.ReactNode; href?: string; isMobile?: boolean }) {
  const inner = (
    <div style={{ ...mhCardStyle({ doubleLine: true, padding: isMobile ? 14 : 18 }), display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14, cursor: href ? 'pointer' : 'default' }}>
      <div style={{ width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.66rem' : '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
        <p style={{ color: MH.navy, fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 800, margin: '2px 0 0', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ color: MH.pinkGray, fontSize: isMobile ? '0.7rem' : '0.74rem', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>{sub}</p>}
      </div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function QuickAction({ icon, label, href, isMobile }: { icon: React.ReactNode; label: string; href: string; isMobile?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ ...mhCardStyle({ padding: isMobile ? '14px 6px' : '16px 12px' }), textAlign: 'center' }}>
        <div style={{ width: isMobile ? 44 : 48, height: isMobile ? 44 : 48, borderRadius: 12, background: `${MH.pink}14`, color: MH.deepPink, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
        <p style={{ color: MH.navy, fontSize: isMobile ? '0.76rem' : '0.82rem', fontWeight: 700, margin: 0 }}>{label}</p>
      </div>
    </Link>
  )
}

// Days since the price was last updated
function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function freshnessBadge(dateStr?: string) {
  const d = daysSince(dateStr)
  if (d === null) return null
  if (d === 0) return { bg: MH.successLight, color: MH.success, label: 'Today' }
  if (d === 1) return { bg: `${MH.navy}14`, color: MH.navy, label: '1 day ago' }
  if (d <= 3) return { bg: MH.warningLight, color: MH.warning, label: `${d} days ago` }
  return { bg: MH.errorLight, color: MH.deepPink, label: `${d} days ago` }
}

export default function BuyerDashboard() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [listings, setListings] = useState<Listing[]>([])
  const [profile, setProfile] = useState<BuyerProfile | null>(null)
  const [pendingBookings, setPendingBookings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const { userId, userEmail } = getUserInfo()
    if (!userId) {
      // Wait for AuthSync (Google Sign-In) to populate localStorage.
      // AuthSync fetches a JWT from /api/auth/session-token which takes ~1s.
      // If we redirect immediately, Google login users get bounced back to login.
      // Check localStorage again after 3 seconds — if still no userId, redirect.
      const timeout = setTimeout(() => {
        const retry = getUserInfo()
        if (!retry.userId) {
          router.replace('/auth/login')
        } else {
          setUserEmail(retry.userEmail || '')
          // Trigger the data fetch by reloading
          window.location.reload()
        }
      }, 3000)
      return () => clearTimeout(timeout)
    }
    setUserEmail(userEmail || '')
    const fetchAll = async () => {
      try {
        // Fetch listings + buyer profile + incoming bookings in parallel
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
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [router])

  const activeCount = listings.filter(l => l.isActive !== false).length
  const totalDemandQty = listings.reduce((s, l) => s + (l.quantity || 0), 0)
  const avgPrice = listings.length > 0 ? Math.round(listings.reduce((s, l) => s + l.pricePerUnit, 0) / listings.length) : 0

  return (
    <div style={mhPageBg}>
      {/* Nav */}
      <nav style={{ ...mhNavStyle, padding: isMobile ? '10px 12px' : '14px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: MH.cream, border: `1px solid ${MH.gold}` }}>
              <BuyerIcon size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? '0.95rem' : '1.05rem', color: MH.navy, lineHeight: 1 }}>AgriEasy</p>
              <p style={{ margin: 0, fontSize: '0.7rem', color: MH.pinkGray }}>Buyer workspace</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 6 }}>
            <Link href="/buyer/profile" style={{ ...mhSecondaryBtn, color: MH.navy, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <img src="/logo-commodities.png" alt="" width={14} height={14} style={{ borderRadius: 2 }} /> My Profile
            </Link>
            <Link href="/buyer/bookings" style={{ ...mhSecondaryBtn, color: MH.navy, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <img src="/logo-bookings.png" alt="" width={14} height={14} style={{ borderRadius: 2 }} /> Bookings
            </Link>
            <Link href="/buyer/my-vehicles" style={{ ...mhSecondaryBtn, color: MH.navy, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <TransporterIcon size={14} /> My Vehicles
            </Link>
            <Link href="/agrisocial" style={{ ...mhSecondaryBtn, color: MH.navy, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <SocialIcon size={14} /> AgriSocial
            </Link>
            <Link href="/agripay" style={{ ...mhSecondaryBtn, color: MH.navy, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <WalletIcon size={14} /> Wallet
            </Link>
            <button onClick={logout} style={{ color: MH.white, background: MH.deepPink, border: `1px solid ${MH.gold}`, padding: isMobile ? '6px 10px' : '8px 14px', borderRadius: 8, fontSize: isMobile ? '0.76rem' : '0.84rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              <LogOutIcon size={14} /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: isMobile ? '16px 12px 90px' : '28px 24px 60px' }}>
        {/* Hero header */}
        <div style={{ marginBottom: isMobile ? 16 : 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.45rem' : '1.9rem', fontWeight: 800, color: MH.navy, letterSpacing: '-0.02em' }}>
              {profile?.firmName ? profile.firmName : 'Welcome back'}
            </h1>
            <p style={{ margin: '6px 0 0', color: MH.pinkGray, fontSize: isMobile ? '0.8rem' : '0.95rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {profile?.address ? (
                <>
                  <MapPinIcon size={14} style={{ color: MH.deepPink, flexShrink: 0 }} />
                  <span>{profile.address}</span>
                  <span>·</span>
                </>
              ) : null}
              {userEmail && <span style={{ color: MH.navy, wordBreak: 'break-all' }}>{userEmail}</span>}
            </p>
          </div>
          <Link href="/buyer/profile" style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '9px 12px' : '10px 16px',
            background: MH.white, border: `1px solid ${MH.gold}`,
            borderRadius: 12, textDecoration: 'none',
            boxShadow: `0 4px 14px rgba(49,55,43,0.06), inset 0 0 0 2px ${MH.cream}, inset 0 0 0 3px ${MH.gold}`,
          }}>
            {profile?.shopPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.shopPhoto} alt="shop" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <StoreIcon size={18} />
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: MH.pinkGray, fontWeight: 700 }}>View profile</p>
              <p style={{ margin: 0, fontSize: '0.86rem', color: MH.navy, fontWeight: 700 }}>
                {profile?.visitingCardPhoto || profile?.shopPhoto ? 'Profile with photos' : 'Add shop / visiting card photos'}
              </p>
            </div>
          </Link>
        </div>

        {error && (
          <div style={{ background: MH.errorLight, border: `1px solid ${MH.gold}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: MH.deepPink, fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon size={16} /> {error}
          </div>
        )}

        {/* Stat cards — full width on mobile, auto-fit on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit,minmax(240px,1fr))', gap: isMobile ? 8 : 14, marginBottom: isMobile ? 16 : 24 }}>
          <StatCard isMobile={isMobile} icon={<ListIcon size={20} />} label="Commodities" value={activeCount} sub="In your price-list" href="/buyer/create-listing" />
          <StatCard isMobile={isMobile} icon={<img src="/logo-bookings.png" alt="" width={20} height={20} style={{ borderRadius: 3 }} />} label="New Bookings" value={pendingBookings} sub={pendingBookings > 0 ? <><ClockIcon size={11} /> Awaiting your confirmation</> : 'No pending bookings'} href="/buyer/bookings" />
          <StatCard isMobile={isMobile} icon={<DollarSignIcon size={20} />} label="Avg Price" value={`₹${avgPrice}`} sub="Per unit across commodities" />
          <StatCard isMobile={isMobile} icon={<PlusIcon size={20} />} label="Add Commodity" value="Create →" sub="Post today's price" href="/buyer/create-listing" />
        </div>

        {/* Pending-bookings alert banner */}
        {pendingBookings > 0 && (
          <Link href="/buyer/bookings" style={{ textDecoration: 'none', display: 'block', marginBottom: 20 }}>
            <div style={{
              background: `linear-gradient(135deg, ${MH.warningLight} 0%, ${MH.cream} 100%)`,
              border: `1.5px solid ${MH.warning}`,
              borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '0 4px 14px rgba(26,26,62,0.06)', transition: 'all 0.2s ease', cursor: 'pointer',
            }}>
              <span style={{ color: MH.deepPink, display: 'inline-flex' }}><img src="/logo-bookings.png" alt="" width={26} height={26} style={{ borderRadius: 4 }} /></span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, color: MH.warning, fontWeight: 800, fontSize: '0.95rem' }}>
                  {pendingBookings} {pendingBookings === 1 ? 'farmer wants' : 'farmers want'} to sell to your shop!
                </p>
                <p style={{ margin: '2px 0 0', color: MH.warning, fontSize: '0.82rem' }}>
                  Tap to review and confirm the bookings.
                </p>
              </div>
              <span style={{ color: MH.warning, fontWeight: 800, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Review <ArrowRightIcon size={14} />
              </span>
            </div>
          </Link>
        )}

        {/* Quick actions — 3×3 grid on mobile (never squeeze into one row) */}
        <div style={{ marginBottom: isMobile ? 20 : 28 }}>
          <h2 style={{ color: MH.navy, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, margin: '0 0 10px' }}>Quick actions</h2>
          <div className="qa-grid-3" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(104px, 1fr))', gap: isMobile ? 8 : 10 }}>
            <QuickAction isMobile={isMobile} icon={<FileTextIcon size={20} />} label="Add Commodity" href="/buyer/create-listing" />
            <QuickAction isMobile={isMobile} icon={<img src="/logo-bookings.png" alt="" width={20} height={20} style={{ borderRadius: 3 }} />} label="Bookings" href="/buyer/bookings" />
            <QuickAction isMobile={isMobile} icon={<UserIcon size={20} />} label="My Profile" href="/buyer/profile" />
            <QuickAction isMobile={isMobile} icon={<TransporterIcon size={20} />} label="My Vehicles" href="/buyer/my-vehicles" />
            <QuickAction isMobile={isMobile} icon={<ReceiptIcon size={20} />} label="Billing" href="/buyer/billing" />
            <QuickAction isMobile={isMobile} icon={<LedgerIcon size={20} />} label="Ledger" href="/ledger" />
            <QuickAction isMobile={isMobile} icon={<WalletIcon size={20} />} label="Payment" href="/buyer/payment" />
            <QuickAction isMobile={isMobile} icon={<SocialIcon size={20} />} label="AgriSocial" href="/agrisocial" />
            <QuickAction isMobile={isMobile} icon={<WheatIcon size={20} />} label="Browse Sellers" href="/farmer/search-buyers" />
          </div>
        </div>

        {/* Commodity chips */}
        <div style={{ ...mhCardStyle({ padding: 18 }), marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontWeight: 800, color: MH.navy, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TagIcon size={16} style={{ color: MH.deepPink }} /> Commodity categories
            </h3>
            <span style={{ color: MH.pinkGray, fontSize: '0.78rem' }}>Tap to use when adding</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {COMMODITY_CATEGORIES.map(c => (
              <span key={c.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: MH.cream, color: MH.navy, border: `1px solid ${MH.gold}`, borderRadius: 100, padding: '6px 14px', fontSize: '0.84rem', fontWeight: 700 }}>
                <WheatIcon size={12} style={{ color: MH.deepPink }} />{c.name}
              </span>
            ))}
          </div>
        </div>

        {/* Commodities price-list */}
        <div style={{ ...mhCardStyle({ doubleLine: true }) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${MH.gold}` }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: MH.navy }}>Your commodity price-list</h3>
              <p style={{ margin: '4px 0 0', color: MH.pinkGray, fontSize: '0.78rem' }}>{activeCount} {activeCount === 1 ? 'commodity' : 'commodities'} visible to farmers</p>
            </div>
            <Link href="/buyer/create-listing" style={{ ...mhPrimaryBtn(), borderRadius: 10, padding: '9px 18px', fontSize: '0.86rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PlusIcon size={14} /> Add Commodity
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 64, background: `${MH.gold}22`, borderRadius: 10 }} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: MH.pinkGray }}>
              <div style={{ marginBottom: 12, color: MH.pink, display: 'flex', justifyContent: 'center' }}><WheatIcon size={40} /></div>
              <h4 style={{ color: MH.navy, margin: '0 0 6px', fontSize: '1rem' }}>No commodities yet</h4>
              <p style={{ marginBottom: 16, fontSize: '0.86rem' }}>Add the first commodity you buy at your shop, with today&apos;s price.</p>
              <Link href="/buyer/create-listing" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: MH.deepPink, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>
                <PlusIcon size={14} /> Add your first commodity
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listings.map(l => {
                const badge = freshnessBadge(l.priceDate || l.createdAt)
                return (
                  <Link key={l._id} href={`/buyer/listing/${l._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${MH.gold}`, background: MH.white, transition: 'all 0.15s' }}>
                    {/* Commodity photo or fallback icon */}
                    {l.commodityPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${MH.gold}` }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: `${MH.pink}18`, color: MH.deepPink, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <WheatIcon size={18} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: MH.navy, fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>{l.commodity}</p>
                      <p style={{ color: MH.pinkGray, fontSize: '0.76rem', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: MH.deepPink, fontWeight: 600 }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</span>
                        {l.quantity > 0 && ` · ${l.quantity} ${l.unit || 'kg'} needed`}
                        {l.location && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <span>·</span>
                            <MapPinIcon size={10} /> {l.location}
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {badge && (
                        <span style={{ background: badge.bg, color: badge.color, fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                          {badge.label}
                        </span>
                      )}
                      <p style={{ color: MH.deepPink, fontSize: '0.78rem', fontWeight: 700, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 3 }}>Edit price <ArrowRightIcon size={11} /></p>
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
