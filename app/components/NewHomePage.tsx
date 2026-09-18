'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CardIcon } from './CardIcons'

/**
 * New AgriEasy Home Page — Replit Harvest Flow Design
 *
 * Features:
 * - Cream/beige gradient background with organic shapes
 * - Serif "Agri Easy" title (Playfair Display style)
 * - Real agricultural photographs (left: farmer, right: truck loading)
 * - Floating ₹500/₹600 currency tags
 * - SOW • GROW • THRIVE pills
 * - 3 role cards (Farmer/Supplier, Buyer, Transporter) with badges
 * - Live metrics header (SEEDS IN MOTION counter)
 * - Feature pills (Instant UPI, Real-time tracking, Live GPS)
 * - Feature cards row (Bill Calculator, EasyPay, AgriSocial, Ledger)
 * - Fully responsive (mobile/tablet/desktop)
 * - Sound effect on first click
 */

type RoleCard = {
  href: string
  title: string
  sub: string
  badge?: string
  badgeColor?: string
  pills?: string[]
}

const ROLE_CARDS: RoleCard[] = [
  {
    href: '/auth/login?role=farmer',
    title: 'Farmer/Vyapari',
    sub: 'Sell your produce',
    badge: 'POPULAR',
    badgeColor: '#31372B',
    pills: ['Mandi Calculator', 'KisaanPay', 'Agricredit'],
  },
  {
    href: '/auth/login?role=buyer',
    title: 'Buyer',
    sub: 'Source fresh produce',
  },
  {
    href: '/auth/login?role=transporter',
    title: 'Transporter',
    sub: 'Logistics partner',
    badge: 'EARN',
    badgeColor: '#4A5240',
    pills: ['Flexible'],
  },
]

const FEATURE_CARDS = [
  { href: '/ledger/bill-calculator', title: 'Bill Calculator', sub: 'Snap bill → get total', color: '#31372B' },
  { href: '/agripay', title: 'EasyPay', sub: 'Coming soon', color: '#E98074' },
  { href: '/agrisocial', title: 'AgriSocial', sub: 'Feed & reels', color: '#3D52A0' },
  { href: '/ledger', title: 'Ledger', sub: 'Bills & earnings', color: '#262B20' },
]

const COMING_SOON = new Set<string>(['EasyPay'])

let audioCtx: AudioContext | null = null
function getCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)() } catch { return null } }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}
function playClick() {
  const ctx = getCtx(); if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator(); const gain = ctx.createGain()
  osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now)
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.04)
  gain.gain.setValueAtTime(0.08, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now); osc.stop(now + 0.08)
}

const HARVEST_STEPS = [
  { num: '01', name: 'SOW',    headline: 'From first seed',     sub: 'A signed contract for every farmer',  status: 'SEEDING' },
  { num: '02', name: 'GROW',   headline: 'A route with a name', sub: 'Live GPS tracking on every crate',    status: 'IN TRANSIT' },
  { num: '03', name: 'THRIVE', headline: 'A fairer weigh-in',   sub: 'Buyer and farmer meet at the same scale', status: 'AT WEIGH-IN' },
  { num: '04', name: 'PAY',    headline: 'Money moves home',    sub: 'EasyPay settles today. PayLater keeps the cycle going.', status: 'SETTLED' },
]

