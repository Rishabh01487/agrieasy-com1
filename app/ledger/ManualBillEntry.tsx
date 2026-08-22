'use client'

/**
 * ManualBillEntry — manual commodity + bag-weight entry that produces the
 * same CalcResult shape as the photo-based BillCalculator.
 *
 * User flow:
 *  1. Add a commodity (name + rate + unit)
 *  2. Enter the total number of bags for that commodity
 *  3. For each bag (1 to N), enter the weight in kg
 *  4. Add more commodities if needed
 *  5. Click "Generate Bill" → produces a CalcResult with all batches grouped
 *     in batches of 10 (matching how the photo OCR outputs data)
 *
 * Why batches of 10? The bill display UI in BillCalculator.tsx renders
 * commodities as a list of batches (bagCount + weight). To stay compatible
 * with that UI without modifying it, we group the per-bag weights into
 * batches of 10 — same as how a real grain merchant's bill looks:
 *   - batch 1: 10 bags, 510 kg
 *   - batch 2: 10 bags, 505 kg
 *   - batch 3:  5 bags, 258 kg   (remainder)
 *
 * Supports unlimited commodities × unlimited bags per commodity.
 */

import { useState } from 'react'
import { BUYER, SHARED } from '@/lib/styles'

interface Batch { bagCount: number; weight: number }
interface CommodityGroup {
    name: string
    nameEn: string
    batches: Batch[]
    totalBags: number
    totalWeight: number
}
interface CalcResult {
    commodities: CommodityGroup[]
    grandTotalBags: number
    grandTotalWeight: number
    rawText: string
}

interface ManualCommodity {
    id: string
    name: string
    rate: string
    unit: 'kg' | 'quintal'
    bagCount: number
    weights: string[]  // per-bag weights as strings (input values)
}

interface ManualBillEntryProps {
    onGenerate: (result: CalcResult) => void
    onCancel?: () => void
}

const BATCH_SIZE = 10

function makeId() {
    return Math.random().toString(36).slice(2, 10)
}

function emptyCommodity(): ManualCommodity {
    return {
        id: makeId(),
        name: '',
        rate: '',
        unit: 'kg',
        bagCount: 1,
        weights: [''],
    }
}

