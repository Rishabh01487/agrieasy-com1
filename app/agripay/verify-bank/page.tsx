'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669', red: '#dc2626', gold: '#d97706',
}

const BANKS = [
    { name: 'State Bank of India', short: 'SBI', icon: '🏦', color: '#1a3bb5' },
    { name: 'HDFC Bank', short: 'HDFC', icon: '🏛️', color: '#004C8F' },
    { name: 'ICICI Bank', short: 'ICICI', icon: '🏦', color: '#F58220' },
    { name: 'Punjab National Bank', short: 'PNB', icon: '🏛️', color: '#c0392b' },
    { name: 'Bank of Baroda', short: 'BOB', icon: '🏦', color: '#f39200' },
    { name: 'Canara Bank', short: 'CANARA', icon: '🏦', color: '#004B8D' },
    { name: 'Axis Bank', short: 'AXIS', icon: '🏛️', color: '#97144D' },
    { name: 'Kotak Mahindra Bank', short: 'KOTAK', icon: '🏦', color: '#EF3E42' },
    { name: 'IndusInd Bank', short: 'INDUS', icon: '🏦', color: '#2B5596' },
    { name: 'Yes Bank', short: 'YES', icon: '🏛️', color: '#073F84' },
    { name: 'Union Bank of India', short: 'UNION', icon: '🏦', color: '#003066' },
    { name: 'IDBI Bank', short: 'IDBI', icon: '🏦', color: '#c00' },
]

interface BankStatus {
    bankVerified: boolean
    bankName?: string
    bankHolder?: string
    accountNumberMasked?: string
    ifscCode?: string
}

