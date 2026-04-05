'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

declare global {
  interface Window { Razorpay: unknown }
}

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}

function PaymentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [billingId, setBillingId] = useState<string | null>(null)
  const [amount, setAmount] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'ready' | 'processing' | 'success'>('ready')

  useEffect(() => {
    setBillingId(searchParams.get('billingId'))
    setAmount(searchParams.get('amount'))
  }, [searchParams])

  const handlePayment = async () => {
    setLoading(true)
    setStep('processing')
    try {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingId,
          farmerId: localStorage.getItem('userId'),
          buyerId: localStorage.getItem('userId'),
          amount: parseFloat(amount || '0'),
        }),
      })
      const data = await response.json()
      if (!data.success) { alert('Payment initialization failed'); setLoading(false); setStep('ready'); return }

      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => {
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: parseFloat(amount || '0') * 100,
          currency: 'INR',
          name: 'AgriEasy.com',
          description: 'Payment for commodity purchase',
          order_id: data.orderId,
          handler: async (response: Record<string, string>) => {
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ razorpayPaymentId: response.razorpay_payment_id, razorpayOrderId: response.razorpay_order_id, transactionId: data.transactionId }),
            })
            if (verifyResponse.ok) { setStep('success'); setTimeout(() => router.push('/buyer/dashboard'), 2000) }
            else alert('Payment verification failed')
          },
          prefill: { email: localStorage.getItem('userEmail') || '', contact: localStorage.getItem('userPhone') || '' },
          theme: { color: C.brinjal },
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay(options)
        rzp.open()
      }
      document.body.appendChild(script)
    } catch (error) {
      console.error('Error:', error)
      alert('Payment failed')
      setStep('ready')
    } finally {
      if ((window as { Razorpay?: unknown }).Razorpay) setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/icons/icon-192.png" alt="logo" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <Link href="/buyer/dashboard" style={{ color: C.brinjal, fontWeight: 800, textDecoration: 'none' }}>AgriEasy</Link>
          <span style={{ color: C.muted }}>›</span>
          <span style={{ color: C.text, fontWeight: 600, fontSize: '0.9rem' }}>Payment</span>
        </div>
      </nav>

      <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '40px', boxShadow: '0 4px 20px rgba(109,40,217,0.1)', textAlign: 'center' }}>
          {step === 'success' ? (
            <>
              <div style={{ fontSize: '4rem', marginBottom: '16px' }}>✅</div>
              <h2 style={{ color: '#166534', fontWeight: 800, fontSize: '1.5rem', margin: '0 0 8px' }}>Payment Successful!</h2>
              <p style={{ color: C.muted }}>Redirecting to dashboard…</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💳</div>
              <h2 style={{ color: C.brDark, fontWeight: 800, fontSize: '1.5rem', margin: '0 0 8px' }}>Complete Payment</h2>
              <p style={{ color: C.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Secure payment via Razorpay · UPI · Cards · Net Banking</p>

              <div style={{ background: C.brLight, border: `1px solid ${C.brMid}`, borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
                <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 6px' }}>Amount to Pay</p>
                <p style={{ color: C.brDark, fontWeight: 800, fontSize: '2.4rem', margin: 0 }}>₹{amount}</p>
              </div>

              <button onClick={handlePayment} disabled={loading} style={{
                width: '100%', padding: '14px', background: loading ? C.muted : C.brinjal,
                color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem',
                fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '12px',
              }}>
                {loading ? 'Opening payment…' : '💳 Pay with UPI / Razorpay'}
              </button>
              <Link href="/buyer/dashboard" style={{ color: C.muted, fontSize: '0.875rem', textDecoration: 'none' }}>← Cancel and go back</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Payment() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#faf7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontWeight: 700 }}>Loading…</div>}>
      <PaymentContent />
    </Suspense>
  )
}