export default function ManualBillEntry({ onGenerate }: ManualBillEntryProps) {
    const [commodities, setCommodities] = useState<ManualCommodity[]>([emptyCommodity()])
    const [counterpartyName, setCounterpartyName] = useState('')
    const palette = BUYER

    // ── Commodity operations ──
    const addCommodity = () => {
        setCommodities(c => [...c, emptyCommodity()])
    }

    const removeCommodity = (id: string) => {
        setCommodities(c => c.length > 1 ? c.filter(x => x.id !== id) : c)
    }

    const updateCommodity = (id: string, field: keyof ManualCommodity, value: any) => {
        setCommodities(c => c.map(x => x.id === id ? { ...x, [field]: value } : x))
    }

    // ── Bag count change — grow/shrink the weights array ──
    const updateBagCount = (id: string, count: number) => {
        const safe = Math.max(1, Math.min(1000, Math.floor(count || 1)))
        setCommodities(c => c.map(x => {
            if (x.id !== id) return x
            const newWeights = [...x.weights]
            if (safe > newWeights.length) {
                // Grow — add empty entries
                for (let i = newWeights.length; i < safe; i++) newWeights.push('')
            } else if (safe < newWeights.length) {
                // Shrink — truncate
                newWeights.length = safe
            }
            return { ...x, bagCount: safe, weights: newWeights }
        }))
    }

    // ── Per-bag weight update ──
    const updateBagWeight = (commodityId: string, bagIndex: number, weight: string) => {
        setCommodities(c => c.map(x => {
            if (x.id !== commodityId) return x
            const newWeights = [...x.weights]
            newWeights[bagIndex] = weight
            return { ...x, weights: newWeights }
        }))
    }

    // ── Batch-fill: set all empty weights to a value ──
    const fillAllWeights = (commodityId: string, value: string) => {
        setCommodities(c => c.map(x => {
            if (x.id !== commodityId) return x
            return { ...x, weights: x.weights.map(() => value) }
        }))
    }

    // ── Generate the bill (CalcResult) ──
    const handleGenerate = () => {
        // Validate: at least one commodity with a name + valid weights
        const validCommodities = commodities.filter(c => c.name.trim() && c.weights.some(w => parseFloat(w) > 0))
        if (validCommodities.length === 0) {
            alert('Please add at least one commodity with a name and at least one bag weight.')
            return
        }

        const groups: CommodityGroup[] = validCommodities.map(c => {
            // Parse all weights to numbers, filter out invalid
            const weights = c.weights
                .map(w => parseFloat(w))
                .filter(w => !isNaN(w) && w > 0)

            // Group into batches of BATCH_SIZE (10)
            const batches: Batch[] = []
            for (let i = 0; i < weights.length; i += BATCH_SIZE) {
                const slice = weights.slice(i, i + BATCH_SIZE)
                const batchWeight = slice.reduce((sum, w) => sum + w, 0)
                batches.push({
                    bagCount: slice.length,
                    weight: Math.round(batchWeight * 1000) / 1000,  // 3 decimal places
                })
            }

            const totalBags = batches.reduce((s, b) => s + b.bagCount, 0)
            const totalWeight = batches.reduce((s, b) => s + b.weight, 0)

            return {
                name: c.name.trim(),
                nameEn: c.name.trim(),  // same as name for manual entry
                batches,
                totalBags,
                totalWeight: Math.round(totalWeight * 1000) / 1000,
            }
        })

        const grandTotalBags = groups.reduce((s, g) => s + g.totalBags, 0)
        const grandTotalWeight = groups.reduce((s, g) => s + g.totalWeight, 0)

        // Build rawText for compatibility with the existing display
        const rawText = groups.map(g => {
            const batchLines = g.batches.map((b, i) => `Batch ${i + 1}: ${b.bagCount} bags, ${b.weight} kg`).join('\n')
            return `${g.name}\n${batchLines}\nTotal: ${g.totalBags} bags, ${g.totalWeight} kg`
        }).join('\n\n')

        // Stash rates + counterparty in window for the parent to pick up
        // (BillCalculator reads rates from its own state, so we pass via a global)
        const ratesMap: Record<number, { rate: string; unit: 'kg' | 'quintal' }> = {}
        validCommodities.forEach((c, i) => {
            ratesMap[i] = { rate: c.rate, unit: c.unit }
        })
        ;(window as any).__manualBillRates = ratesMap
        ;(window as any).__manualBillCounterparty = counterpartyName

        onGenerate({
            commodities: groups,
            grandTotalBags,
            grandTotalWeight: Math.round(grandTotalWeight * 1000) / 1000,
            rawText,
        })
    }

    // ── Live total preview ──
    const liveTotals = commodities.reduce((acc, c) => {
        const weights = c.weights.map(w => parseFloat(w)).filter(w => !isNaN(w) && w > 0)
        acc.bags += weights.length
        acc.weight += weights.reduce((s, w) => s + w, 0)
        return acc
    }, { bags: 0, weight: 0 })

    return (
        <div style={{ fontFamily: SHARED.font }}>
            {/* Header */}
            <div style={{
                background: palette.white, borderRadius: 16, padding: '20px',
                border: `1px solid ${palette.borderLight}`, marginBottom: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.6rem' }}>✍️</span>
                    <div>
                        <h3 style={{ margin: 0, color: palette.text, fontSize: '1.05rem', fontWeight: 700 }}>
                            Manual Bill Entry
                        </h3>
                        <p style={{ margin: '2px 0 0', color: palette.muted, fontSize: '0.78rem' }}>
                            Enter commodity name, bag count, and per-bag weights. Bill auto-calculates.
                        </p>
                    </div>
                </div>
            </div>

            {/* Counterparty name */}
            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: palette.muted, fontSize: '0.78rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Buyer/Seller Name (optional)
                </label>
                <input
                    type="text"
                    value={counterpartyName}
                    onChange={e => setCounterpartyName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    style={{
                        width: '100%', padding: '10px 14px', background: palette.white,
                        border: `1px solid ${palette.border}`, borderRadius: 10,
                        fontSize: '0.92rem', color: palette.text, outline: 'none',
                        fontFamily: SHARED.font,
                    }}
                />
            </div>

            {/* Commodities */}
            {commodities.map((c, cIdx) => {
                const totalWeight = c.weights
                    .map(w => parseFloat(w))
                    .filter(w => !isNaN(w) && w > 0)
                    .reduce((s, w) => s + w, 0)
                const filledCount = c.weights.filter(w => parseFloat(w) > 0).length

                return (
                    <div key={c.id} style={{
                        background: palette.white, borderRadius: 16, padding: 16,
                        border: `1px solid ${palette.borderLight}`, marginBottom: 16,
                    }}>
                        {/* Commodity header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ color: palette.primary, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Commodity #{cIdx + 1}
                            </span>
                            {commodities.length > 1 && (
                                <button
                                    onClick={() => removeCommodity(c.id)}
                                    aria-label="Remove commodity"
                                    style={{
                                        background: '#fee2e2', border: 'none', borderRadius: 6,
                                        padding: '4px 10px', color: '#991b1b', fontSize: '0.75rem',
                                        fontWeight: 700, cursor: 'pointer',
                                    }}
                                >✕ Remove</button>
                            )}
                        </div>

                        {/* Name + rate row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <div>
                                <label style={{ display: 'block', color: palette.muted, fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>Commodity Name</label>
                                <input
                                    type="text"
                                    value={c.name}
                                    onChange={e => updateCommodity(c.id, 'name', e.target.value)}
                                    placeholder="e.g. Wheat, गेहूँ, Rice"
                                    style={inputStyle(palette)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: palette.muted, fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>Rate (₹)</label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.01"
                                    min="0"
                                    value={c.rate}
                                    onChange={e => updateCommodity(c.id, 'rate', e.target.value)}
                                    placeholder="0"
                                    style={inputStyle(palette)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: palette.muted, fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>Per</label>
                                <select
                                    value={c.unit}
                                    onChange={e => updateCommodity(c.id, 'unit', e.target.value as 'kg' | 'quintal')}
                                    style={inputStyle(palette)}
                                >
                                    <option value="kg">kg</option>
                                    <option value="quintal">quintal</option>
                                </select>
                            </div>
                        </div>

                        {/* Bag count + quick-fill */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 140px' }}>
                                <label style={{ display: 'block', color: palette.muted, fontSize: '0.7rem', fontWeight: 700, marginBottom: 4 }}>Number of Bags</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    max="1000"
                                    value={c.bagCount}
                                    onChange={e => updateBagCount(c.id, parseInt(e.target.value || '1', 10))}
                                    style={inputStyle(palette)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {[5, 10, 25, 50].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => updateBagCount(c.id, n)}
                                        style={{
                                            background: palette.bgSub || '#f1f5f9', border: `1px solid ${palette.border}`,
                                            borderRadius: 8, padding: '8px 12px', color: palette.text,
                                            fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                        }}
                                    >{n}</button>
                                ))}
                            </div>
                        </div>

                        {/* Quick-fill all weights */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ color: palette.muted, fontSize: '0.74rem', fontWeight: 600 }}>Quick-fill all bags:</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="0.001"
                                placeholder="weight (kg)"
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        const v = (e.target as HTMLInputElement).value
                                        if (v) fillAllWeights(c.id, v)
                                        ;(e.target as HTMLInputElement).value = ''
                                    }
                                }}
                                style={{
                                    ...inputStyle(palette),
                                    flex: '1 1 120px', maxWidth: 180, padding: '6px 10px', fontSize: '0.82rem',
                                }}
                            />
                            <span style={{ color: palette.muted, fontSize: '0.7rem' }}>press Enter</span>
                        </div>

                        {/* Per-bag weights grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                            gap: 6, maxHeight: 280, overflowY: 'auto', padding: 4,
                            background: palette.bgSub || '#f8fafc', borderRadius: 8,
                        }}>
                            {c.weights.map((w, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <label style={{ color: palette.muted, fontSize: '0.65rem', fontWeight: 700, marginBottom: 2 }}>
                                        Bag {i + 1}
                                    </label>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.001"
                                        min="0"
                                        value={w}
                                        onChange={e => updateBagWeight(c.id, i, e.target.value)}
                                        placeholder="0"
                                        style={{
                                            width: '100%', padding: '6px 4px', textAlign: 'center',
                                            background: palette.white, border: `1px solid ${palette.border}`,
                                            borderRadius: 6, fontSize: '0.78rem', color: palette.text,
                                            outline: 'none', fontFamily: 'monospace',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Per-commodity subtotal */}
                        <div style={{
                            marginTop: 10, padding: '8px 12px', background: palette.bgSub || '#f1f5f9',
                            borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <span style={{ color: palette.muted, fontSize: '0.78rem', fontWeight: 600 }}>
                                {filledCount} of {c.bagCount} bags filled
                            </span>
                            <span style={{ color: palette.text, fontSize: '0.86rem', fontWeight: 800 }}>
                                {totalWeight.toFixed(3)} kg
                            </span>
                        </div>
                    </div>
                )
            })}

            {/* Add commodity button */}
            <button
                onClick={addCommodity}
                style={{
                    width: '100%', padding: '12px 20px', background: palette.white,
                    border: `2px dashed ${palette.primary}`, borderRadius: 12,
                    color: palette.primary, fontSize: '0.9rem', fontWeight: 700,
                    cursor: 'pointer', marginBottom: 16,
                }}
            >+ Add Another Commodity</button>

            {/* Live totals */}
            <div style={{
                background: palette.gradient, color: '#fff', borderRadius: 16, padding: 16,
                marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                        Total Bags
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
                        {liveTotals.bags}
                    </p>
                </div>
                <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>
                        Total Weight
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 800 }}>
                        {liveTotals.weight.toFixed(3)} kg
                    </p>
                </div>
            </div>

            {/* Generate bill button */}
            <button
                onClick={handleGenerate}
                disabled={liveTotals.bags === 0}
                style={{
                    width: '100%', padding: '14px 24px',
                    background: liveTotals.bags > 0 ? palette.primary : palette.muted,
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: '1rem', fontWeight: 700,
                    cursor: liveTotals.bags > 0 ? 'pointer' : 'not-allowed',
                }}
            >📋 Generate Calculated Bill</button>
        </div>
    )
}

function inputStyle(palette: typeof BUYER): React.CSSProperties {
    return {
        width: '100%', padding: '8px 12px', background: palette.white,
        border: `1px solid ${palette.border}`, borderRadius: 8,
        fontSize: '0.88rem', color: palette.text, outline: 'none',
        fontFamily: SHARED.font,
    }
}
