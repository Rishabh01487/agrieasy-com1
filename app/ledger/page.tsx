'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
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

const typeMeta: Record<string, { label: string; icon: string; bg: string; color: string }> = {
    bill:    { label: 'Bill',    icon: '\u{1F9FE}', bg: 'rgba(201, 161, 78, 0.10)',  color: '#9D7A2C' },
    invoice: { label: 'Invoice', icon: '\u{1F4C4}', bg: 'rgba(44, 63, 110, 0.10)',   color: '#2C3F6E' },
    earning: { label: 'Earning', icon: '\u{1F4B0}', bg: 'rgba(22, 163, 74, 0.10)',   color: '#16A34A' },
    expense: { label: 'Expense', icon: '\u{1F4B8}', bg: 'rgba(220, 38, 38, 0.10)',    color: '#DC2626' },
}

const statusMeta: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: 'rgba(201, 161, 78, 0.15)',  color: '#9D7A2C', label: 'Pending' },
    paid:      { bg: 'rgba(22, 163, 74, 0.15)',   color: '#16A34A', label: 'Paid' },
    overdue:   { bg: 'rgba(220, 38, 38, 0.15)',   color: '#DC2626', label: 'Overdue' },
    cancelled: { bg: 'rgba(93, 99, 111, 0.15)',   color: '#5D636F', label: 'Cancelled' },
}

function formatINR(n: number) {
    return '\u20B9' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

// ── Premium Camera Icon (SVG) ──
function CameraIcon({ size = 28, color = '#9D7A2C' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="13" width="38" height="28" rx="5" fill="none" stroke={color} strokeWidth="2.2" />
            <path d="M15 13 L17 7 L31 7 L33 13" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="24" cy="27" r="9" stroke={color} strokeWidth="2.2" fill="none" />
            <circle cx="24" cy="27" r="5" fill={color} opacity="0.15" />
            <circle cx="24" cy="27" r="2.5" fill={color} opacity="0.4" />
            <circle cx="37" cy="19" r="1.5" fill={color} />
            <circle cx="20" cy="24" r="1" fill={color} opacity="0.5" />
        </svg>
    )
}

// ── Gold Rule Ornament (matches Ridgewood's GoldRule) ──
function GoldRule({ width = '60px' }: { width?: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '12px 0' }}>
            <div style={{ height: 1.5, width, background: 'linear-gradient(90deg, transparent, rgba(201, 161, 78, 0.6))' }} />
            <div style={{ width: 7, height: 7, background: '#C9A14E', transform: 'rotate(45deg)' }} />
            <div style={{ width: 3, height: 3, background: '#FAF7F0', transform: 'rotate(45deg)', position: 'absolute' }} />
            <div style={{ height: 1.5, width, background: 'linear-gradient(90deg, rgba(201, 161, 78, 0.6), transparent)' }} />
        </div>
    )
}

// ── Eyebrow Label (matches Ridgewood's tracking-luxe pattern) ──
function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2 C12 2 8 8 8 14 C8 18 12 22 12 22 C12 22 16 18 16 14 C16 8 12 2 12 2 Z" fill="#9D7A2C" opacity="0.8" />
                <path d="M6 12 L6 20 L12 22 L18 20 L18 12" stroke="#9D7A2C" strokeWidth="1.5" fill="none" />
            </svg>
            <span style={{
                color: '#9D7A2C', fontSize: '0.65rem', fontWeight: 600,
                letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>{children}</span>
        </div>
    )
}

