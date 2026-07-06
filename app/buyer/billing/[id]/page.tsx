'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle } from '@/lib/styles'

interface Billing {
  _id: string
  commodity: string
  weightReceived: number
  pricePerUnit: number
  totalAmount: number
  transportationCost: number
  status: string
  createdAt: string
  farmerId: { farmerName: string; phone: string }
  bookingId?: { quantity: number; estimatedDistance: number }
}

export default function BillingDetail() {
  const params = useParams()
  const billingId = params.id as string
  const [billing, setBilling] = useState<Billing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await authFetch('/api/billing?role=buyer')
        if (!res.ok) {
          setError('Failed to load billing records')
          return
        }
        const data = await res.json()
        const found = (data.billings || []).find((b: Billing) => b._id === billingId)
        if (found) {
          setBilling(found)
        } else {
          setError('Billing record not found')
        }
      } catch {
        setError('Failed to load billing record')
      } finally {
        setLoading(false)
      }
    }
    if (billingId) void fetchBilling()
  }, [billingId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BUYER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading billing details…
      </div>
    )
  }

  if (error || !billing) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>🧾</div>
        <p style={{ color: BUYER.muted }}>{error || 'Billing record not found'}</p>
        <Link href="/buyer/billing" style={{ color: BUYER.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to Billing</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/buyer/billing" style={{ color: BUYER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← Billing</Link>
          <span style={{ color: BUYER.muted }}>›</span>
          <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Invoice Details</span>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 24px' }}>
        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowLg, transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h1 style={{ color: BUYER.textSecondary, fontWeight: 900, fontSize: '1.6rem', margin: '0 0 6px' }}>🧾 Billing Invoice</h1>
              <p style={{ color: BUYER.muted, fontSize: '0.875rem', margin: 0 }}>ID: {billing._id} · {new Date(billing.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <span style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: '100px', fontSize: '0.82rem', fontWeight: 700,
              background: billing.status === 'completed' ? SHARED.successLight : SHARED.warningLight,
              color: billing.status === 'completed' ? '#166534' : '#854d0e',
              border: `1px solid ${billing.status === 'completed' ? '#86efac' : '#fde047'}`,
            }}>
              {billing.status === 'completed' ? '✅ Completed' : '⏳ Pending'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {[
              ['Commodity', billing.commodity],
              ['Weight Received', `${billing.weightReceived} kg`],
              ['Price per Unit', `₹${billing.pricePerUnit}`],
              ['Total Amount', `₹${billing.totalAmount.toLocaleString('en-IN')}`],
              ['Transport Cost', `₹${(billing.transportationCost || 0).toLocaleString('en-IN')}`],
              ['Grand Total', `₹${((billing.totalAmount || 0) + (billing.transportationCost || 0)).toLocaleString('en-IN')}`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: BUYER.bg, borderRadius: '12px', padding: '14px 18px', border: `1px solid ${BUYER.border}` }}>
                <div style={{ color: BUYER.muted, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
                <div style={{ color: label === 'Grand Total' ? BUYER.primary : BUYER.text, fontWeight: label === 'Grand Total' ? 900 : 700, fontSize: label === 'Grand Total' ? '1.2rem' : '1rem' }}>{value}</div>
              </div>
            ))}
          </div>

          {billing.farmerId && (
            <div style={{ background: BUYER.primaryLight, borderRadius: '14px', padding: '20px 24px', border: `1px solid ${BUYER.border}` }}>
              <h3 style={{ color: BUYER.textSecondary, fontWeight: 700, fontSize: '0.95rem', margin: '0 0 12px' }}>Farmer Information</h3>
              <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>{billing.farmerId.farmerName || '—'}</p>
              <p style={{ color: BUYER.muted, fontSize: '0.875rem', margin: 0 }}>📞 {billing.farmerId.phone || '—'}</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <Link href="/buyer/dashboard" style={{ color: BUYER.muted, textDecoration: 'none', fontSize: '0.875rem' }}>← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  )
}