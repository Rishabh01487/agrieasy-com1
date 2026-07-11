'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { FARMER, SHARED, cardStyle, navStyle, inputStyle, labelStyle } from '@/lib/styles'

interface Listing {
  _id: string
  commodity: string
  quantity: number
  unit?: string
  pricePerUnit: number
  priceDate?: string
  createdAt: string
  commodityPhoto?: string
  quality?: string
  paymentConditions?: string
  location?: string
  shopPhoto?: string
  distanceKm?: number | null
  buyerId?: Buyer | { _id: string; firmName?: string; address?: string; shopPhoto?: string; gstin?: string; bio?: string }
}

interface Buyer {
  _id: string
  firmName?: string
  address?: string
  shopPhoto?: string
  visitingCardPhoto?: string
  gstin?: string
  bio?: string
}

interface SellItem {
  listingId: string
  name: string
  pricePerUnit: number
  unit: string
  quantity: string     // kg the farmer wants to sell
  numberOfBags: string
  selected: boolean
}

const inp = inputStyle(FARMER)
const lbl = labelStyle(FARMER)

function distanceLabel(km: number | null | undefined): string {
  if (km == null) return 'Distance unknown'
  if (km < 1) return `${Math.round(km * 1000)} m away`
  return `${km.toFixed(1)} km away`
}

