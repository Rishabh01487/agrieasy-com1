'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}

export default function Billing() {
  const [billings] = useState<Billing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBillings = async () => {
      try {
        setLoading(false) // TODO: wire up /api/billing endpoint
      } catch (error) {
        console.error('Error:', error)
        setLoading(false)
      }
    }
    void fetchBillings()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
            <Link href="/buyer/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
            <span style={{ color: C.muted }}>›</span>
            <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Billing</span>
          </div>
          <Link href="/buyer/dashboard" style={{ color: C.brinjal, background: C.brLight, border: `1px solid ${C.brMid}`, padding: '7px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 8px' }}>🧾 Billing Management</h2>
        <p style={{ color: C.muted, marginBottom: '28px' }}>View and manage all your billing transactions with farmers.</p>

        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>Loading billings…</div>
          ) : billings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🧾</div>
              <p>No billing records yet. They appear after commodity delivery is confirmed.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Commodity', 'Farmer', 'Weight', 'Total Amount', 'Status', 'Action'].map(h => (
                      <th key={h} style={{ color: C.brDark, fontWeight: 700, fontSize: '0.78rem', textAlign: 'left', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {billings.map(b => (
                    <tr key={b._id} style={{ borderBottom: `1px solid ${C.bg}` }}>
                      <td style={{ color: C.text, padding: '14px', fontWeight: 600 }}>{b.commodity}</td>
                      <td style={{ color: C.muted, padding: '14px' }}>{b.farmerId?.farmerName}</td>
                      <td style={{ color: C.muted, padding: '14px' }}>{b.weightReceived} kg</td>
                      <td style={{ color: C.brDark, padding: '14px', fontWeight: 700 }}>₹{b.totalAmount}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 12px', borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700,
                          background: b.status === 'completed' ? '#dcfce7' : '#fef9c3',
                          color: b.status === 'completed' ? '#166534' : '#854d0e',
                          border: `1px solid ${b.status === 'completed' ? '#86efac' : '#fde047'}`,
                        }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <Link href={`/buyer/billing/${b._id}`} style={{ color: C.brinjal, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>View →</Link>
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