'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { BUYER, FARMER, SHARED, navStyle } from '@/lib/styles'

interface LedgerEntry {
    _id: string
    type: 'bill' | 'invoice' | 'earning' | 'expense'
    counterpartyName: string
    amount: number
    quantity: number
    unit: string
    pricePerUnit: number
    commodity: string
    billPhoto: string
    status: 'pending' | 'paid' | 'overdue' | 'cancelled'
    description: string
    dueDate: string
    paidAt: string
    createdAt: string
}

interface Summary {
    totalEarnings: number
    totalExpenses: number
    pendingReceivables: number
    pendingPayables: number
    entryCount: number
}

const typeLabel: Record<string, { label: string; icon: string; color: string }> = {
    bill: { label: 'Bill', icon: '🧾', color: '#f59e0b' },
    invoice: { label: 'Invoice', icon: '📄', color: '#C05070' },
    earning: { label: 'Earning', icon: '💰', color: '#10b981' },
    expense: { label: 'Expense', icon: '💸', color: '#ef4444' },
}

const statusStyle: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    paid: { bg: '#d1fae5', color: '#065f46' },
    overdue: { bg: '#fee2e2', color: '#991b1b' },
    cancelled: { bg: '#f3f4f6', color: '#374151' },
}

function formatINR(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function LedgerPage() {
    const router = useRouter()
    const [entries, setEntries] = useState<LedgerEntry[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState<'all' | 'bill' | 'invoice' | 'earning' | 'expense'>('all')
    const [showAddModal, setShowAddModal] = useState(false)
    const [userRole, setUserRole] = useState('')

    const [entryType, setEntryType] = useState<'bill' | 'invoice' | 'earning' | 'expense'>('bill')
    const [counterpartyName, setCounterpartyName] = useState('')
    const [amount, setAmount] = useState('')
    const [commodity, setCommodity] = useState('')
    const [quantity, setQuantity] = useState('')
    const [description, setDescription] = useState('')
    const [billPhoto, setBillPhoto] = useState('')
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)

    const fetchLedger = useCallback(async () => {
        try {
            const res = await authFetch(`/api/ledger?type=${filter}&page=1&limit=50`)
            if (res.ok) {
                const d = await res.json()
                setEntries(d?.data?.entries || [])
                setSummary(d?.data?.summary || null)
            }
        } catch {}
        setLoading(false)
    }, [filter])

    useEffect(() => {
        const { userId, userRole } = getUserInfo()
        if (!userId) { router.replace('/auth/login'); return }
        setUserRole(userRole || 'farmer')
        void fetchLedger()
    }, [router, fetchLedger])

    const handleBillPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setUploading(true)
        try {
            const img = new Image()
            const url = URL.createObjectURL(file)
            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
            URL.revokeObjectURL(url)
            let w = img.width, h = img.height
            if (w > 1000) { h = Math.round(h * 1000 / w); w = 1000 }
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, w, h)
            const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void)
            const sigRes = await authFetch('/api/social/upload-signature')
            const sig = await sigRes.json()
            if (!sig.available) { setError('Cloudinary not configured'); return }
            const fd = new FormData()
            fd.append('file', blob)
            fd.append('api_key', sig.apiKey)
            fd.append('timestamp', sig.timestamp.toString())
            fd.append('signature', sig.signature)
            fd.append('folder', sig.folder)
            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
            const cld = await cldRes.json()
            if (cldRes.ok && cld.secure_url) setBillPhoto(cld.secure_url)
            else setError('Upload failed: ' + (cld?.error?.message || 'Unknown'))
        } catch (err) {
            setError('Upload failed')
        } finally {
            setUploading(false)
        }
    }

    const handleAddEntry = async () => {
        if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
        setSaving(true)
        setError('')
        try {
            const res = await authFetch('/api/ledger', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: entryType,
                    counterpartyName,
                    amount: parseFloat(amount),
                    commodity,
                    quantity: quantity ? parseFloat(quantity) : 0,
                    description,
                    billPhoto,
                    status: 'pending',
                }),
            })
            const d = await res.json()
            if (res.ok) {
                setShowAddModal(false)
                setCounterpartyName(''); setAmount(''); setCommodity(''); setQuantity(''); setDescription(''); setBillPhoto('')
                void fetchLedger()
            } else {
                setError(d?.error?.message || d?.error || 'Failed to add entry')
            }
        } catch {
            setError('Network error')
        } finally {
            setSaving(false)
        }
    }

    const markPaid = async (id: string) => {
        try {
            await authFetch('/api/ledger', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'paid' }),
            })
            void fetchLedger()
        } catch {}
    }

    const palette = userRole === 'buyer' ? BUYER : FARMER

    return (
        <div style={{ minHeight: '100vh', background: palette.bg, fontFamily: SHARED.font }}>
            <nav style={{ ...navStyle(palette), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href={`/${userRole}/dashboard`} style={{ color: palette.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← Dashboard</Link>
                        <span style={{ color: palette.muted }}>›</span>
                        <span style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem' }}>📒 Ledger</span>
                    </div>
                    <button onClick={() => setShowAddModal(true)} style={{ background: palette.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer' }}>+ Add Entry</button>
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 60px' }}>
                <h1 style={{ color: palette.text, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 6px' }}>📒 Ledger</h1>
                <p style={{ color: palette.muted, margin: '0 0 24px', fontSize: '0.92rem' }}>Track your bills, invoices, earnings, and expenses.</p>

                {/* Summary cards */}
                {summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Earnings</p>
                            <p style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(summary.totalEarnings)}</p>
                        </div>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Expenses</p>
                            <p style={{ color: '#ef4444', fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(summary.totalExpenses)}</p>
                        </div>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Receivables</p>
                            <p style={{ color: '#f59e0b', fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(summary.pendingReceivables)}</p>
                            <p style={{ color: palette.muted, fontSize: '0.68rem', margin: '2px 0 0' }}>Pending incoming</p>
                        </div>
                        <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                            <p style={{ color: palette.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Payables</p>
                            <p style={{ color: '#dc2626', fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(summary.pendingPayables)}</p>
                            <p style={{ color: palette.muted, fontSize: '0.68rem', margin: '2px 0 0' }}>Pending outgoing</p>
                        </div>
                    </div>
                )}

                {/* Filter tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }} className="no-scrollbar">
                    {(['all', 'bill', 'invoice', 'earning', 'expense'] as const).map(t => (
                        <button key={t} onClick={() => setFilter(t)} style={{ padding: '7px 14px', borderRadius: 100, border: `1.5px solid ${filter === t ? palette.primary : palette.border}`, background: filter === t ? palette.primary : palette.white, color: filter === t ? '#fff' : palette.muted, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                            {t === 'all' ? 'All' : typeLabel[t]?.label + 's'}
                        </button>
                    ))}
                </div>

                {/* Entries list */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: palette.muted }}>Loading…</div>
                ) : entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: palette.muted }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📒</div>
                        <h3 style={{ color: palette.text, margin: '0 0 6px' }}>No entries yet</h3>
                        <p style={{ fontSize: '0.86rem', margin: 0 }}>Click "+ Add Entry" to record your first transaction.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {entries.map(e => {
                            const meta = typeLabel[e.type] || { label: e.type, icon: '📝', color: '#6b7280' }
                            const ss = statusStyle[e.status] || statusStyle.pending
                            const isCredit = e.type === 'earning' || (e.type === 'bill' && userRole !== 'buyer')
                            return (
                                <div key={e._id} style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 10, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{meta.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <p style={{ color: palette.text, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{meta.label}{e.commodity ? ` · ${e.commodity}` : ''}</p>
                                            <span style={{ background: ss.bg, color: ss.color, padding: '2px 8px', borderRadius: 100, fontSize: '0.66rem', fontWeight: 700, textTransform: 'capitalize' }}>{e.status}</span>
                                        </div>
                                        {e.counterpartyName && <p style={{ color: palette.muted, fontSize: '0.78rem', margin: 0 }}>With: {e.counterpartyName}</p>}
                                        {e.quantity > 0 && <p style={{ color: palette.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.quantity} {e.unit} @ ₹{e.pricePerUnit}/{e.unit}</p>}
                                        {e.description && <p style={{ color: palette.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.description}</p>}
                                        {e.billPhoto && (
                                            <a href={e.billPhoto} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={e.billPhoto} alt="bill" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${palette.border}` }} />
                                            </a>
                                        )}
                                        <p style={{ color: palette.muted, fontSize: '0.68rem', margin: '6px 0 0' }}>{new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{e.paidAt && ` · Paid ${new Date(e.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
                                        {e.status === 'pending' && (
                                            <button onClick={() => markPaid(e._id)} style={{ marginTop: 6, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>Mark as Paid</button>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ color: isCredit ? '#10b981' : '#ef4444', fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>{isCredit ? '+' : '-'}{formatINR(e.amount)}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Add Entry Modal */}
            {showAddModal && (
                <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: palette.white, borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', boxShadow: SHARED.shadowXl, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 20px', color: palette.text, fontWeight: 800, fontSize: '1.2rem', textAlign: 'center' }}>Add Ledger Entry</h3>

                        {/* Type selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                            {(['bill', 'invoice', 'earning', 'expense'] as const).map(t => (
                                <button key={t} onClick={() => setEntryType(t)} style={{ padding: '10px', borderRadius: 8, border: `1.5px solid ${entryType === t ? palette.primary : palette.border}`, background: entryType === t ? palette.primary : palette.white, color: entryType === t ? '#fff' : palette.muted, fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                    {typeLabel[t].icon} {typeLabel[t].label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder="Counterparty name (buyer/farmer/transporter)" style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', color: palette.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount ₹" style={{ padding: '11px 14px', border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', color: palette.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font }} />
                                <input value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="Commodity" style={{ padding: '11px 14px', border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', color: palette.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" placeholder="Quantity (kg)" style={{ padding: '11px 14px', border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', color: palette.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font }} />
                                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes (optional)" style={{ padding: '11px 14px', border: `1.5px solid ${palette.border}`, borderRadius: 10, fontSize: '0.88rem', color: palette.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font }} />
                            </div>

                            {/* Bill photo upload (especially for 'bill' type) */}
                            {(entryType === 'bill' || entryType === 'invoice') && (
                                <div>
                                    <label style={{ color: palette.muted, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>{entryType === 'bill' ? '🧾 Upload weighing slip / bill photo' : '📄 Upload invoice photo'}</label>
                                    {billPhoto ? (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={billPhoto} alt="bill" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: `1.5px solid ${palette.border}` }} />
                                            <button onClick={() => setBillPhoto('')} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 120, height: 90, border: `2px dashed ${palette.border}`, borderRadius: 8, cursor: 'pointer', gap: 4, background: palette.bg }}>
                                            <span style={{ fontSize: '1.2rem' }}>📷</span>
                                            <span style={{ color: palette.muted, fontSize: '0.7rem' }}>{uploading ? 'Uploading…' : 'Upload'}</span>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBillPhotoUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '11px', background: palette.bg, border: `1.5px solid ${palette.border}`, borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: palette.textSecondary, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleAddEntry} disabled={saving || uploading} style={{ flex: 1, padding: '11px', background: palette.primary, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: '#fff', cursor: 'pointer', opacity: (saving || uploading) ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Add Entry'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
