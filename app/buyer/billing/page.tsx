'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, cardStyle, navStyle, getStatusStyle } from '@/lib/styles'

interface Billing {
  _id: string
  commodity: string
  weightReceived: number
  pricePerUnit: number
  totalAmount: number
  status: string
  createdAt: string
  farmerId: { farmerName: string; phone: string }
}

export default function Billing() {
  const [billings, setBillings] = useState<Billing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        const res = await authFetch('/api/billing?role=buyer')
        if (!res.ok) {
          setError('Failed to load billing records')
          return
        }
        const data = await res.json()
        setBillings(data.billings || [])
      } catch (err) {
        console.error('Error:', err)
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    void fetchBillings()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: BUYER.primary, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: BUYER.muted }}>›</span>
            <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Billing</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s ease' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>🧾 Billing Management</h2>
        <p style={{ color: BUYER.muted, marginBottom: '28px' }}>View and manage all your billing transactions with farmers.</p>

        {error && (
          <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: SHARED.error, fontSize: '0.875rem', fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: BUYER.muted }}>Loading billings…</div>
          ) : billings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: BUYER.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧾</div>
              <p>No billing records yet. They appear after commodity delivery is confirmed.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${BUYER.border}` }}>
                    {['Commodity', 'Farmer', 'Weight', 'Total Amount', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ color: BUYER.textSecondary, fontWeight: 700, fontSize: '0.78rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {billings.map(b => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${BUYER.bg}` }}>
                      <td style={{ color: BUYER.text, padding: '14px', fontWeight: 600 }}>{b.commodity}</td>
                      <td style={{ color: BUYER.muted, padding: '14px' }}>{b.farmerId?.farmerName}</td>
                      <td style={{ color: BUYER.muted, padding: '14px' }}>{b.weightReceived} kg</td>
                      <td style={{ color: BUYER.textSecondary, padding: '14px', fontWeight: 700 }}>₹{b.totalAmount}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700,
                          background: b.status === 'completed' ? SHARED.successLight : SHARED.warningLight,
                          color: b.status === 'completed' ? '#166534' : '#854d0e',
                          border: `1px solid ${b.status === 'completed' ? '#86efac' : '#fde047'}`,
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <Link href={`/buyer/billing/${b._id}`} style={{ color: BUYER.primary, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>View →</Link>
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