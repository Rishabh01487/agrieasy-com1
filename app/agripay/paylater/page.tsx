'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, labelStyle } from '@/lib/styles'

interface Loan {
    _id: string
    loanAmount: number
    amountDue: number
    borrowedAt: string
    dueDate: string
    status: string
    totalRepaid: number
    interestRate: number
    interestRateDefault: number
}

export default function PayLaterPage() {
    const [wallet, setWallet] = useState<any>(null)
    const [activeLoans, setActiveLoans] = useState<Loan[]>([])
    const [closedLoans, setClosedLoans] = useState<Loan[]>([])
    const [availableCredit, setAvailableCredit] = useState(0)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState('')
    const [loanAmount, setLoanAmount] = useState('')
    const [borrowing, setBorrowing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [tab, setTab] = useState<'borrow' | 'repay' | 'history'>('borrow')
    const [repayLoanId, setRepayLoanId] = useState('')
    const [repayAmount, setRepayAmount] = useState('')

    useEffect(() => {
        const load = async () => {
            const uid = localStorage.getItem('userId') || ''
            setUserId(uid)
            if (!uid) { setLoading(false); return }
            try {
                const res = await authFetch('/api/agripay/paylater')
                const d = await res.json()
                setWallet(d.wallet)
                setActiveLoans(d.activeLoans || [])
                setClosedLoans(d.closedLoans || [])
                setAvailableCredit(d.availableCredit || 0)
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
    }, [])

    const enablePayLater = async () => {
        setLoading(true)
        try {
            const res = await authFetch('/api/agripay/paylater/enable', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            const d = await res.json()
            if (d.success) {
                setWallet(d.wallet)
                setAvailableCredit(d.wallet.paylaterLimit)
                setSuccess(d.message)
            } else {
                setError(d.error || 'Failed to enable')
            }
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const handleBorrow = async () => {
        const amt = parseFloat(loanAmount)
        if (!amt || amt < 1) { setError('Enter a valid amount'); return }
        if (amt > availableCredit) { setError(`Maximum available: ₹${availableCredit.toLocaleString('en-IN')}`); return }
        setBorrowing(true); setError(''); setSuccess('')
        try {
            const res = await authFetch('/api/agripay/paylater', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt }),
            })
            const d = await res.json()
            if (!res.ok) { setError(d.error || 'Failed'); setBorrowing(false); return }
            setSuccess(d.message)
            setLoanAmount('')
            const reload = await authFetch('/api/agripay/paylater')
            const rd = await reload.json()
            setWallet(rd.wallet); setActiveLoans(rd.activeLoans || []); setAvailableCredit(rd.availableCredit || 0)
        } catch { setError('Network error') } finally { setBorrowing(false) }
    }

    const handleRepay = async () => {
        const amt = parseFloat(repayAmount)
        if (!repayLoanId || !amt || amt < 1) { setError('Select a loan and enter amount'); return }
        setBorrowing(true); setError(''); setSuccess('')
        try {
            const res = await authFetch('/api/agripay/paylater/repay', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loanId: repayLoanId, amount: amt }),
            })
            const d = await res.json()
            if (!res.ok) { setError(d.error || 'Failed'); setBorrowing(false); return }
            setSuccess(d.message)
            setRepayAmount(''); setRepayLoanId('')
            const reload = await authFetch('/api/agripay/paylater')
            const rd = await reload.json()
            setWallet(rd.wallet); setActiveLoans(rd.activeLoans || []); setClosedLoans(rd.closedLoans || []); setAvailableCredit(rd.availableCredit || 0)
        } catch { setError('Network error') } finally { setBorrowing(false) }
    }

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    if (!userId && !loading) return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
            <div style={{ fontSize: '2.5rem' }}>₹</div>
            <h2 style={{ color: AGRI.textSecondary, fontWeight: 800, margin: 0 }}>Please log in to use PayLater</h2>
            <Link href="/auth/login" style={{ background: AGRI.primary, color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Login</Link>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>PayLater</span>
                </div>
            </nav>

            <div style={{ maxWidth: '700px', margin: '24px auto', padding: '0 24px 48px' }}>
                {/* Hero Card */}
                <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(5,150,105,0.28)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>PayLater Credit</p>
                    <h2 style={{ color: '#fff', fontSize: '2.6rem', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                        ₹{availableCredit.toLocaleString('en-IN')}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', margin: '0 0 16px' }}>
                        Available from ₹{wallet?.paylaterLimit?.toLocaleString('en-IN') || '0'} limit
                    </p>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: 0 }}>Interest</p>
                            <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>0.099%/day</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: 0 }}>Free Period</p>
                            <p style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>15 days</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: 0 }}>After 15 days</p>
                            <p style={{ color: '#fca5a5', fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>0.11%/day</p>
                        </div>
                    </div>
                </div>

                {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}
                {success && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: AGRI.green, fontSize: '0.85rem', fontWeight: 600 }}>{success}</div>}

                {/* Tabs */}
                {wallet?.paylaterEligible ? (
                    <>
                        <div style={{ background: AGRI.primaryLight, borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px', marginBottom: '24px', border: `1px solid ${AGRI.border}` }}>
                            {[['borrow', '💰 Borrow'], ['repay', '💳 Repay'], ['history', '📋 History']].map(([k, l]) => (
                                <button key={k} onClick={() => setTab(k as any)}
                                    style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: tab === k ? AGRI.white : 'transparent', color: tab === k ? AGRI.primary : AGRI.muted, boxShadow: tab === k ? SHARED.shadow : 'none', transition: 'all 0.2s ease' }}>{l}</button>
                            ))}
                        </div>

                        {tab === 'borrow' && (
                            <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '24px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 6px', color: AGRI.textSecondary }}>💰 Borrow Money</h3>
                                <p style={{ color: AGRI.muted, marginBottom: '20px', fontSize: '0.875rem' }}>Instant credit to your wallet. Repay within 15 days at 0.099% daily interest.</p>
                                <div style={{ background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '14px', padding: '12px 18px', marginBottom: '16px' }}>
                                    <label style={labelStyle(AGRI)}>Loan Amount</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '1.8rem' }}>₹</span>
                                        <input type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} placeholder="0"
                                            style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '1.8rem', fontWeight: 800, width: '100%' }} />
                                    </div>
                                </div>
                                {loanAmount && parseFloat(loanAmount) > 0 && (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                                        <p style={{ color: '#065f46', fontSize: '0.85rem', margin: '0 0 4px', fontWeight: 600 }}>Loan Summary</p>
                                        <p style={{ color: '#065f46', fontSize: '0.8rem', margin: 0 }}>
                                            Amount: ₹{parseFloat(loanAmount).toLocaleString('en-IN')} | Daily Interest: ₹{(parseFloat(loanAmount) * 0.099 / 100).toFixed(2)}<br />
                                            Due in 15 days: ₹{(parseFloat(loanAmount) + parseFloat(loanAmount) * 0.099 / 100 * 15).toFixed(2)}
                                        </p>
                                    </div>
                                )}
                                <button onClick={handleBorrow} disabled={borrowing || !loanAmount}
                                    style={{ width: '100%', padding: '15px', background: loanAmount ? AGRI.green : AGRI.border, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: loanAmount ? 'pointer' : 'not-allowed', opacity: borrowing ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                                    {borrowing ? 'Processing…' : `Borrow ₹${loanAmount || '0'}`}
                                </button>
                            </div>
                        )}

                        {tab === 'repay' && (
                            <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '24px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                                <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 6px', color: AGRI.textSecondary }}>💳 Repay Loan</h3>
                                <p style={{ color: AGRI.muted, marginBottom: '20px', fontSize: '0.875rem' }}>Repay your active loans from your wallet balance.</p>

                                {activeLoans.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <p style={{ color: AGRI.muted }}>No active loans to repay</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={labelStyle(AGRI)}>Select Loan</label>
                                            <select value={repayLoanId} onChange={e => setRepayLoanId(e.target.value)}
                                                style={{ width: '100%', padding: '12px', background: AGRI.bg, border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', color: AGRI.text, fontSize: '0.9rem', fontWeight: 600 }}>
                                                <option value="">Select a loan…</option>
                                                {activeLoans.map(l => (
                                                    <option key={l._id} value={l._id}>
                                                        ₹{l.loanAmount.toLocaleString('en-IN')} — Due: {formatDate(l.dueDate)} — ₹{l.amountDue.toFixed(2)} remaining
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '14px', padding: '12px 18px', marginBottom: '16px' }}>
                                            <label style={labelStyle(AGRI)}>Repayment Amount</label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '1.8rem' }}>₹</span>
                                                <input type="number" value={repayAmount} onChange={e => setRepayAmount(e.target.value)} placeholder="0"
                                                    style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '1.8rem', fontWeight: 800, width: '100%' }} />
                                            </div>
                                        </div>
                                        <button onClick={handleRepay} disabled={borrowing || !repayLoanId || !repayAmount}
                                            style={{ width: '100%', padding: '15px', background: repayLoanId && repayAmount ? AGRI.primary : AGRI.border, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: repayLoanId && repayAmount ? 'pointer' : 'not-allowed', opacity: borrowing ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                                            {borrowing ? 'Processing…' : `Repay ₹${repayAmount || '0'}`}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {tab === 'history' && (
                            <div>
                                {activeLoans.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Active Loans</h3>
                                        {activeLoans.map(l => (
                                            <div key={l._id} style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: '14px', padding: '16px', marginBottom: '10px', boxShadow: SHARED.shadow, transition: 'all 0.2s ease' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: AGRI.textSecondary }}>₹{l.loanAmount.toLocaleString('en-IN')}</span>
                                                    <span style={{ background: l.status === 'partially_repaid' ? '#fef3c7' : '#d1fae5', color: l.status === 'partially_repaid' ? '#92400e' : '#065f46', padding: '3px 10px', borderRadius: '100px', fontSize: '0.72rem', fontWeight: 700 }}>
                                                        {l.status === 'partially_repaid' ? 'Partially Repaid' : 'Active'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: AGRI.muted }}>
                                                    <span>Due: <strong style={{ color: AGRI.text }}>{formatDate(l.dueDate)}</strong></span>
                                                    <span>Remaining: <strong style={{ color: AGRI.red }}>₹{l.amountDue.toFixed(2)}</strong></span>
                                                    <span>Repaid: <strong style={{ color: AGRI.green }}>₹{(l.totalRepaid || 0).toLocaleString('en-IN')}</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {closedLoans.length > 0 && (
                                    <div>
                                        <h3 style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Closed Loans</h3>
                                        {closedLoans.map(l => (
                                            <div key={l._id} style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: '14px', padding: '12px 16px', marginBottom: '8px', boxShadow: SHARED.shadow, transition: 'all 0.2s ease' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 700, color: AGRI.text }}>₹{l.loanAmount.toLocaleString('en-IN')}</span>
                                                    <span style={{ color: AGRI.green, fontWeight: 700, fontSize: '0.85rem' }}>✅ Closed</span>
                                                </div>
                                                <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '4px 0 0' }}>Borrowed: {formatDate(l.borrowedAt)} | Total repaid: ₹{(l.totalRepaid || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeLoans.length === 0 && closedLoans.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px', background: AGRI.white, borderRadius: SHARED.radius, border: `1px solid ${AGRI.border}` }}>
                                        <p style={{ color: AGRI.muted }}>No loan history yet</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '36px', textAlign: 'center', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔒</div>
                        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', color: AGRI.textSecondary, margin: '0 0 8px' }}>PayLater is Locked</h2>
                        <p style={{ color: AGRI.muted, fontSize: '0.9rem', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
                            Enable PayLater to get instant credit up to ₹10,00,000 at just 0.099% daily interest. Link your bank and build credit history.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '280px', margin: '0 auto' }}>
                            <button onClick={enablePayLater}
                                style={{ padding: '14px', background: 'linear-gradient(135deg, #065f46, #059669)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                🔓 Enable PayLater
                            </button>
                            <Link href="/agripay/verify-bank" style={{ padding: '12px', background: AGRI.bg, border: `1.5px solid ${AGRI.border}`, borderRadius: '12px', color: AGRI.primary, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center', transition: 'all 0.2s ease', cursor: 'pointer' }}>
                                🏦 Link Bank First
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}