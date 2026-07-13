'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch, getUserInfo } from '@/lib/auth-fetch'
import { BUYER, SHARED, navStyle } from '@/lib/styles'

interface Batch { bagCount: number; weight: number }
interface CommodityGroup {
    name: string
    nameEn: string
    batches: Batch[]
    totalBags: number
    totalWeight: number
}
interface CalcResult { commodities: CommodityGroup[]; grandTotalBags: number; grandTotalWeight: number; rawText: string }
interface BuyerListing { _id: string; commodity: string; pricePerUnit: number; unit: string }

function formatINR(n: number) {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
function formatKg(n: number) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: 3 }) + ' kg'
}
function formatNum(n: number, digits = 3) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: digits })
}

export default function BillCalculatorPage() {
    const router = useRouter()
    const [userId, setUserId] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [billPhotoUrl, setBillPhotoUrl] = useState('') // saved cloudinary url after first upload
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
        const info = getUserInfo()
        if (!info.userId) { router.replace('/auth/login'); return }
        setUserId(info.userId)
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

    const palette = BUYER

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
        setBillPhotoUrl('')
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
            ;(data.commodities || []).forEach((c: CommodityGroup, i: number) => {
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
        } catch {
            setError('Network error — please try again')
        } finally {
            setLoading(false)
        }
    }

    // Computed: per-commodity amount + grand total
    const computedRows = (result?.commodities || []).map((c, i) => {
        const r = rates[i] || { rate: '', unit: 'kg' as const }
        const rateNum = parseFloat(r.rate) || 0
        const weightKg = c.totalWeight
        const effectiveKg = r.unit === 'quintal' ? weightKg / 100 : weightKg
        const amount = rateNum * effectiveKg
        return { ...c, rate: r.rate, unit: r.unit, amount }
    })
    const grandTotalAmount = computedRows.reduce((s, r) => s + r.amount, 0)

    const updateRate = (idx: number, field: 'rate' | 'unit', value: string) => {
        setRates((prev) => ({ ...prev, [idx]: { ...(prev[idx] || { rate: '', unit: 'kg' }), [field]: value } }))
    }

    // Batch editing — update bagCount or weight on a specific batch row
    const updateBatch = (commodityIdx: number, batchIdx: number, field: 'bagCount' | 'weight', value: string) => {
        if (!result) return
        const num = field === 'bagCount' ? parseInt(value, 10) : parseFloat(value)
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            const newBatches = c.batches.map((b, j) => {
                if (j !== batchIdx) return b
                if (field === 'bagCount') return { ...b, bagCount: isNaN(num) || num < 0 ? 0 : num }
                return { ...b, weight: isNaN(num) || num < 0 ? 0 : Number(num.toFixed(3)) }
            })
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const addBatch = (commodityIdx: number) => {
        if (!result) return
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            const newBatches = [...c.batches, { bagCount: 10, weight: 0 }]
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const removeBatch = (commodityIdx: number, batchIdx: number) => {
        if (!result) return
        const newCommodities = result.commodities.map((c, i) => {
            if (i !== commodityIdx) return c
            if (c.batches.length <= 1) return c // keep at least 1 batch
            const newBatches = c.batches.filter((_, j) => j !== batchIdx)
            const totalBags = newBatches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = Number(newBatches.reduce((s, b) => s + b.weight, 0).toFixed(3))
            return { ...c, batches: newBatches, totalBags, totalWeight }
        })
        const grandTotalBags = newCommodities.reduce((s, c) => s + c.totalBags, 0)
        const grandTotalWeight = Number(newCommodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3))
        setResult({ ...result, commodities: newCommodities, grandTotalBags, grandTotalWeight })
    }

    const saveToLedger = async () => {
        if (!result || computedRows.length === 0) return
        if (grandTotalAmount <= 0) { setError('Enter at least one rate to compute a total'); return }
        setSaving(true)
        setSaveMsg('')
        try {
            // Upload the bill photo to Cloudinary (best-effort)
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
                        if (cldRes.ok && cld.secure_url) { billPhotoUrl = cld.secure_url; setBillPhotoUrl(billPhotoUrl) }
                    }
                } catch { /* ignore upload errors — save without photo */ }
            }

            const commoditySummary = computedRows
                .map((r) => `${r.name}${r.nameEn ? ` (${r.nameEn})` : ''}: ${r.totalBags} bags, ${formatKg(r.totalWeight)} @ ₹${r.rate}/${r.unit} = ${formatINR(r.amount)}`)
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
                    description: `Auto-calculated from bill photo.\n${commoditySummary}\nTotal bags: ${result.grandTotalBags}`,
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
        } catch {
            setError('Network error while saving')
        } finally {
            setSaving(false)
        }
    }

    // Print receipt — opens a new window with a styled printable receipt
    const printReceipt = () => {
        if (!result || computedRows.length === 0) return
        const now = new Date()
        const receiptNo = 'AG-' + now.getTime().toString().slice(-8)
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

        const rowsHtml = computedRows.map((c, i) => {
            const batchesHtml = c.batches.map((b, j) => `
                <tr class="batch-row">
                    <td colspan="2" style="padding: 2px 6px; color: #666; font-size: 11px;">
                        &nbsp;&nbsp;&nbsp; Batch ${j + 1}: ${b.bagCount} bags &times; ${formatNum(b.weight)} kg
                    </td>
                    <td colspan="3" style="padding: 2px 6px; color: #666; font-size: 11px; text-align: right;">
                        ${formatKg(b.weight)}
                    </td>
                </tr>
            `).join('')
            return `
                <tr class="commodity-header">
                    <td style="padding: 8px 6px; border-bottom: 1px solid #eee; font-weight: 700;">${i + 1}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #eee; font-weight: 700;">
                        ${c.name}${c.nameEn && c.nameEn !== c.name ? ` <span style="color:#666; font-weight:400;">(${c.nameEn})</span>` : ''}
                    </td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">${c.totalBags}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">${formatNum(c.totalWeight)}</td>
                    <td style="padding: 8px 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700; color: #AC3B61;">${formatINR(c.amount)}</td>
                </tr>
                <tr>
                    <td colspan="5" style="padding: 2px 6px 4px; font-size: 11px; color: #888;">
                        Rate: ₹${c.rate || '0'} / ${c.unit}${c.unit === 'quintal' ? ' (100 kg)' : ''}
                    </td>
                </tr>
                ${batchesHtml}
            `
        }).join('')

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AgriEasy Receipt ${receiptNo}</title>
<style>
    * { box-sizing: border-box; }
    body { font-family: 'Poppins', 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #123C69; background: #fff; }
    .receipt { max-width: 600px; margin: 0 auto; border: 1px solid #EDC7B7; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #AC3B61 0%, #8E2D4C 100%); color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
    .header .logo { font-size: 1.8rem; }
    .header .easy { font-family: 'Dancing Script', cursive; font-style: italic; font-weight: 700; }
    .meta { padding: 14px 24px; background: #FBF4EF; border-bottom: 1px solid #EDC7B7; font-size: 0.84rem; color: #5A77A0; display: flex; justify-content: space-between; }
    .meta strong { color: #123C69; }
    .parties { padding: 14px 24px; display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #eee; }
    .party { flex: 1; }
    .party .label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.08em; color: #BAB2B5; font-weight: 700; margin: 0 0 4px; }
    .party .name { font-size: 0.92rem; font-weight: 700; color: #123C69; margin: 0; }
    table { width: 100%; border-collapse: collapse; padding: 0 24px; }
    thead th { padding: 10px 6px; text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.08em; color: #BAB2B5; font-weight: 700; border-bottom: 2px solid #AC3B61; }
    thead th.num { text-align: right; }
    tbody td { font-size: 0.88rem; }
    .totals { padding: 14px 24px; background: #FBF4EF; border-top: 2px solid #AC3B61; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.92rem; }
    .totals .grand { border-top: 2px dashed #AC3B61; margin-top: 8px; padding-top: 10px; font-size: 1.2rem; font-weight: 800; color: #AC3B61; }
    .signatures { padding: 30px 24px 20px; display: flex; justify-content: space-between; gap: 40px; }
    .sig { flex: 1; text-align: center; }
    .sig .line { border-top: 1px solid #123C69; margin-bottom: 6px; padding-top: 30px; }
    .sig .label { font-size: 0.78rem; color: #5A77A0; }
    .footer { padding: 12px 24px; background: #123C69; color: rgba(255,255,255,0.85); text-align: center; font-size: 0.74rem; }
    .footer strong { color: #fff; }
    @media print {
        body { padding: 0; }
        .receipt { border: none; max-width: 100%; }
        .no-print { display: none; }
    }
</style>
</head>
<body>
<div class="receipt">
    <div class="header">
        <div>
            <h1>Agri<span class="easy">Easy</span></h1>
            <div style="font-size: 0.74rem; opacity: 0.9; margin-top: 2px;">India's Agricultural Marketplace</div>
        </div>
        <div class="logo">🌾</div>
    </div>
    <div class="meta">
        <div>Receipt No: <strong>${receiptNo}</strong></div>
        <div>Date: <strong>${dateStr}</strong> · ${timeStr}</div>
    </div>
    <div class="parties">
        <div class="party">
            <p class="label">Farmer (किसान)</p>
            <p class="name">${counterpartyName || '—'}</p>
        </div>
        <div class="party">
            <p class="label">Buyer (खरीदार)</p>
            <p class="name">AgriEasy Buyer</p>
        </div>
    </div>
    <table>
        <thead>
            <tr>
                <th style="width: 24px;">#</th>
                <th>Commodity</th>
                <th class="num">Bags</th>
                <th class="num">Weight (kg)</th>
                <th class="num">Amount</th>
            </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
    </table>
    <div class="totals">
        <div class="row"><span>Total Bags</span><strong>${result.grandTotalBags}</strong></div>
        <div class="row"><span>Total Weight</span><strong>${formatKg(result.grandTotalWeight)}</strong></div>
        <div class="row grand"><span>Grand Total Payable</span><span>${formatINR(grandTotalAmount)}</span></div>
    </div>
    <div class="signatures">
        <div class="sig"><div class="line"></div><div class="label">Farmer's Signature</div></div>
        <div class="sig"><div class="line"></div><div class="label">Buyer's Signature</div></div>
    </div>
    <div class="footer">
        Generated by <strong>AgriEasy</strong> · Jai Jawan, Jai Kisan 🇮🇳<br>
        <span style="opacity: 0.7;">This is a computer-generated receipt from the AgriEasy Bill Calculator.</span>
    </div>
</div>
<div class="no-print" style="text-align: center; margin-top: 16px;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #AC3B61; color: #fff; border: none; border-radius: 8; font-size: 14px; font-weight: 700; cursor: pointer;">🖨️ Print Receipt</button>
</div>
<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
</body>
</html>`

        const printWin = window.open('', '_blank', 'width=700,height=900')
        if (!printWin) {
            alert('Please allow pop-ups to print the receipt.')
            return
        }
        printWin.document.open()
        printWin.document.write(html)
        printWin.document.close()
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
                    Upload a bill photo — we'll read every batch (10 bags + weight per row), sum the bags and weights per commodity, multiply by your stored rates, and give the total amount to pay.
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
                                <p style={{ color: palette.muted, fontSize: '0.76rem', margin: '8px 0 0' }}>Reads batch rows (e.g. <strong>10 bags · 510 kg</strong>) — Hindi/Devanagari digits + fractions auto-converted to decimal kg</p>
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
                            <span>OCR-extracting batch rows (bag count + weight per row), converting Devanagari digits + fractions to decimal kg…</span>
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
                                <p style={{ color: palette.text, fontSize: '1.5rem', fontWeight: 800, margin: '4px 0 0' }}>{result.grandTotalBags}</p>
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                        <div>
                                            <p style={{ color: palette.text, fontWeight: 800, fontSize: '1.05rem', margin: 0 }}>
                                                {c.name} {c.nameEn && c.nameEn !== c.name && <span style={{ color: palette.muted, fontWeight: 600, fontSize: '0.86rem' }}>({c.nameEn})</span>}
                                            </p>
                                            <p style={{ color: palette.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>
                                                <strong style={{ color: palette.text }}>{c.totalBags}</strong> bags · <strong style={{ color: palette.text }}>{formatKg(c.totalWeight)}</strong>
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: palette.muted, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Amount</p>
                                            <p style={{ color: palette.primary, fontSize: '1.3rem', fontWeight: 800, margin: '2px 0 0' }}>{formatINR(c.amount)}</p>
                                        </div>
                                    </div>

                                    {/* Batches table */}
                                    <div style={{ borderTop: `1px solid ${palette.borderLight}`, paddingTop: 10, marginBottom: 12 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</span>
                                            <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bags in batch</span>
                                            <span style={{ fontSize: '0.66rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weight (kg)</span>
                                            <span></span>
                                        </div>
                                        {c.batches.map((b, j) => (
                                            <div key={j} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                                <span style={{ color: palette.muted, fontSize: '0.78rem', fontWeight: 600 }}>{j + 1}</span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="0"
                                                    value={b.bagCount}
                                                    onChange={(e) => updateBatch(i, j, 'bagCount', e.target.value)}
                                                    style={{
                                                        padding: '6px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 6,
                                                        fontSize: '0.84rem', color: palette.text, background: palette.white,
                                                        outline: 'none', fontFamily: SHARED.font, width: '100%',
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.001"
                                                    min="0"
                                                    value={b.weight}
                                                    onChange={(e) => updateBatch(i, j, 'weight', e.target.value)}
                                                    style={{
                                                        padding: '6px 10px', border: `1.5px solid ${palette.border}`, borderRadius: 6,
                                                        fontSize: '0.84rem', color: palette.text, background: palette.white,
                                                        outline: 'none', fontFamily: SHARED.font, width: '100%',
                                                    }}
                                                />
                                                <button
                                                    onClick={() => removeBatch(i, j)}
                                                    disabled={c.batches.length <= 1}
                                                    style={{
                                                        background: 'transparent', border: 'none', color: '#dc2626',
                                                        cursor: c.batches.length <= 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: '1rem', padding: 0, opacity: c.batches.length <= 1 ? 0.3 : 1,
                                                    }}
                                                    title="Remove batch"
                                                >✕</button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => addBatch(i)}
                                            style={{
                                                marginTop: 4, background: palette.primaryLight, color: palette.primary,
                                                border: `1px dashed ${palette.primary}`, borderRadius: 6,
                                                padding: '5px 10px', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                                            }}
                                        >+ Add batch</button>
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
                                        <span style={{ color: palette.muted, fontSize: '0.78rem', marginLeft: 'auto' }}>
                                            = <strong style={{ color: palette.primary }}>{formatINR(c.amount)}</strong>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Counterparty + actions */}
                        <div style={{ marginTop: 20, padding: 16, background: palette.white, border: `1px solid ${palette.borderLight}`, borderRadius: 12, boxShadow: SHARED.shadowMd }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: palette.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                Farmer name (for receipt)
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
                                    onClick={printReceipt}
                                    disabled={grandTotalAmount <= 0}
                                    style={{
                                        flex: 1, minWidth: 140, padding: '12px 20px',
                                        background: grandTotalAmount <= 0 ? palette.muted : '#123C69',
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        fontSize: '0.92rem', fontWeight: 700, cursor: grandTotalAmount <= 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    🖨️ Print Receipt
                                </button>
                                <button
                                    onClick={saveToLedger}
                                    disabled={saving || grandTotalAmount <= 0}
                                    style={{
                                        flex: 1, minWidth: 140, padding: '12px 20px',
                                        background: saving || grandTotalAmount <= 0 ? palette.muted : palette.primary,
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        fontSize: '0.92rem', fontWeight: 700, cursor: saving || grandTotalAmount <= 0 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {saving ? 'Saving…' : '💾 Save to Ledger'}
                                </button>
                                <button
                                    onClick={() => { setResult(null); setFile(null); setPreviewUrl(''); setRates({}); setSaveMsg(''); setError(''); setBillPhotoUrl('') }}
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
