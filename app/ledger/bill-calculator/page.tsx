'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { BUYER, SHARED, navStyle } from '@/lib/styles'

interface BagWeight { name: string; nameEn: string; weights: number[]; bagCount: number; subtotalWeight: number }
interface CalcResult { commodities: BagWeight[]; grandTotalWeight: number; totalBags: number; rawText: string }
interface BuyerListing { _id: string; commodity: string; pricePerUnit: number; unit: string }

function formatINR(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function formatKg(n: number) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) + ' kg'
}

export default function BillCalculatorPage() {
    const router = useRouter()
    const [userRole, setUserRole] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<CalcResult | null>(null)
    const [listings, setListings] = useState<BuyerListing[]>([])

    // Per-commodity editable rate + unit
    const [rates, setRates] = useState<Record<number, { rate: string; unit: 'kg' | 'quintal' }>>({})
    const [counterpartyName, setCounterpartyName] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const { userId, userRole } = getUserInfo()
        if (!userId) { router.replace('/auth/login'); return }
        setUserRole(userRole || 'buyer')
        // Fetch this buyer's listings so we can prefill rates per commodity
        void (async () => {
            try {
                const res = await authFetch('/api/listings?limit=100')
                if (res.ok) {
                    const d = await res.json()
                    setListings(d?.data?.listings || d?.listings || [])
                }
            } catch { /* ignore — manual rate entry still works */ }
        })()
    }, [router])

    const palette = BUYER // Calculator is most useful for buyers; visually use BUYER palette

    const onPickFile = (f: File | null) => {
        if (!f) return
        if (!f.type.startsWith('image/')) { setError('Please choose an image file (JPG, PNG, etc.)'); return }
        if (f.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return }
        setFile(f)
        setPreviewUrl(URL.createObjectURL(f))
        setError('')
        setResult(null)
        setRates({})
        setSaveMsg('')
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) onPickFile(f)
    }

    const runCalc = async () => {
        if (!file) { setError('Please choose a bill photo first'); return }
        setLoading(true)
        setError('')
        setResult(null)
        setRates({})
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await authFetch('/api/ledger/bill-calc', { method: 'POST', body: fd })
            const d = await res.json()
            if (!res.ok) {
                setError(d?.error || d?.error?.message || 'Failed to read bill')
                return
            }
            const data = d?.data || d
            setResult(data)
            // Prefill rates from matching buyer listings (case-insensitive, Hindi or English name match)
            const initial: Record<number, { rate: string; unit: 'kg' | 'quintal' }> = {}
            ;(data.commodities || []).forEach((c: BagWeight, i: number) => {
                const match = listings.find((l) => {
                    const lc = (l.commodity || '').toLowerCase().trim()
                    const n1 = (c.name || '').toLowerCase().trim()
                    const n2 = (c.nameEn || '').toLowerCase().trim()
                    return lc && (lc === n1 || lc === n2 || n1.includes(lc) || lc.includes(n1) || n2.includes(lc) || lc.includes(n2))
                })
                if (match && match.pricePerUnit > 0) {
                    initial[i] = {
                        rate: String(match.pricePerUnit),
                        unit: match.unit === 'quintal' ? 'quintal' : 'kg',
                    }
                } else {
                    initial[i] = { rate: '', unit: 'kg' }
                }
            })
            setRates(initial)
        } catch (e) {
            setError('Network error — please try again')
        } finally {
            setLoading(false)
        }
    }

    // Computed: per-commodity amount + grand total
    const computedRows = (result?.commodities || []).map((c, i) => {
        const r = rates[i] || { rate: '', unit: 'kg' as const }
        const rateNum = parseFloat(r.rate) || 0
        const weightKg = c.subtotalWeight
        const effectiveKg = r.unit === 'quintal' ? weightKg / 100 : weightKg
        const amount = rateNum * effectiveKg
        return { ...c, rate: r.rate, unit: r.unit, amount }
    })
    const grandTotalAmount = computedRows.reduce((s, r) => s + r.amount, 0)

    const updateRate = (idx: number, field: 'rate' | 'unit', value: string) => {
        setRates((prev) => ({ ...prev, [idx]: { ...(prev[idx] || { rate: '', unit: 'kg' }), [field]: value } }))
    }

    const saveToLedger = async () => {
        if (!result || computedRows.length === 0) return
        if (grandTotalAmount <= 0) { setError('Enter at least one rate to compute a total'); return }
        setSaving(true)
        setSaveMsg('')
        try {
            // Save one ledger entry per commodity with computed amount, then
            // also save the grand total as a single 'bill' entry referencing the photo.
            // We'll save the grand total as a single bill entry to keep the ledger clean.
            // First upload the bill photo to Cloudinary (best-effort).
            let billPhotoUrl = ''
            if (file) {
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
                    if (sig.available) {
                        const fd = new FormData()
                        fd.append('file', blob)
                        fd.append('api_key', sig.apiKey)
                        fd.append('timestamp', sig.timestamp.toString())
                        fd.append('signature', sig.signature)
                        fd.append('folder', sig.folder)
                        const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
                        const cld = await cldRes.json()
                        if (cldRes.ok && cld.secure_url) billPhotoUrl = cld.secure_url
                    }
                } catch { /* ignore upload errors — save without photo */ }
            }

            const commoditySummary = computedRows
                .map((r) => `${r.name}${r.nameEn ? ` (${r.nameEn})` : ''}: ${r.bagCount} bags, ${formatKg(r.subtotalWeight)} @ ₹${r.rate}/${r.unit}`)
                .join('\n')

            const res = await authFetch('/api/ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'bill',
                    counterpartyName: counterpartyName || 'Farmer (bill calc)',
                    amount: Number(grandTotalAmount.toFixed(2)),
                    commodity: computedRows.map((r) => r.nameEn || r.name).join(', '),
                    quantity: Number(result.grandTotalWeight.toFixed(3)),
                    unit: 'kg',
                    pricePerUnit: Number((grandTotalAmount / result.grandTotalWeight).toFixed(2)),
                    description: `Auto-calculated from bill photo.\n${commoditySummary}\nTotal bags: ${result.totalBags}`,
                    billPhoto: billPhotoUrl,
                    status: 'pending',
                }),
            })
            const d = await res.json()
            if (res.ok) {
                setSaveMsg('Saved to ledger! View it in the Ledger page.')
            } else {
                setError(d?.error?.message || d?.error || 'Failed to save to ledger')
            }
        } catch (e) {
            setError('Network error while saving')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: palette.bg, fontFamily: SHARED.font }}>
            <nav style={{ ...navStyle(palette), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Link href="/ledger" style={{ color: palette.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← Ledger</Link>
                        <span style={{ color: palette.muted }}>›</span>
                        <span style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem' }}>🧮 Bill Calculator</span>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px 80px' }}>
                <h1 style={{ color: palette.text, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 6px' }}>🧮 Bill Calculator</h1>
                <p style={{ color: palette.muted, margin: '0 0 24px', fontSize: '0.92rem' }}>
                    Upload a bill photo — we'll read every bag weight (Hindi or English digits, even fractions like 5½ kg), sum them per commodity, and multiply by your stored rates to give the total amount to pay.
                </p>

                {/* Upload area */}
                {!result && (
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2.5px dashed ${palette.border}`,
                            borderRadius: 16,
                            padding: '40px 20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: palette.white,
                            transition: 'border-color .2s, background .2s',
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                        />
                        {previewUrl ? (
                            <div>
                                <img src={previewUrl} alt="bill preview" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 12, marginBottom: 12, boxShadow: SHARED.shadowMd }} />
                                <p style={{ color: palette.muted, fontSize: '0.84rem', margin: 0 }}>Click to choose a different photo</p>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📸</div>
                                <h3 style={{ color: palette.text, margin: '0 0 6px', fontWeight: 700 }}>Tap to upload a bill photo</h3>
                                <p style={{ color: palette.muted, fontSize: '0.84rem', margin: 0 }}>or drag-and-drop here · JPG/PNG up to 8 MB</p>
                                <p style={{ color: palette.muted, fontSize: '0.76rem', margin: '8px 0 0' }}>Works with handwritten Hindi (Devanagari) bills · fractions like 5½ auto-converted to 5.5 kg</p>
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: '0.86rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Action button */}
                {!result && (
                    <button
                        onClick={runCalc}
                        disabled={!file || loading}
                        style={{
                            marginTop: 16, width: '100%', padding: '14px 24px',
                            background: file && !loading ? palette.primary : palette.muted,
                            color: '#fff', border: 'none', borderRadius: 12,
                            fontSize: '1rem', fontWeight: 700, cursor: file && !loading ? 'pointer' : 'not-allowed',
                            transition: 'background .2s',
                        }}
                    >
                        {loading ? '🧠 Reading bill…' : '✨ Calculate Weights & Total'}
                    </button>
                )}

                {loading && (
                    <div style={{ marginTop: 16, padding: 16, background: palette.white, borderRadius: 12, border: `1px solid ${palette.borderLight}`, color: palette.muted, fontSize: '0.86rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.4rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                            <span>OCR-extracting commodity names, bag weights, and converting Devanagari digits + fractions to decimal kg…</span>
                        </div>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div>
                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20, marginTop: 8 }}>
                            <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                                <p style={{ color: palette.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Bags</p>
                                <p style={{ color: palette.text, fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>{result.totalBags}</p>
                            </div>
                            <div style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                                <p style={{ color: palette.muted, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Total Weight</p>
                                <p style={{ color: palette.text, fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>{formatKg(result.grandTotalWeight)}</p>
                            </div>
                            <div style={{ background: palette.gradient, borderRadius: 12, padding: 16, boxShadow: SHARED.shadowMd }}>
                                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount to Pay</p>
                                <p style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 0' }}>{formatINR(grandTotalAmount)}</p>
                            </div>
                        </div>

                        {/* Commodity rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {computedRows.map((c, i) => (
                                <div key={i} style={{ background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, padding: 16, boxShadow: SHARED.shadow }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <p style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                                                {c.name} {c.nameEn && c.nameEn !== c.name && <span style={{ color: palette.muted, fontWeight: 600, fontSize: '0.86rem' }}>({c.nameEn})</span>}
                                            </p>
                                            <p style={{ color: palette.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{c.bagCount} bag{c.bagCount !== 1 ? 's' : ''} · {formatKg(c.subtotalWeight)}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: palette.muted, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount</p>
                                            <p style={{ color: palette.primary, fontSize: '1.3rem', fontWeight: 800, margin: '2px 0 0' }}>{formatINR(c.amount)}</p>
                                        </div>
                                    </div>

                                    {/* Weights list */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                        {c.weights.map((w, j) => (
                                            <span key={j} style={{ background: palette.bgSub, color: palette.text, padding: '4px 10px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>
                                                Bag {j + 1}: <strong>{w.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</strong> kg
                                            </span>
                                        ))}
                                    </div>

                                    {/* Rate input row */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${palette.borderLight}`, paddingTop: 12 }}>
                                        <label style={{ fontSize: '0.78rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rate</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: palette.muted, fontSize: '0.9rem' }}>₹</span>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                step="0.01"
                                                placeholder="0"
                                                value={c.rate}
                                                onChange={(e) => updateRate(i, 'rate', e.target.value)}
                                                style={{
                                                    width: 120, padding: '8px 10px 8px 28px',
                                                    border: `1.5px solid ${palette.border}`, borderRadius: 8,
                                                    fontSize: '0.9rem', color: palette.text, background: palette.white,
                                                    outline: 'none', fontFamily: SHARED.font,
                                                }}
                                            />
                                        </div>
                                        <select
                                            value={c.unit}
                                            onChange={(e) => updateRate(i, 'unit', e.target.value)}
                                            style={{
                                                padding: '8px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 8,
                                                fontSize: '0.9rem', color: palette.text, background: palette.white,
                                                outline: 'none', fontFamily: SHARED.font,
                                            }}
                                        >
                                            <option value="kg">per kg</option>
                                            <option value="quintal">per quintal (100 kg)</option>
                                        </select>
                                        <span style={{ color: palette.muted, fontSize: '0.78rem' }}>
                                            = <strong style={{ color: palette.primary }}>{formatINR(c.amount)}</strong>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Counterparty + save */}
                        <div style={{ marginTop: 20, padding: 16, background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, boxShadow: SHARED.shadowMd }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                Farmer name (optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Ramesh Kumar"
                                value={counterpartyName}
                                onChange={(e) => setCounterpartyName(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px',
                                    border: `1.5px solid ${palette.border}`, borderRadius: 8,
                                    fontSize: '0.92rem', color: palette.text, background: palette.white,
                                    outline: 'none', fontFamily: SHARED.font, marginBottom: 12, boxSizing: 'border-box' as const,
                                }}
                            />
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    onClick={saveToLedger}
                                    disabled={saving || grandTotalAmount <= 0}
                                    style={{
                                        flex: 1, minWidth: 180, padding: '12px 20px',
                                        background: saving || grandTotalAmount <= 0 ? palette.muted : palette.primary,
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        fontSize: '0.92rem', fontWeight: 700, cursor: saving || grandTotalAmount <= 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {saving ? 'Saving…' : '💾 Save to Ledger'}
                                </button>
                                <button
                                    onClick={() => { setResult(null); setFile(null); setPreviewUrl(''); setRates({}); setSaveMsg(''); setError('') }}
                                    style={{
                                        padding: '12px 20px', background: palette.white,
                                        color: palette.text, border: `1.5px solid ${palette.border}`, borderRadius: 10,
                                        fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    📸 New Bill
                                </button>
                            </div>
                            {saveMsg && (
                                <p style={{ marginTop: 10, padding: '8px 12px', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, color: '#065f46', fontSize: '0.84rem', margin: '10px 0 0' }}>
                                    ✅ {saveMsg}{' '}
                                    <Link href="/ledger" style={{ color: '#065f46', fontWeight: 700, textDecoration: 'underline' }}>Go to Ledger →</Link>
                                </p>
                            )}
                        </div>

                        {/* Raw text (debug) */}
                        {result.rawText && (
                            <details style={{ marginTop: 16, padding: 12, background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 10 }}>
                                <summary style={{ cursor: 'pointer', color: palette.muted, fontSize: '0.82rem', fontWeight: 700 }}>OCR notes (raw)</summary>
                                <p style={{ marginTop: 8, marginBottom: 0, color: palette.muted, fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{result.rawText}</p>
                            </details>
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