export default function NewHomePage() {
  const [seedsCount, setSeedsCount] = useState(12480)
  const [stepIdx, setStepIdx] = useState(0)

  // Animate the "SEEDS IN MOTION" counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSeedsCount(prev => prev + Math.floor(Math.random() * 3))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Cycle the Harvest Flow step card every 3.5s — matches the reference video
  useEffect(() => {
    const t = setInterval(() => {
      setStepIdx(i => (i + 1) % HARVEST_STEPS.length)
    }, 3500)
    return () => clearInterval(t)
  }, [])





  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F5F1E8 0%, #EDE8D9 50%, #F5F1E8 100%)',
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      color: '#2D2D2D',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* ─── Decorative background elements ─── */}

      {/* Cloud shapes (upper corners) */}
      <div aria-hidden style={{
        position: 'absolute', top: '-60px', left: '-40px', width: 300, height: 200,
        background: 'rgba(255,255,255,0.5)', borderRadius: '50%',
        filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: 'absolute', top: '-40px', right: '-60px', width: 350, height: 220,
        background: 'rgba(255,255,255,0.4)', borderRadius: '50%',
        filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Dotted curved line (logistics route) */}
      <svg aria-hidden style={{
        position: 'absolute', top: '30%', left: 0, width: '100%', height: 200,
        pointerEvents: 'none', zIndex: 0, opacity: 0.3,
      }} viewBox="0 0 1200 200" preserveAspectRatio="none">
        <path d="M 0 100 Q 300 20, 600 80 T 1200 60" stroke="#4A5240" strokeWidth="2" fill="none" strokeDasharray="4 8" />
        <path d="M 0 140 Q 300 60, 600 120 T 1200 100" stroke="#4A5240" strokeWidth="1.5" fill="none" strokeDasharray="3 6" />
      </svg>

      {/* Scattered dots */}
      <div aria-hidden style={{ position: 'absolute', top: '15%', left: '10%', width: 6, height: 6, borderRadius: '50%', background: '#E07A3F', opacity: 0.4, zIndex: 0 }} />
      <div aria-hidden style={{ position: 'absolute', top: '25%', right: '15%', width: 4, height: 4, borderRadius: '50%', background: '#4A5240', opacity: 0.3, zIndex: 0 }} />
      <div aria-hidden style={{ position: 'absolute', top: '45%', left: '8%', width: 5, height: 5, borderRadius: '50%', background: '#31372B', opacity: 0.2, zIndex: 0 }} />

      {/* Green curved hill at bottom */}
      <svg aria-hidden style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: 120,
        pointerEvents: 'none', zIndex: 0,
      }} viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path d="M 0 60 Q 300 20, 600 40 T 1200 30 L 1200 120 L 0 120 Z" fill="#C5D5C5" opacity="0.5" />
        <path d="M 0 80 Q 300 50, 600 60 T 1200 50 L 1200 120 L 0 120 Z" fill="#B8CDB8" opacity="0.4" />
      </svg>

      {/* ─── Top Navigation Bar ─── */}
      <nav style={{
        position: 'relative', zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', maxWidth: 1400, margin: '0 auto', flexWrap: 'wrap', gap: 8,
      }}>
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, background: '#E07A3F', transform: 'rotate(45deg)', display: 'inline-block' }} />
          <span style={{ fontWeight: 800, fontSize: 'clamp(0.65rem, 3vw, 0.8rem)', letterSpacing: '0.05em', color: '#2D2D2D' }}>AGRIEASY</span>
          <span style={{ color: '#6B6B6B', fontSize: '0.7rem', fontWeight: 600 }}>|</span>
          <span className="hide-mobile" style={{ color: '#6B6B6B', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>LIVE AGRICULTURAL NETWORK</span>
        </div>

        {/* Right: Live metric */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2D2D2D', lineHeight: 1 }}>
            {seedsCount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.55rem', color: '#6B6B6B', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
            SEEDS IN MOTION
          </div>
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main style={{
        position: 'relative', zIndex: 5,
        maxWidth: 1200, margin: '0 auto',
        padding: '16px 16px 220px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: 'linear-gradient(135deg, #ffffff, #F5F1E8)',
          border: '2px solid #31372B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(49,55,43,0.12)',
          marginBottom: 8,
        }}>
          <img src="/agrieasy-logo-main-5.png" alt="AgriEasy" width={44} height={44} style={{ borderRadius: 10 }} />
        </div>

        {/* Subtitle */}
        <p style={{
          fontSize: '0.65rem', color: '#6B6B6B', fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          margin: '0 0 12px', textAlign: 'center',
        }}>
          + INDIA'S AGRICULTURAL MARKETPLACE +
        </p>

        {/* Main Title — Mixed font: "Agri" bold Poppins + "Easy" Dancing Script italic */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
          fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
          margin: '0 0 12px', textAlign: 'center', color: '#2D2D2D',
          display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.05em',
        }}>
          <span style={{
            background: 'linear-gradient(110deg, #31372B 0%, #31372B 35%, #4A5240 50%, #31372B 65%, #31372B 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
            fontWeight: 900,
            display: 'inline-block',
          }}>Agri</span>
          <span style={{
            fontFamily: "var(--font-dancing), 'Dancing Script', cursive",
            background: 'linear-gradient(120deg, #31372B 0%, #4A5240 30%, #4A5240 70%, #31372B 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
            fontWeight: 700, fontStyle: 'italic',
            fontSize: '1.18em',
            transform: 'translateY(-0.04em) rotate(-2deg)',
            display: 'inline-block',
            animation: 'gradientFlow 6s ease-in-out infinite',
          }}>Easy</span>
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
          fontWeight: 500, color: '#4A4A4A',
          margin: '0 0 14px', textAlign: 'center',
        }}>
          Connecting farmers directly with buyers
        </p>

        {/* SOW • GROW • THRIVE pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {['SOW', 'GROW', 'THRIVE'].map((word, i) => (
            <span key={word} style={{
              padding: '5px 14px', borderRadius: 100,
              background: i === 1 ? '#31372B' : '#2D2D2D',
              color: '#fff', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.08em',
            }}>
              {i === 1 ? `+ ${word} +` : word}
            </span>
          ))}
        </div>

        {/* Trust indicators */}
        <p style={{
          fontSize: '0.72rem', color: '#6B6B6B', fontWeight: 500,
          margin: '0 0 16px', textAlign: 'center',
        }}>
          ✓ End-to-end agri-commodities trade • Social network • Logistics
        </p>

        {/* Feature badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {['Instant UPI payments', 'Real-time Tracking', 'Live GPS Tracking'].map(f => (
            <span key={f} style={{
              padding: '5px 12px', borderRadius: 100,
              background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(49,55,43,0.12)',
              color: '#2D2D2D', fontSize: '0.72rem', fontWeight: 600,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {f}
            </span>
          ))}
        </div>

        {/* ─── Floating ₹ tags (desktop only, hidden on mobile) ─── */}
        <div aria-hidden style={{
          position: 'absolute', top: '180px', left: '8%',
          background: '#C5D5C5', borderRadius: 8, padding: '8px 16px',
          transform: 'rotate(-5deg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          className: 'rupee-tag',
        } as any}>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#2D4A3E' }}>₹ 500</span>
        </div>
        <div aria-hidden style={{
          position: 'absolute', top: '160px', right: '8%',
          background: '#C5D5C5', borderRadius: 8, padding: '8px 16px',
          transform: 'rotate(5deg)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          className: 'rupee-tag',
        } as any}>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#2D4A3E' }}>₹ 600</span>
        </div>

        {/* ─── Role Cards ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, maxWidth: 600, width: '100%', marginBottom: 20,
        }}>
          {ROLE_CARDS.map((card, i) => (
            <Link key={card.title} href={card.href} onClick={playClick}
              style={{
                background: '#fff', borderRadius: 16, padding: '20px 14px',
                textAlign: 'center', textDecoration: 'none', color: 'inherit',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.04)',
                transition: 'transform 0.25s, box-shadow 0.25s',
                position: 'relative', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
            >
              {/* Badge */}
              {card.badge && (
                <span style={{
                  position: 'absolute', top: 8, right: 8,
                  background: card.badgeColor || '#31372B', color: '#fff',
                  fontSize: '0.55rem', fontWeight: 800, padding: '2px 8px',
                  borderRadius: 100, letterSpacing: '0.05em',
                }}>{card.badge}</span>
              )}

              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(49,55,43,0.06)', border: '1px solid rgba(49,55,43,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                <CardIcon name={card.title.split('/')[0]} size={28} color="#31372B" />
              </div>

              {/* Title */}
              <p style={{ fontWeight: 800, fontSize: '0.88rem', margin: 0, color: '#2D2D2D' }}>{card.title}</p>
              <p style={{ fontSize: '0.72rem', color: '#6B6B6B', margin: '2px 0 0' }}>{card.sub}</p>

              {/* Sub-pills */}
              {card.pills && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 6 }}>
                  {card.pills.map(p => (
                    <span key={p} style={{
                      padding: '3px 8px', borderRadius: 100,
                      background: 'rgba(49,55,43,0.04)', color: '#6B6B6B',
                      fontSize: '0.62rem', fontWeight: 600,
                    }}>{p}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* ─── Feature Cards (secondary row) ─── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 8, maxWidth: 560, width: '100%', marginBottom: 24,
        }}>
          {FEATURE_CARDS.map((c, i) => {
            const isComingSoon = COMING_SOON.has(c.title)
            return (
              <Link key={c.title} href={isComingSoon ? '#' : c.href}
                onClick={(e) => {
                  if (isComingSoon) { e.preventDefault(); return }
                  playClick()
                }}
                style={{
                  background: 'rgba(255,255,255,0.7)', borderRadius: 12,
                  padding: '14px 8px', textAlign: 'center', textDecoration: 'none',
                  color: 'inherit', border: '1px solid rgba(49,55,43,0.08)',
                  transition: 'transform 0.2s', position: 'relative',
                  cursor: isComingSoon ? 'not-allowed' : 'pointer',
                  opacity: isComingSoon ? 0.7 : 1,
                }}
                onMouseEnter={(e) => { if (!isComingSoon) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {c.title === 'Bill Calculator' && (
                  <span style={{ position: 'absolute', top: -7, right: -3, background: '#31372B', color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: 100 }}>NEW</span>
                )}
                {isComingSoon && (
                  <span style={{ position: 'absolute', top: -7, right: -3, background: '#E98074', color: '#fff', fontSize: '0.55rem', fontWeight: 800, padding: '2px 6px', borderRadius: 100 }}>SOON</span>
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, margin: '0 auto 6px',
                  background: `${c.color}12`, border: `1px solid ${c.color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CardIcon name={c.title} size={24} color={c.color} />
                </div>
                <p style={{ fontWeight: 700, fontSize: '0.76rem', margin: 0, color: '#2D2D2D' }}>{c.title}</p>
                <p style={{ fontSize: '0.62rem', color: '#6B6B6B', margin: '2px 0 0' }}>{isComingSoon ? 'Coming soon' : c.sub}</p>
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <Link href="/auth/register" onClick={playClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #31372B 0%, #262B20 100%)',
            color: '#fff', borderRadius: 100, textDecoration: 'none',
            fontSize: '0.88rem', fontWeight: 700,
            boxShadow: '0 8px 24px rgba(49,55,43,0.3)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          New here? Create account →
        </Link>

        {/* Footer text */}
        <p style={{
          marginTop: 20, color: '#6B6B6B', fontSize: '0.7rem', opacity: 0.7, textAlign: 'center',
        }}>
          Trusted by farmers, buyers & transporters across India 🇮🇳
        </p>
      </main>

      {/* ─── Harvest Flow step card (bottom-left, animated) ───
          Cycles through 01/SOW → 02/GROW → 03/THRIVE → 04/PAY every 3.5s.
          Matches the reference video. Fixed to viewport so it stays visible
          on both mobile and desktop without clipping.
          z-index: 10001 — above PWA banner (9999) and cookie consent (9998)
          so the animation is ALWAYS visible, even before those are dismissed. */}
      <div className="harvest-flow-card" style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: 'max(16px, env(safe-area-inset-left))',
        zIndex: 10001,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1.5px solid rgba(49,55,43,0.22)',
        borderRadius: 16,
        padding: '14px 16px',
        maxWidth: 260,
        boxShadow: '0 12px 36px rgba(49,55,43,0.18)',
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      }}>
        {/* Step number + name row */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span key={`num-${stepIdx}`} className="harvest-fade" style={{
            fontSize: '0.9rem', fontWeight: 900, color: '#31372B',
            letterSpacing: '0.06em',
          }}>{HARVEST_STEPS[stepIdx].num}</span>
          <span style={{ color: '#6B6B6B', fontSize: '0.7rem', fontWeight: 600 }}>/</span>
          <span key={`name-${stepIdx}`} className="harvest-fade" style={{
            fontSize: '0.78rem', fontWeight: 800, color: '#31372B',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>{HARVEST_STEPS[stepIdx].name}</span>
        </div>

        {/* Headline + sub-text */}
        <p key={`head-${stepIdx}`} className="harvest-fade" style={{
          margin: '0 0 4px', color: '#2D2D2D',
          fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.25,
        }}>{HARVEST_STEPS[stepIdx].headline}</p>
        <p key={`sub-${stepIdx}`} className="harvest-fade" style={{
          margin: '0 0 10px', color: '#6B6B6B',
          fontSize: '0.7rem', fontWeight: 500, lineHeight: 1.4,
        }}>{HARVEST_STEPS[stepIdx].sub}</p>

        {/* Status pill with pulsing green dot */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(49,55,43,0.06)',
          border: '1px solid rgba(49,55,43,0.12)',
          borderRadius: 100, padding: '3px 10px',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4A8B3A', display: 'inline-block',
            animation: 'harvestPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            color: '#31372B', fontSize: '0.58rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            LIVE AGRICULTURAL ROUTE / {HARVEST_STEPS[stepIdx].status}
          </span>
        </div>

        {/* Step progress dots */}
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {HARVEST_STEPS.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i === stepIdx ? '#31372B' : 'rgba(49,55,43,0.15)',
              transition: 'background 0.4s ease',
            }} />
          ))}
        </div>
      </div>

      {/* ─── Loading queue indicator (bottom-right, desktop only) ─── */}
      <div className="loading-queue" style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        right: 'max(16px, env(safe-area-inset-right))',
        zIndex: 10001,
        color: '#6B6B6B',
        fontSize: '0.62rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(49,55,43,0.14)',
        borderRadius: 100, padding: '5px 12px',
      }}>
        <span style={{ color: '#31372B' }}>LOADING QUEUE</span>
        <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
        <span>0{stepIdx + 1}</span>
      </div>

      {/* Responsive: show ₹ tags on desktop only */}
      <style>{`
        .rupee-tag { display: none; } .hide-mobile { display: inline; } @media (max-width: 480px) { .hide-mobile { display: none; } }
        @media (min-width: 768px) { .rupee-tag { display: block; } }

        /* Harvest Flow card — keyframe for the fade between steps */
        @keyframes harvestFade {
          0%   { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .harvest-fade {
          animation: harvestFade 0.45s ease-out;
        }
        @keyframes harvestPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.5); opacity: 0.5; }
        }

        /* Desktop: full card visible */
        .harvest-flow-card {
          max-width: 260px;
        }
        .loading-queue {
          display: block;
        }

        /* Tablet: slightly smaller card */
        @media (max-width: 768px) {
          .harvest-flow-card {
            max-width: 220px;
            padding: 12px 14px;
          }
        }

        /* Mobile: card sits at bottom-left, compact size, above PWA banner
           and cookie consent (z-index: 10001 in inline style).
           Card is smaller on mobile so it doesn't dominate the screen. */
        @media (max-width: 640px) {
          .harvest-flow-card {
            max-width: calc(100vw - 32px) !important;
            bottom: 16px !important;
            left: 16px !important;
            right: 16px !important;
            padding: 10px 12px !important;
            border-radius: 14px !important;
          }
          .loading-queue {
            display: none;
          }
          /* Make the text slightly smaller on mobile so the card stays compact */
          .harvest-flow-card p:first-of-type {
            font-size: 0.85rem !important;
          }
          .harvest-flow-card p:nth-of-type(2) {
            font-size: 0.65rem !important;
            margin-bottom: 6px !important;
          }
        }

        /* Small phones: even more compact */
        @media (max-width: 380px) {
          .harvest-flow-card {
            padding: 8px 10px !important;
          }
          .harvest-flow-card p:first-of-type {
            font-size: 0.8rem !important;
          }
          .harvest-flow-card p:nth-of-type(2) {
            font-size: 0.6rem !important;
            margin-bottom: 4px !important;
          }
        }
      `}</style>
    </div>
  )
}