export default function LedgerPage() {
    const router = useRouter()
    const [entries, setEntries] = useState<LedgerEntry[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
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
    const [error, setError] = useState('')

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
            else setError('Upload failed')
        } catch { setError('Upload failed') }
        finally { setUploading(false) }
    }

    const handleAddEntry = async () => {
        if (!amount || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
        setSaving(true); setError('')
        try {
            const res = await authFetch('/api/ledger', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: entryType, counterpartyName, amount: parseFloat(amount), commodity, quantity: quantity ? parseFloat(quantity) : 0, description, billPhoto, status: 'pending' }),
            })
            const d = await res.json()
            if (res.ok) {
                setShowAddModal(false)
                setCounterpartyName(''); setAmount(''); setCommodity(''); setQuantity(''); setDescription(''); setBillPhoto('')
                void fetchLedger()
            } else { setError(d?.error?.message || 'Failed to add entry') }
        } catch { setError('Network error') }
        finally { setSaving(false) }
    }

    const markPaid = async (id: string) => {
        try { await authFetch('/api/ledger', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'paid' }) }); void fetchLedger() } catch {}
    }

    const L = LEDGER
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px',
        border: '1.5px solid rgba(26, 43, 76, 0.15)',
        borderRadius: 12, fontSize: '0.88rem', color: L.text, outline: 'none',
        boxSizing: 'border-box', fontFamily: SHARED.font,
        background: 'rgba(250, 247, 240, 0.5)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    }

    return (
        <div style={{ minHeight: '100vh', background: L.gradient, fontFamily: SHARED.font, color: L.text }}>
            {/* ── Navigation ── */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(250, 247, 240, 0.97)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(201, 161, 78, 0.20)',
                boxShadow: '0 8px 32px -12px rgba(17, 24, 58, 0.12)',
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Link href={`/${userRole}/dashboard`} style={{ color: L.primary, textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem', letterSpacing: '0.02em' }}>
                            ← Dashboard
                        </Link>
                        <span style={{ width: 1, height: 16, background: 'rgba(26, 43, 76, 0.15)' }} />
                        <span style={{ color: L.text, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.15rem' }}>📒</span> Ledger
                        </span>
                    </div>
                    {userRole !== 'buyer' && (
                        <button onClick={() => setShowAddModal(true)} style={{
                            background: L.gradientNavy, color: '#FAF7F0',
                            border: 'none', borderRadius: 100, padding: '9px 20px',
                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            boxShadow: L.shadowSoft, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            letterSpacing: '0.02em',
                        }}>+ Add Entry</button>
                    )}
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 16px 80px' }}>
                {/* ── Page Header ── */}
                <div style={{ marginBottom: 32 }}>
                    <Eyebrow>Financial Tracking</Eyebrow>
                    <h1 style={{ color: L.text, fontWeight: 700, fontSize: '2rem', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
                        Ledger
                    </h1>
                    <GoldRule width="48px" />
                    <p style={{ color: L.textMuted, margin: '8px 0 0', fontSize: '0.92rem', maxWidth: 500 }}>
                        Track your bills, invoices, earnings, and expenses — all in one place.
                    </p>
                </div>

                {/* ── Bill Calculator (with camera icon) ── */}
                {userRole === 'buyer' && (
                    <div style={{
                        background: L.card, borderRadius: 20, padding: 24,
                        marginBottom: 24,
                        border: `1px solid ${L.borderGold}`,
                        boxShadow: L.shadowLuxe,
                        transition: 'border-color 0.4s, box-shadow 0.4s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            {/* Camera Icon in gold-tinted container */}
                            <div style={{
                                width: 56, height: 56, borderRadius: 16,
                                background: L.accentSoft,
                                border: `1.5px solid ${L.borderGold}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(201, 161, 78, 0.15)',
                            }}>
                                <CameraIcon size={32} color={L.accentDark} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ color: L.text, fontWeight: 700, fontSize: '1.2rem', margin: 0, letterSpacing: '-0.01em' }}>
                                    {manualResult ? 'Generated Bill' : 'Bill Calculator'}
                                </h2>
                                <p style={{ color: L.textLight, fontSize: '0.78rem', margin: '3px 0 0' }}>
                                    {manualResult ? 'From manual entry' : 'Snap or upload a bill photo to get instant total'}
                                </p>
                            </div>
                            {manualResult && (
                                <button onClick={() => setManualResult(null)} style={{
                                    background: 'transparent',
                                    border: `1px solid ${L.border}`,
                                    borderRadius: 100, padding: '6px 14px',
                                    color: L.textLight, fontSize: '0.76rem', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s',
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
                        background: L.card, borderRadius: 20, padding: 24,
                        marginBottom: 24, border: `1px solid ${L.borderLight}`,
                        boxShadow: L.shadowSoft,
                        transition: 'border-color 0.4s, box-shadow 0.4s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(44, 63, 110, 0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.2rem',
                            }}>✍️</div>
                            <div>
                                <h2 style={{ color: L.text, fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Manual Bill Entry</h2>
                                <p style={{ color: L.textLight, fontSize: '0.76rem', margin: '2px 0 0' }}>Enter commodity + per-bag weights</p>
                            </div>
                        </div>
                        <ManualBillEntry onGenerate={(result) => setManualResult(result)} />
                    </div>
                )}

                {/* ── Summary Cards ── */}
                {summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 32 }}>
                        {[
                            { label: 'Earnings', value: summary.totalEarnings, color: L.green, icon: '\u{1F4B0}', bg: 'rgba(22, 163, 74, 0.08)' },
                            { label: 'Expenses', value: summary.totalExpenses, color: L.red, icon: '\u{1F4B8}', bg: 'rgba(220, 38, 38, 0.08)' },
                            { label: 'Receivables', value: summary.pendingReceivables, color: L.goldDark, icon: '\u{1F4E5}', bg: L.accentSoft, sub: 'Pending incoming' },
                            { label: 'Payables', value: summary.pendingPayables, color: L.red, icon: '\u{1F4E4}', bg: 'rgba(220, 38, 38, 0.08)', sub: 'Pending outgoing' },
                        ].map((card, i) => (
                            <div key={i} style={{
                                background: L.card, borderRadius: 16, padding: 20,
                                border: `1px solid ${L.borderLight}`,
                                boxShadow: L.shadowSoft,
                                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s, box-shadow 0.4s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = L.borderGoldHover; e.currentTarget.style.boxShadow = L.shadowLuxe }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = L.borderLight; e.currentTarget.style.boxShadow = L.shadowSoft }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{card.icon}</div>
                                    <p style={{ color: L.textLight, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>{card.label}</p>
                                </div>
                                <p style={{ color: card.color, fontSize: '1.6rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{formatINR(card.value)}</p>
                                {card.sub && <p style={{ color: L.textLight, fontSize: '0.66rem', margin: '4px 0 0' }}>{card.sub}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Filter Pills ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }} className="no-scrollbar">
                    {(['all', 'bill', 'invoice', 'earning', 'expense'] as const).map(t => {
                        const active = filter === t
                        return (
                            <button key={t} onClick={() => setFilter(t)} style={{
                                padding: '8px 18px', borderRadius: 100,
                                border: `1.5px solid ${active ? L.accent : L.border}`,
                                background: active ? L.gradientGold : 'transparent',
                                color: active ? '#FAF7F0' : L.textLight,
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                whiteSpace: 'nowrap', textTransform: 'capitalize',
                                letterSpacing: '0.02em',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}>
                                {t === 'all' ? 'All' : typeMeta[t]?.label + 's'}
                            </button>
                        )
                    })}
                </div>

                {/* ── Entries ── */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: L.textLight }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${L.borderGold}`, borderTopColor: L.accent, animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        Loading…
                    </div>
                ) : entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 80, color: L.textLight }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.5 }}>📒</div>
                        <h3 style={{ color: L.text, margin: '0 0 8px', fontWeight: 600, fontSize: '1.1rem' }}>No entries yet</h3>
                        <p style={{ fontSize: '0.86rem', margin: 0 }}>Click "+ Add Entry" to record your first transaction.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {entries.map(e => {
                            const meta = typeMeta[e.type] || { label: e.type, icon: '📝', bg: 'rgba(93,99,111,0.08)', color: '#5D636F' }
                            const ss = statusMeta[e.status] || statusMeta.pending
                            const isCredit = e.type === 'earning' || (e.type === 'bill' && userRole !== 'buyer')
                            return (
                                <div key={e._id} style={{
                                    background: L.card, border: `1px solid ${L.borderLight}`,
                                    borderRadius: 16, padding: 18,
                                    display: 'flex', gap: 14, alignItems: 'flex-start',
                                    boxShadow: L.shadowSoft,
                                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s, box-shadow 0.4s',
                                }}
                                onMouseEnter={(e2) => { e2.currentTarget.style.transform = 'translateY(-2px)'; e2.currentTarget.style.borderColor = L.borderGoldHover; e2.currentTarget.style.boxShadow = L.shadowLuxe }}
                                onMouseLeave={(e2) => { e2.currentTarget.style.transform = 'translateY(0)'; e2.currentTarget.style.borderColor = L.borderLight; e2.currentTarget.style.boxShadow = L.shadowSoft }}
                                >
                                    <div style={{
                                        width: 46, height: 46, borderRadius: 12,
                                        background: meta.bg, border: `1px solid ${meta.color}25`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.3rem', flexShrink: 0,
                                    }}>{meta.icon}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <p style={{ color: L.text, fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{meta.label}{e.commodity ? ` · ${e.commodity}` : ''}</p>
                                            <span style={{ background: ss.bg, color: ss.color, padding: '2px 10px', borderRadius: 100, fontSize: '0.64rem', fontWeight: 600, textTransform: 'capitalize' }}>{ss.label}</span>
                                        </div>
                                        {e.counterpartyName && <p style={{ color: L.textLight, fontSize: '0.78rem', margin: 0 }}>With: {e.counterpartyName}</p>}
                                        {e.quantity > 0 && <p style={{ color: L.textLight, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.quantity} {e.unit} @ ₹{e.pricePerUnit}/{e.unit}</p>}
                                        {e.description && <p style={{ color: L.textLight, fontSize: '0.78rem', margin: '2px 0 0' }}>{e.description}</p>}
                                        {e.billPhoto && (
                                            <a href={e.billPhoto} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8 }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={e.billPhoto} alt="bill" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8, border: `2px solid ${L.cream}`, boxShadow: L.shadowSoft }} />
                                            </a>
                                        )}
                                        <p style={{ color: L.textLight, fontSize: '0.66rem', margin: '8px 0 0' }}>{new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{e.paidAt && ` · Paid ${new Date(e.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}</p>
                                        {e.status === 'pending' && (
                                            <button onClick={() => markPaid(e._id)} style={{
                                                marginTop: 8, background: L.green, color: '#fff',
                                                border: 'none', borderRadius: 100, padding: '5px 16px',
                                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                                                transition: 'transform 0.2s',
                                            }}>Mark as Paid</button>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <p style={{ color: isCredit ? L.green : L.red, fontWeight: 700, fontSize: '1.1rem', margin: 0, letterSpacing: '-0.02em' }}>
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
                    position: 'fixed', inset: 0, background: 'rgba(17, 24, 58, 0.40)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
                    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: L.card, borderRadius: 24, padding: 32, maxWidth: 440, width: '100%',
                        boxShadow: L.shadowXl, maxHeight: '90vh', overflowY: 'auto',
                        border: `1px solid ${L.borderGold}`,
                    }}>
                        <h3 style={{ margin: '0 0 4px', color: L.text, fontWeight: 700, fontSize: '1.25rem', textAlign: 'center', letterSpacing: '-0.01em' }}>Add Ledger Entry</h3>
                        <GoldRule width="40px" />

                        {/* Type selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                            {(['bill', 'invoice', 'earning', 'expense'] as const).map(t => {
                                const active = entryType === t
                                return (
                                    <button key={t} onClick={() => setEntryType(t)} style={{
                                        padding: '12px', borderRadius: 12,
                                        border: `1.5px solid ${active ? L.accent : L.border}`,
                                        background: active ? L.accentSoft : 'transparent',
                                        color: active ? L.text : L.textLight,
                                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    }}>
                                        {typeMeta[t].icon} {typeMeta[t].label}
                                    </button>
                                )
                            })}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} placeholder="Counterparty name" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = L.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${L.accentSoft}` }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26, 43, 76, 0.15)'; e.currentTarget.style.boxShadow = 'none' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="Amount ₹" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = L.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${L.accentSoft}` }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26, 43, 76, 0.15)'; e.currentTarget.style.boxShadow = 'none' }} />
                                <input value={commodity} onChange={e => setCommodity(e.target.value)} placeholder="Commodity" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = L.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${L.accentSoft}` }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26, 43, 76, 0.15)'; e.currentTarget.style.boxShadow = 'none' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input value={quantity} onChange={e => setQuantity(e.target.value)} type="number" placeholder="Quantity (kg)" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = L.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${L.accentSoft}` }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26, 43, 76, 0.15)'; e.currentTarget.style.boxShadow = 'none' }} />
                                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes (optional)" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = L.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${L.accentSoft}` }} onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(26, 43, 76, 0.15)'; e.currentTarget.style.boxShadow = 'none' }} />
                            </div>

                            {/* Bill photo upload */}
                            {(entryType === 'bill' || entryType === 'invoice') && (
                                <div>
                                    <label style={{ color: L.textLight, fontSize: '0.74rem', fontWeight: 600, display: 'block', marginBottom: 8, letterSpacing: '0.02em' }}>
                                        {entryType === 'bill' ? 'Upload weighing slip / bill photo' : 'Upload invoice photo'}
                                    </label>
                                    {billPhoto ? (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={billPhoto} alt="bill" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 12, border: `2px solid ${L.cream}`, boxShadow: L.shadowSoft }} />
                                            <button onClick={() => setBillPhoto('')} style={{
                                                position: 'absolute', top: 4, right: 4,
                                                background: 'rgba(17, 24, 58, 0.7)', color: '#fff', border: 'none',
                                                borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem',
                                            }}>✕</button>
                                        </div>
                                    ) : (
                                        <label style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            width: 120, height: 90, border: `2px dashed ${L.borderGold}`, borderRadius: 12,
                                            cursor: 'pointer', gap: 4, background: L.accentSoft,
                                            transition: 'border-color 0.3s, background 0.3s',
                                        }}>
                                            <CameraIcon size={24} color={L.accentDark} />
                                            <span style={{ color: L.textLight, fontSize: '0.7rem' }}>{uploading ? 'Uploading…' : 'Upload'}</span>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBillPhotoUpload} disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                            )}

                            {error && <p style={{ color: L.red, fontSize: '0.82rem', margin: 0 }}>{error}</p>}

                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button onClick={() => setShowAddModal(false)} style={{
                                    flex: 1, padding: '12px', background: 'transparent',
                                    border: `1.5px solid ${L.border}`, borderRadius: 100,
                                    fontWeight: 600, fontSize: '0.88rem', color: L.textLight, cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}>Cancel</button>
                                <button onClick={handleAddEntry} disabled={saving || uploading} style={{
                                    flex: 1, padding: '12px', background: L.gradientNavy,
                                    border: 'none', borderRadius: 100, fontWeight: 600, fontSize: '0.88rem',
                                    color: '#FAF7F0', cursor: 'pointer', opacity: (saving || uploading) ? 0.6 : 1,
                                    boxShadow: L.shadowSoft,
                                    transition: 'all 0.3s',
                                }}>{saving ? 'Saving…' : 'Add Entry'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
