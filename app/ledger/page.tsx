'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, getUserInfo, logout } from '@/lib/auth-fetch'
import { LEDGER, SHARED } from '@/lib/styles'
import BillCalculator from './BillCalculator'
import ManualBillEntry from './ManualBillEntry'

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
    bill: { label: 'Bill', icon: '\u{1F9FE}', color: LEDGER.gold },
    invoice: { label: 'Invoice', icon: '\u{1F4C4}', color: '#60A5FA' },
    earning: { label: 'Earning', icon: '\u{1F4B0}', color: LEDGER.green },
    expense: { label: 'Expense', icon: '\u{1F4B8}', color: LEDGER.red },
}

const statusStyle: Record<string, { bg: string; color: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' },
    paid: { bg: 'rgba(34, 197, 94, 0.15)', color: '#4ADE80' },
    overdue: { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171' },
    cancelled: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8' },
}

function formatINR(n: number) {
    return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// ── Impressive Camera Icon (SVG) for Bill Calculator ──
function CameraIcon({ size = 28, color = LEDGER.gold }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Camera body */}
            <rect x="6" y="14" width="36" height="26" rx="4" fill="none" stroke={color} strokeWidth="2.5" />
            {/* Camera top hump */}
            <path d="M16 14 L18 8 L30 8 L32 14" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Lens outer circle */}
            <circle cx="24" cy="27" r="8" stroke={color} strokeWidth="2.5" fill="none" />
            {/* Lens inner circle */}
            <circle cx="24" cy="27" r="4" fill={color} opacity="0.3" />
            {/* Flash dot */}
            <circle cx="36" cy="20" r="1.5" fill={color} />
            {/* Shutter highlight */}
            <circle cx="21" cy="24" r="1.5" fill={color} opacity="0.5" />
        </svg>
    )
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
    const [manualResult, setManualResult] = useState<any>(null)

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
            const sigRes = await authFetch('/api/social/upload-signature?kind=image')
            const sig = await sigRes.json()
            if (!sig.available) { setError('Cloudinary not configured'); return }
            const fd = new FormData()
            fd.append('file', blob)
            fd.append('api_key', sig.apiKey)
            fd.append('timestamp', sig.timestamp.toString())
            fd.append('signature', sig.signature)
            fd.append('folder', sig.folder)
            fd.append('resource_type', sig.resourceType)
            fd.append('allowed_formats', sig.allowedFormats)
            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
            const cld = await cldRes.json()
            if (cldRes.ok && cld.secure_url) setBillPhoto(cld.secure_url)
            else setError('Upload failed: ' + (cld?.error?.message || 'Unknown'))
        } catch {
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
                    type: entryType, counterpartyName, amount: parseFloat(amount),
                    commodity, quantity: quantity ? parseFloat(quantity) : 0,
                    description, billPhoto, status: 'pending',
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

    const L = LEDGER // shorthand

    return (
        <div style={{ minHeight: '100vh', background: L.gradient, fontFamily: SHARED.font }}>
            {/* ── Navigation ── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${L.border}`,
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href={`/${userRole}/dashboard`} style={{ color: L.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem', transition: 'color 0.2s' }}>
                            ← Dashboard
                        </Link>
                        <span style={{ color: L.muted }}>|</span>
                        <span style={{ color: L.text, fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '1.2rem' }}>📒</span> Ledger
                        </span>
                    </div>
                    {userRole !== 'buyer' && (
                        <button onClick={() => setShowAddModal(true)} style={{
                            background: L.gradientNavy, color: '#fff',
                            border: 'none', borderRadius: 10, padding: '8px 18px',
                            fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: L.shadow, transition: 'transform 0.2s',
                        }}>+ Add Entry</button>
                    )}
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 16px 80px' }}>
                {/* ── Header ── */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ color: L.text, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 6px' }}>📒 Ledger</h1>
                    <p style={{ color: L.muted, margin: 0, fontSize: '0.92rem' }}>Track your bills, invoices, earnings, and expenses.</p>
                </div>

                {/* ── Bill Calculator with Camera Icon ── */}
                {userRole === 'buyer' && (
                    <div style={{
                        background: L.card, borderRadius: 16, padding: 20,
                        marginBottom: 24, border: `1px solid ${L.borderGold}`,
                        boxShadow: L.shadowGold,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            {/* ── Impressive Camera Icon ── */}
                            <div style={{
                                width: 52, height: 52, borderRadius: 14,
                                background: L.goldLight, border: `1.5px solid ${L.borderGold}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <CameraIcon size={30} color={L.accentDark} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ color: L.text, fontWeight: 800, fontSize: '1.15rem', margin: 0 }}>
                                    {manualResult ? 'Generated Bill' : 'Bill Calculator'}
                                </h2>
                                <p style={{ color: L.muted, fontSize: '0.76rem', margin: '2px 0 0' }}>
                                    {manualResult ? 'From manual entry' : 'Snap or upload a bill photo to get instant total'}
                                </p>
                            </div>
                            {manualResult && (
                                <button onClick={() => setManualResult(null)} style={{
                                    background: 'transparent', border: `1px solid ${L.border}`,
                                    borderRadius: 8, padding: '6px 12px', color: L.muted,
                                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                }}>✕ Clear</button>
                            )}
                        </div>
                        <BillCalculator
                            embedded
                            key={manualResult ? 'manual' : 'photo'}
                            initialResult={manualResult}
                            onSaved={() => { fetchLedger(); setManualResult(null) }}
                        />
                    </div>
                )}

                {/* ── Manual Bill Entry ── */}
                {userRole === 'buyer' && !manualResult && (
                    <div style={{
                        background: L.card, borderRadius: 16, padding: 20,
                        marginBottom: 24, border: `1px solid ${L.border}`,
                        boxShadow: L.shadow,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: '1.3rem' }}>✍️</span>
                            <h2 style={{ color: L.text, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>Manual Bill Entry</h2>
                            <span style={{ color: L.muted, fontSize: '0.76rem', marginLeft: 'auto' }}>Enter commodity + per-bag weights</span>
                        </div>
                        <ManualBillEntry onGenerate={(result) => setManualResult(result)} />
                    </div>
                )}

                {/* ── Summary Cards ── */}
                {summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
                        {[
                            { label: 'Total Earnings', value: summary.totalEarnings, color: L.green, icon: '💰' },
                            { label: 'Total Expenses', value: summary.totalExpenses, color: L.red, icon: '💸' },
                            { label: 'Receivables', value: summary.pendingReceivables, color: L.goldDark, icon: '📥', sub: 'Pending incoming' },
                            { label: 'Payables', value: summary.pendingPayables, color: L.red, icon: '📤', sub: 'Pending outgoing' },
                        ].map((card, i) => (
                            <div key={i} style={{
                                background: L.card, borderRadius: 14, padding: 18,
                                border: `1px solid ${L.border}`, boxShadow: L.shadow,
                                transition: 'transform 0.2s, border-color 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: '1.2rem' }}>{card.icon}</span>
                                    <p style={{ color: L.muted, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{card.label}</p>
                                </div>
                                <p style={{ color: card.color, fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{formatINR(card.value)}</p>
                                {card.sub && <p style={{ color: L.muted, fontSize: '0.66rem', margin: '4px 0 0' }}>{card.sub}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Filter Tabs ── */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto' }} className="no-scrollbar">
                    {(['all', 'bill', 'invoice', 'earning', 'expense'] as const).map(t => (
                        <button key={t} onClick={() => setFilter(t)} style={{
                            padding: '8px 16px', borderRadius: 100,
                            border: `1.5px solid ${filter === t ? L.gold : L.border}`,
                            background: filter === t ? L.gradientGold : 'transparent',
                            color: filter === t ? L.text : L.muted,
                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', textTransform: 'capitalize',
                            transition: 'all 0.2s ease',
                        }}>
                            {t === 'all' ? 'All' : typeLabel[t]?.label + 's'}
                        </button>
                    ))}
                </div>

                {/* ── Entries List ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: L.muted }}>Loading…</div>
                ) : entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: L.muted }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📒</div>
                        <h3 style={{ color: L.text, margin: '0 0 6px' }}>No entries yet</h3>
                        <p style={{ fontSize: '0.86rem', margin: 0 }}>Click "+ Add Entry" to record your first transaction.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {entries.map(e => {
                            const meta = typeLabel[e.type] || { label: e.type, icon: '📝', color: '#6b7280' }
                            const ss = statusStyle[e.status] || statusStyle.pending
                            const isCredit = e.type === 'earning' || (e.type === 'bill' && userRole !== 'buyer')
                            return (
                                <div key={e._id} style={{
                                    background: L.card, border: `1px solid ${L.border}`,
                                    borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start',
                                    boxShadow: L.shadow, transition: 'background 0.2s, border-color 0.2s',
                                }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.3rem', flexShrink: 0,
                                    }}>{meta.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <p style={{ color: L.text, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{meta.label}{e.commodity ? ` · ${e.commodity}` : ''}</p>
                                            <span style={{ background: ss.bg, color: ss.color, padding: '2px 8px', borderRadius: 100, fontSize: '0.66rem', fontWeight: 700, textTransform: 'capitalize' }}>{e.status}</span>
                                        </div>
                                        {e.counterpartyName && <p style={{ color: L.muted, fontSize: '0.78rem', margin: 0 }}>With: {e.counterpartyName}</p>}
                                        {e.quantity > 0 && <p style={{ color: L.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.quantity} {e.unit} @ ₹{e.pricePerUnit}/{e.unit}</p>}
                                        {e.description && <p style={{ color: L.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.description}</p>}
                                        {e.billPhoto && (
                                            <a href={e.billPhoto} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6 }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={e.billPhoto} alt="bill" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, border: `1px solid ${L.border}` }} />
                                            </a>
                                        )}
                                        <p style={{ color: L.muted, fontSize: '0.68rem', margin: '6px 0 0' }}>{new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{e.paidAt && ` · Paid ${new Date(e.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
                                        {e.status === 'pending' && (
                                            <button onClick={() => markPaid(e._id)} style={{
                                                marginTop: 6, background: L.green, color: '#fff',
                                                border: 'none', borderRadius: 6, padding: '5px 14px',
                                                fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                                            }}>Mark as Paid</button>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ color: isCredit ? L.green : L.red, fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                                            {isCredit ? '+' : '-'}{formatINR(e.amount)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Add Entry Modal ── */}
            {showAddModal && (
                <div onClick={() => setShowAddModal(false)} style={{
                    position: 'fixed', inset: 0, background: 'rgba(12, 28, 63, 0.4)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                    backdropFilter: 'blur(4px)',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: L.card, borderRadius: 16, padding: 28, maxWidth: 440, width: '100%',
                        boxShadow: L.shadowXl, maxHeight: '90vh', overflowY: 'auto',
                        border: `1px solid ${L.border}`,
                    }}>
                        <h3 style={{ margin: '0 0 20px', color: L.text, fontWeight: 800, fontSize: '1.2rem', textAlign: 'center' }}>Add Ledger Entry</h3>

                        {/* Type selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                            {(['bill', 'invoice', 'earning', 'expense'] as const).map(t => (
                                <button key={t} onClick={() => setEntryType(t)} style={{
                                    padding: '10px', borderRadius: 8,
                                    border: `1.5px solid ${entryType === t ? L.gold : L.border}`,
                                    background: entryType === t ? L.goldLight : 'transparent',
                                    color: entryType === t ? L.text : L.muted,
                                    fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                    transition: 'all 0.2s ease',
                                }}>
                                    {typeLabel[t].icon} {typeLabel[t].label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder="Counterparty name" style={{
                                width: '100%', padding: '11px 14px', border: `1.5px solid ${L.border}`,
                                borderRadius: 10, fontSize: '0.88rem', color: L.text, outline: 'none',
                                boxSizing: 'border-box', fontFamily: SHARED.font, background: L.cream,
                            }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount ₹" style={{
                                    padding: '11px 14px', border: `1.5px solid ${L.border}`, borderRadius: 10,
                                    fontSize: '0.88rem', color: L.text, outline: 'none', boxSizing: 'border-box',
                                    fontFamily: SHARED.font, background: L.cream,
                                }} />
                                <input value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="Commodity" style={{
                                    padding: '11px 14px', border: `1.5px solid ${L.border}`, borderRadius: 10,
                                    fontSize: '0.88rem', color: L.text, outline: 'none', boxSizing: 'border-box',
                                    fontFamily: SHARED.font, background: L.cream,
                                }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" placeholder="Quantity (kg)" style={{
                                    padding: '11px 14px', border: `1.5px solid ${L.border}`, borderRadius: 10,
                                    fontSize: '0.88rem', color: L.text, outline: 'none', boxSizing: 'border-box',
                                    fontFamily: SHARED.font, background: L.cream,
                                }} />
                                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes (optional)" style={{
                                    padding: '11px 14px', border: `1.5px solid ${L.border}`, borderRadius: 10,
                                    fontSize: '0.88rem', color: L.text, outline: 'none', boxSizing: 'border-box',
                                    fontFamily: SHARED.font, background: L.cream,
                                }} />
                            </div>

                            {/* Bill photo upload */}
                            {(entryType === 'bill' || entryType === 'invoice') && (
                                <div>
                                    <label style={{ color: L.muted, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                                        {entryType === 'bill' ? 'Upload weighing slip / bill photo' : 'Upload invoice photo'}
                                    </label>
                                    {billPhoto ? (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={billPhoto} alt="bill" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: `1.5px solid ${L.border}` }} />
                                            <button onClick={() => setBillPhoto('')} style={{
                                                position: 'absolute', top: 4, right: 4,
                                                background: 'rgba(12, 28, 63, 0.7)', color: '#fff', border: 'none',
                                                borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem',
                                            }}>✕</button>
                                        </div>
                                    ) : (
                                        <label style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            width: 120, height: 90, border: `2px dashed ${L.borderGold}`, borderRadius: 8,
                                            cursor: 'pointer', gap: 4, background: L.goldLight,
                                        }}>
                                            <CameraIcon size={24} color={L.accentDark} />
                                            <span style={{ color: L.muted, fontSize: '0.7rem' }}>{uploading ? 'Uploading…' : 'Upload'}</span>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBillPhotoUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {error && <p style={{ color: L.red, fontSize: '0.82rem', margin: 0 }}>{error}</p>}

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => setShowAddModal(false)} style={{
                                    flex: 1, padding: '11px', background: 'transparent',
                                    border: `1.5px solid ${L.border}`, borderRadius: 10,
                                    fontWeight: 700, fontSize: '0.88rem', color: L.muted, cursor: 'pointer',
                                }}>Cancel</button>
                                <button onClick={handleAddEntry} disabled={saving || uploading} style={{
                                    flex: 1, padding: '11px', background: L.gradientNavy,
                                    border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
                                    color: '#fff', cursor: 'pointer', opacity: (saving || uploading) ? 0.6 : 1,
                                    boxShadow: L.shadow,
                                }}>{saving ? 'Saving…' : 'Add Entry'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