export default function BuyerListingDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const buyerId = params.id as string
  const initialListingId = searchParams.get('listingId')

  const [listings, setListings] = useState<Listing[]>([])
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [sellItems, setSellItems] = useState<SellItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch all listings for this specific buyer (so the farmer can see
  // everything the buyer buys and pick multiple commodities to sell)
  useEffect(() => {
    if (!buyerId) return
    const fetchAll = async () => {
      try {
        const res = await authFetch(`/api/listings?buyerId=${buyerId}&limit=100`)
        if (!res.ok) {
          setError('Failed to load buyer listings')
          return
        }
        const data = await res.json()
        const ls: Listing[] = data?.data?.listings || data?.listings || []
        setListings(ls)
        // Pre-select the listing the farmer came from (if any)
        const initial = ls.map(l => ({
          listingId: l._id,
          name: l.commodity,
          pricePerUnit: l.pricePerUnit,
          unit: l.unit || 'kg',
          quantity: '',
          numberOfBags: '',
          selected: initialListingId ? l._id === initialListingId : false,
        }))
        setSellItems(initial)
        // Use the first listing to surface buyer info (firmName, address, etc.)
        if (ls.length > 0 && ls[0].buyerId) {
          setBuyer(ls[0].buyerId as unknown as Buyer)
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchAll()
  }, [buyerId, initialListingId])

  const selectedItems = useMemo(() => sellItems.filter(i => i.selected), [sellItems])
  const totalQuantityKg = useMemo(
    () => selectedItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0),
    [selectedItems],
  )
  const totalBags = useMemo(
    () => selectedItems.reduce((s, i) => s + (parseInt(i.numberOfBags) || 0), 0),
    [selectedItems],
  )
  const totalValue = useMemo(
    () => selectedItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * i.pricePerUnit, 0),
    [selectedItems],
  )

  const updateItem = (idx: number, patch: Partial<SellItem>) => {
    setSellItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  const proceedToVehicle = () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one commodity to sell.')
      return
    }
    // Validate quantities
    const missing = selectedItems.find(i => !i.quantity || parseFloat(i.quantity) <= 0)
    if (missing) {
      setError(`Please enter quantity for ${missing.name}.`)
      return
    }
    // Encode the selected commodities + buyer info into the URL and pass to book-vehicle
    const payload = {
      buyerId,
      buyerName: buyer?.firmName || '',
      deliveryLocation: buyer?.address || listings[0]?.location || '',
      commodities: selectedItems.map(i => ({
        listingId: i.listingId,
        name: i.name,
        quantity: parseFloat(i.quantity),
        numberOfBags: parseInt(i.numberOfBags) || 0,
        pricePerUnit: i.pricePerUnit,
        unit: i.unit,
      })),
      totalQuantityKg,
    }
    // Use base64-encoded JSON in a single query param to keep URL short-ish
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
    router.push(`/farmer/book-vehicle?payload=${encoded}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: FARMER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading buyer details…
      </div>
    )
  }

  if (error && listings.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: FARMER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>🔍</div>
        <p style={{ color: FARMER.muted }}>{error || 'Buyer not found'}</p>
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
          <span style={{ color: FARMER.text, fontWeight: 600, fontSize: '0.9rem' }}>{buyer?.firmName || 'Buyer'}</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Buyer header */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowLg, marginBottom: 20, transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {buyer?.shopPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={buyer.shopPhoto} alt={buyer.firmName || 'shop'} style={{ width: 100, height: 100, borderRadius: 14, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 100, height: 100, borderRadius: 14, background: FARMER.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', flexShrink: 0 }}>🏪</div>
            )}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 6px' }}>{buyer?.firmName || 'Buyer'}</h1>
              <p style={{ color: FARMER.muted, fontSize: '0.88rem', margin: '0 0 8px' }}>📍 {buyer?.address || listings[0]?.location || 'Address not provided'}</p>
              {buyer?.gstin && <p style={{ color: FARMER.muted, fontSize: '0.78rem', margin: '0 0 8px' }}>GSTIN: {buyer.gstin}</p>}
              {listings[0] && <p style={{ color: FARMER.primary, fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>{distanceLabel(listings[0].distanceKm)}</p>}
              {buyer?.bio && <p style={{ color: FARMER.muted, fontSize: '0.82rem', margin: '8px 0 0', lineHeight: 1.5 }}>{buyer.bio}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Commodities to sell */}
        <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: FARMER.text }}>Select commodities to sell</h2>
              <p style={{ margin: '4px 0 0', color: FARMER.muted, fontSize: '0.78rem' }}>
                Tick the commodities you want to deliver. Enter quantity (kg) & number of bags.
              </p>
            </div>
            {selectedItems.length > 0 && (
              <span style={{ background: FARMER.primary, color: '#fff', fontSize: '0.78rem', fontWeight: 700, padding: '5px 12px', borderRadius: 100 }}>
                {selectedItems.length} selected
              </span>
            )}
          </div>

          {listings.length === 0 ? (
            <p style={{ color: FARMER.muted, textAlign: 'center', padding: '24px 0' }}>This buyer has no commodity listings yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {listings.map((l, idx) => {
                const item = sellItems[idx]
                if (!item) return null
                return (
                  <div key={l._id} style={{
                    border: `1.5px solid ${item.selected ? FARMER.primary : FARMER.borderLight}`,
                    borderRadius: 12, padding: 12, background: item.selected ? FARMER.primaryLight : FARMER.white,
                    transition: 'all 0.15s ease',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={e => updateItem(idx, { selected: e.target.checked })}
                        style={{ width: 20, height: 20, cursor: 'pointer', accentColor: FARMER.primary }}
                      />
                      {l.commodityPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.commodityPhoto} alt={l.commodity} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: FARMER.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🌾</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: FARMER.text, fontWeight: 700, fontSize: '0.92rem', margin: 0 }}>{l.commodity}</p>
                        <p style={{ color: FARMER.muted, fontSize: '0.74rem', margin: 0 }}>
                          Buyer offers <strong style={{ color: FARMER.primary }}>₹{l.pricePerUnit}/{l.unit || 'kg'}</strong>
                          {l.quality && ` · ${l.quality}`}
                        </p>
                      </div>
                    </div>
                    {item.selected && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, paddingLeft: 30 }}>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.7rem' }}>Quantity ({item.unit})</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(idx, { quantity: e.target.value })}
                            placeholder="e.g., 500"
                            style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ ...lbl, fontSize: '0.7rem' }}>No. of bags</label>
                          <input
                            type="number"
                            value={item.numberOfBags}
                            onChange={e => updateItem(idx, { numberOfBags: e.target.value })}
                            placeholder="e.g., 10"
                            style={{ ...inp, padding: '8px 12px', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Summary + CTA */}
        {selectedItems.length > 0 && (
          <div style={{ ...cardStyle(FARMER), boxShadow: SHARED.shadowMd, background: FARMER.gradientSoft }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: FARMER.text }}>Order summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Commodities</p>
                <p style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.1rem', margin: '2px 0 0' }}>{selectedItems.length}</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Total Quantity</p>
                <p style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.1rem', margin: '2px 0 0' }}>{totalQuantityKg.toLocaleString('en-IN')} kg</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Total Bags</p>
                <p style={{ color: FARMER.text, fontWeight: 800, fontSize: '1.1rem', margin: '2px 0 0' }}>{totalBags}</p>
              </div>
              <div>
                <p style={{ color: FARMER.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>Approx Value</p>
                <p style={{ color: FARMER.primary, fontWeight: 800, fontSize: '1.1rem', margin: '2px 0 0' }}>₹{totalValue.toLocaleString('en-IN')}</p>
              </div>
            </div>
            <button
              onClick={proceedToVehicle}
              disabled={selectedItems.length === 0}
              style={{
                width: '100%', padding: '14px',
                background: selectedItems.length === 0 ? FARMER.muted : FARMER.primary,
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: '1rem', fontWeight: 700, cursor: selectedItems.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                transition: 'all 0.2s ease',
              }}
            >
              🚚 Proceed to Vehicle Selection →
            </button>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link href="/farmer/search-buyers" style={{ color: FARMER.muted, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Search Buyers</Link>
        </div>
      </div>
      <style>{`input:focus { border-color: ${FARMER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}
