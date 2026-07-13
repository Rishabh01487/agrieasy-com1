'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isBetaUser, setBetaAccess, clearBetaAccess, FEATURE_FLAGS, isFeatureEnabled, setFeatureOverride, getFeatureOverrides, type FeatureFlag } from '@/lib/feature-flags'
import { AUTH, SHARED, inputStyle, labelStyle } from '@/lib/styles'

export default function BetaPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [betaActive, setBetaActive] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setBetaActive(isBetaUser())
    setOverrides(getFeatureOverrides())
  }, [])

  const handleRedeem = () => {
    setError(''); setSuccess('')
    if (!code.trim()) { setError('Enter a beta invite code'); return }
    if (setBetaAccess(code.trim())) {
      setBetaActive(true)
      setSuccess('Beta access unlocked! All features are now available.')
      setTimeout(() => setSuccess(''), 3000)
    } else {
      setError('Invalid beta code. Check with the team for a valid invite.')
    }
  }

  const handleClear = () => {
    clearBetaAccess()
    setBetaActive(false)
    setSuccess('Beta access removed.')
    setTimeout(() => setSuccess(''), 2000)
  }

  const toggleFlag = (flag: FeatureFlag, enabled: boolean) => {
    setFeatureOverride(flag, enabled)
    setOverrides(getFeatureOverrides())
  }

  const inp = inputStyle({ border: AUTH.border, text: AUTH.text, bg: '#faf5ff' })
  const lbl = labelStyle({ text: AUTH.text, muted: AUTH.muted })

  return (
    <div style={{ minHeight: '100vh', background: AUTH.bg, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', fontFamily: SHARED.font }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <Link href="/" style={{ color: AUTH.muted, textDecoration: 'none', fontSize: '0.85rem', display: 'block', marginBottom: 20 }}>← Back to home</Link>

        <div style={{ background: AUTH.white, borderRadius: 20, padding: 32, boxShadow: SHARED.shadowXl, border: `1px solid ${AUTH.border}` }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: AUTH.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', margin: '0 auto 12px' }}>🧪</div>
            <h1 style={{ color: AUTH.text, fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Beta Testing</h1>
            <p style={{ color: AUTH.muted, fontSize: '0.9rem', margin: '6px 0 0' }}>
              Unlock beta features and manage feature flags for testing.
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: '0.86rem', fontWeight: 600 }}>⚠️ {error}</div>
          )}
          {success && (
            <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#065f46', fontSize: '0.86rem', fontWeight: 600 }}>✅ {success}</div>
          )}

          {!betaActive ? (
            <div>
              <label style={lbl}>Beta Invite Code</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="Enter your beta code" style={inp} />
              <button onClick={handleRedeem} style={{ width: '100%', marginTop: 14, padding: 12, background: AUTH.gradient, color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
                🔓 Unlock Beta
              </button>
              <p style={{ color: AUTH.muted, fontSize: '0.78rem', textAlign: 'center', margin: '14px 0 0' }}>
                Don&apos;t have a code? Contact the AgriEasy team for a beta invite.
              </p>
            </div>
          ) : (
            <div>
              <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>✅</span>
                <div>
                  <p style={{ margin: 0, color: '#065f46', fontWeight: 700, fontSize: '0.9rem' }}>Beta access active</p>
                  <p style={{ margin: '2px 0 0', color: '#065f46', fontSize: '0.78rem' }}>All beta features are unlocked.</p>
                </div>
              </div>

              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: AUTH.text, margin: '0 0 12px' }}>Feature Flags</h2>
              <p style={{ color: AUTH.muted, fontSize: '0.78rem', margin: '0 0 14px' }}>Toggle features on/off for testing. These overrides are stored in your browser only.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.keys(FEATURE_FLAGS) as FeatureFlag[]).map(flag => {
                  const config = FEATURE_FLAGS[flag]
                  const overridden = overrides[flag] !== undefined
                  const enabled = overridden ? overrides[flag] : config.defaultEnabled
                  return (
                    <div key={flag} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: overridden ? '#eff6ff' : '#f8fafc', borderRadius: 10, border: `1px solid ${overridden ? '#bfdbfe' : '#e2e8f0'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: AUTH.text }}>
                          {flag.replace(/_/g, ' ')}
                          {config.betaOnly && <span style={{ marginLeft: 6, background: '#fef3c7', color: '#92400e', fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>BETA</span>}
                          {overridden && <span style={{ marginLeft: 6, background: '#dbeafe', color: '#1e40af', fontSize: '0.62rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>OVERRIDE</span>}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: AUTH.muted }}>{config.description}</p>
                      </div>
                      <button
                        onClick={() => toggleFlag(flag, !enabled)}
                        style={{
                          width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: enabled ? '#AC3B61' : '#cbd5e1', position: 'relative', flexShrink: 0,
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: 3, left: enabled ? 21 : 3,
                          width: 20, height: 20, borderRadius: '50%', background: '#fff',
                          transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button onClick={handleClear} style={{ width: '100%', marginTop: 20, padding: 10, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer' }}>
                🚪 Remove Beta Access
              </button>
            </div>
          )}
        </div>

        <div style={{ background: AUTH.white, borderRadius: 16, padding: 20, marginTop: 16, boxShadow: SHARED.shadow, border: `1px solid ${AUTH.border}` }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.92rem', fontWeight: 800, color: AUTH.text }}>📋 How to test</h3>
          <ol style={{ margin: 0, paddingLeft: 18, color: AUTH.muted, fontSize: '0.82rem', lineHeight: 1.7 }}>
            <li>Register as a <strong>buyer</strong> → add commodities with prices → check the dashboard</li>
            <li>Register as a <strong>farmer</strong> → set your location → search buyers nearby → book a sale</li>
            <li>Register as a <strong>transporter</strong> → add a vehicle → accept bookings → dispatch with live tracking</li>
            <li>As the buyer, confirm the booking → mark delivered → bill & pay the farmer via AgriPay</li>
            <li>Toggle feature flags above to test with/without specific features</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