export default function VerifyBank() {
    const router = useRouter()
    const [selectedBank, setSelectedBank] = useState<null | typeof BANKS[0]>(null)
    const [accountNumber, setAccountNumber] = useState('')
    const [confirmAccount, setConfirmAccount] = useState('')
    const [ifscCode, setIfscCode] = useState('')
    const [bankHolder, setBankHolder] = useState('')
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [existing, setExisting] = useState<BankStatus | null>(null)
    const [step, setStep] = useState<'select' | 'details'>('select')

    useEffect(() => {
        const load = async () => {
            const userId = localStorage.getItem('userId')
            if (!userId) { setPageLoading(false); return }
            try {
                const res = await fetch(`/api/agripay/verify-bank?userId=${userId}`)
                const d = await res.json()
                if (d.bankVerified) setExisting(d)
            } catch (e) { console.error(e) } finally { setPageLoading(false) }
        }
        void load()
    }, [])

    const handleVerify = async () => {
        if (!selectedBank) { setError('Select a bank'); return }
        if (!accountNumber || accountNumber.length < 9) { setError('Enter valid account number (min 9 digits)'); return }
        if (accountNumber !== confirmAccount) { setError('Account numbers do not match'); return }
        if (!ifscCode || ifscCode.length !== 11) { setError('Enter valid 11-character IFSC code'); return }
        if (!bankHolder.trim()) { setError('Enter account holder name'); return }

        setLoading(true); setError('')
        const userId = localStorage.getItem('userId')
        if (!userId) { setError('Not logged in'); setLoading(false); return }

        try {
            const res = await fetch('/api/agripay/verify-bank', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, bankName: selectedBank.name, accountNumber, ifscCode: ifscCode.toUpperCase(), bankHolder }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Verification failed'); setLoading(false); return }
            setSuccess(true)
            setTimeout(() => router.push('/agripay'), 3000)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const inp: React.CSSProperties = {
        width: '100%', padding: '13px 14px', background: C.bg, border: `1.5px solid ${C.border}`,
        borderRadius: '10px', color: C.text, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
        fontFamily: 'monospace',
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Link Bank Account</span>
                </div>
            </nav>

            <div style={{ maxWidth: '600px', margin: '36px auto', padding: '0 24px 40px' }}>

                {/* Already verified */}
                {existing?.bankVerified && !success && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <span style={{ fontSize: '1.5rem' }}>✅</span>
                        <div>
                            <p style={{ color: '#166534', fontWeight: 700, fontSize: '0.95rem', margin: '0 0 4px' }}>Bank Account Linked</p>
                            <p style={{ color: '#166534', fontSize: '0.85rem', margin: '0 0 2px' }}>🏦 {existing.bankName}</p>
                            <p style={{ color: '#166534', fontSize: '0.85rem', margin: '0 0 2px' }}>👤 {existing.bankHolder}</p>
                            <p style={{ color: '#166534', fontSize: '0.85rem', margin: '0 0 2px' }}>🔢 {existing.accountNumberMasked}</p>
                            <p style={{ color: '#166534', fontSize: '0.85rem', margin: 0 }}>🏷️ IFSC: {existing.ifscCode}</p>
                        </div>
                    </div>
                )}

                {success ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${C.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏦</div>
                        <h2 style={{ color: C.green, fontWeight: 800, margin: '0 0 8px' }}>Bank Linked Successfully!</h2>
                        <p style={{ color: C.text, fontWeight: 600, margin: '0 0 4px' }}>{selectedBank?.name}</p>
                        <p style={{ color: C.muted, fontSize: '0.875rem' }}>Your bank account is now linked to AgriPay</p>
                    </div>
                ) : pageLoading ? (
                    <p style={{ color: C.muted, textAlign: 'center', padding: '48px' }}>Loading…</p>
                ) : (
                    <>
                        {/* Info banner */}
                        <div style={{ background: C.brLight, border: `1px solid ${C.brMid}`, borderRadius: '14px', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '1.2rem' }}>🔒</span>
                            <div>
                                <p style={{ color: C.brDark, fontWeight: 700, fontSize: '0.875rem', margin: '0 0 3px' }}>Safe & Secure</p>
                                <p style={{ color: C.brinjal, fontSize: '0.8rem', margin: 0 }}>Your bank details are encrypted and stored securely. This enables you to add money using Net Banking and get higher limits.</p>
                            </div>
                        </div>

                        {/* Step 1: Select Bank */}
                        {step === 'select' && (
                            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                                <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: '0 0 6px', color: C.brDark }}>🏦 Select Your Bank</h2>
                                <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 20px' }}>Choose the bank where you have your savings or current account</p>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
                                    {BANKS.map(b => (
                                        <button key={b.short} onClick={() => setSelectedBank(b)}
                                            style={{ padding: '14px 16px', background: selectedBank?.short === b.short ? C.brLight : C.bg, border: `2px solid ${selectedBank?.short === b.short ? C.brinjal : C.border}`, borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{b.icon}</span>
                                            <div>
                                                <p style={{ color: selectedBank?.short === b.short ? C.brinjal : C.text, fontWeight: 700, fontSize: '0.82rem', margin: '0 0 2px' }}>{b.name}</p>
                                                <p style={{ color: C.muted, fontSize: '0.7rem', margin: 0 }}>{b.short}</p>
                                            </div>
                                            {selectedBank?.short === b.short && <span style={{ marginLeft: 'auto', color: C.brinjal, fontSize: '1rem' }}>✓</span>}
                                        </button>
                                    ))}
                                </div>

                                <button onClick={() => { if (!selectedBank) { setError('Select a bank first'); return } setError(''); setStep('details') }}
                                    style={{ width: '100%', padding: '14px', background: selectedBank ? C.brinjal : C.brMid, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: selectedBank ? 'pointer' : 'not-allowed' }}>
                                    {selectedBank ? `Continue with ${selectedBank.short} →` : 'Select a bank to continue'}
                                </button>
                                {error && <p style={{ color: C.red, fontWeight: 600, fontSize: '0.85rem', marginTop: '10px' }}>⚠️ {error}</p>}
                            </div>
                        )}

                        {/* Step 2: Account details */}
                        {step === 'details' && (
                            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                                {/* Selected bank header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '14px 16px', background: C.brLight, borderRadius: '12px', border: `1px solid ${C.brMid}` }}>
                                    <span style={{ fontSize: '1.5rem' }}>{selectedBank?.icon}</span>
                                    <div>
                                        <p style={{ color: C.brDark, fontWeight: 800, margin: 0, fontSize: '0.95rem' }}>{selectedBank?.name}</p>
                                        <p style={{ color: C.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>{selectedBank?.short}</p>
                                    </div>
                                    <button onClick={() => { setStep('select'); setError('') }} style={{ marginLeft: 'auto', color: C.brinjal, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Change</button>
                                </div>

                                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', margin: '0 0 20px', color: C.brDark }}>Enter Account Details</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Holder Name</label>
                                        <input
                                            type="text" value={bankHolder} onChange={e => setBankHolder(e.target.value)}
                                            placeholder="As it appears on your bank passbook"
                                            style={{ ...inp, fontFamily: '"Inter","Segoe UI",sans-serif', textTransform: 'uppercase' }}
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Account Number</label>
                                        <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Enter your bank account number" style={inp} maxLength={18} />
                                        <p style={{ color: C.muted, fontSize: '0.72rem', margin: '4px 0 0' }}>9 to 18 digits</p>
                                    </div>

                                    <div>
                                        <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirm Account Number</label>
                                        <input type="text" value={confirmAccount} onChange={e => setConfirmAccount(e.target.value.replace(/\D/g, ''))}
                                            placeholder="Re-enter account number" style={{ ...inp, borderColor: confirmAccount && confirmAccount !== accountNumber ? C.red : C.border }} maxLength={18} />
                                        {confirmAccount && confirmAccount !== accountNumber && (
                                            <p style={{ color: C.red, fontSize: '0.78rem', margin: '4px 0 0', fontWeight: 600 }}>Account numbers do not match</p>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>IFSC Code</label>
                                        <input type="text" value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())}
                                            placeholder="e.g., SBIN0001234" style={inp} maxLength={11} />
                                        <p style={{ color: C.muted, fontSize: '0.72rem', margin: '4px 0 0' }}>11-character code printed on your cheque or passbook</p>
                                    </div>
                                </div>

                                {/* IFSC preview */}
                                {ifscCode.length >= 4 && (
                                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', marginTop: '12px' }}>
                                        <p style={{ color: C.muted, fontSize: '0.75rem', margin: '0 0 3px' }}>Bank from IFSC:</p>
                                        <p style={{ color: C.brDark, fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>
                                            {ifscCode.startsWith('SBIN') ? 'State Bank of India' :
                                                ifscCode.startsWith('HDFC') ? 'HDFC Bank' :
                                                    ifscCode.startsWith('ICIC') ? 'ICICI Bank' :
                                                        ifscCode.startsWith('PUNB') ? 'Punjab National Bank' :
                                                            ifscCode.startsWith('BARB') ? 'Bank of Baroda' :
                                                                ifscCode.startsWith('CNRB') ? 'Canara Bank' :
                                                                    ifscCode.startsWith('UTIB') ? 'Axis Bank' :
                                                                        ifscCode.startsWith('KKBK') ? 'Kotak Mahindra Bank' :
                                                                            ifscCode.startsWith('INDB') ? 'IndusInd Bank' :
                                                                                ifscCode.startsWith('YESB') ? 'Yes Bank' :
                                                                                    selectedBank?.name || 'Please verify the code'}
                                        </p>
                                    </div>
                                )}

                                {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginTop: '16px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                                <button onClick={handleVerify} disabled={loading}
                                    style={{ width: '100%', padding: '15px', background: C.brinjal, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', marginTop: '20px', opacity: loading ? 0.7 : 1 }}>
                                    {loading ? '🔄 Verifying…' : '🏦 Link Bank Account'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            <style>{`input:focus { border-color: ${C.brinjal} !important; }`}</style>
        </div>
    )
}
