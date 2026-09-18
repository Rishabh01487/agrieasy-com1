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
  { href: '/agripay', title: 'EasyPay', sub: 'Pay & transfer', color: '#E98074' },
  { href: '/agrisocial', title: 'AgriSocial', sub: 'Feed & reels', color: '#3D52A0' },
  { href: '/ledger', title: 'Ledger', sub: 'Bills & earnings', color: '#262B20' },
]

const COMING_SOON = new Set<string>()

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
void HARVEST_STEPS  // kept for reference; the step card has been removed per user request

export default function NewHomePage() {
  const [seedsCount, setSeedsCount] = useState(12480)
  const [currentTime, setCurrentTime] = useState('')

  // Animate the "SEEDS IN MOTION" counter
  useEffect(() => {
    const interval = setInterval(() => {
      setSeedsCount(prev => prev + Math.floor(Math.random() * 3))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Live clock for the "route pulse" indicator (top-right)
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      setCurrentTime(`${h}:${m}`)
    }
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
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

      {/* ─── Agricultural photographs (matches Replit reference) ───
          These are positioned absolutely at the bottom of the page and give
          the home page the "Harvest Flow" feel from the reference video.
          Hidden on mobile (small screens) to avoid clutter — the step card
          is the primary animation there. */}

      {/* Farmer in field — bottom-left */}
      <img
        src="/agrieasy-motion/agrieasy_farmer_field.png"
        alt="Farmer in field"
        className="agri-photo agri-photo-farmer"
        style={{
          position: 'absolute', bottom: '4%', left: '3%',
          width: '18vw', maxWidth: 255, minWidth: 125,
          objectFit: 'contain', pointerEvents: 'none', zIndex: 3,
          filter: 'drop-shadow(0 18px 16px rgba(46,55,33,0.18))',
          transform: 'translateX(2vw) translateY(-0.5vh) scale(0.94)',
          opacity: 0.85,
        }}
      />

      {/* Loading crew with truck — bottom-right-center */}
      <img
        src="/agrieasy-motion/agrieasy_loading_crew.png"
        alt="Loading crew"
        className="agri-photo agri-photo-crew"
        style={{
          position: 'absolute', bottom: '4%', right: '17%',
          width: '22vw', maxWidth: 330, minWidth: 170,
          objectFit: 'contain', pointerEvents: 'none', zIndex: 3,
          filter: 'drop-shadow(0 18px 16px rgba(46,55,33,0.18))',
        }}
      />

      {/* Buyer at scale — bottom-far-right */}
      <img
        src="/agrieasy-motion/agrieasy_buyer_scale.png"
        alt="Buyer at scale"
        className="agri-photo agri-photo-buyer"
        style={{
          position: 'absolute', bottom: '11%', right: '3%',
          width: '16vw', maxWidth: 235, minWidth: 120,
          objectFit: 'contain', pointerEvents: 'none', zIndex: 3,
          filter: 'drop-shadow(0 18px 16px rgba(46,55,33,0.18))',
          transform: 'translateX(-1vw) scale(0.95)',
          opacity: 0.88,
        }}
      />

      {/* ─── Route pulse clock (top-right, matches reference) ─── */}
      <div className="route-pulse-clock" style={{
        position: 'absolute', top: '5%', right: '3%',
        zIndex: 5, textAlign: 'right', pointerEvents: 'none',
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      }}>
        <p style={{
          margin: 0, fontSize: 'clamp(1rem, 1.8vw, 1.5rem)',
          fontWeight: 700, color: '#273b2c', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{currentTime || '06:42'}</p>
        <p style={{
          margin: '4px 0 0', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(39,59,44,0.55)',
        }}>route pulse</p>
      </div>

      {/* ─── Dotted route line connecting farmer → crew → buyer ─── */}
      <svg
        aria-hidden
        className="route-line-svg"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 2,
        }}
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
      >
        <path
          d="M 100 744 C 260 625 355 705 470 575 S 710 480 845 560 S 1060 580 1240 432 S 1390 330 1530 255"
          fill="none"
          stroke="rgba(39,59,44,0.22)"
          strokeWidth="3"
          strokeDasharray="2 14"
          strokeLinecap="round"
          className="route-line"
        />
        <path
          d="M 130 774 C 335 690 402 754 571 640 S 766 500 910 572 S 1125 598 1303 463"
          fill="none"
          stroke="#d17d48"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.52"
          className="route-line"
        />
        {/* Route dots */}
        <circle cx="100" cy="744" r="7" fill="#273b2c" opacity="0.55" className="route-dot" />
        <circle cx="470" cy="575" r="7" fill="#273b2c" opacity="0.55" className="route-dot" />
        <circle cx="845" cy="560" r="11" fill="#e3874d" opacity="1" className="route-dot" />
        <circle cx="1240" cy="432" r="7" fill="#273b2c" opacity="0.55" className="route-dot" />
        <circle cx="1530" cy="255" r="7" fill="#273b2c" opacity="0.55" className="route-dot" />
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
        padding: '16px 16px 120px',
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

      {/* Responsive: show ₹ tags on desktop only */}
      <style>{`
        .rupee-tag { display: none; } .hide-mobile { display: inline; } @media (max-width: 480px) { .hide-mobile { display: none; } }
        @media (min-width: 768px) { .rupee-tag { display: block; } }

        /* ── Agricultural photos — responsive ── */
        /* Desktop: full size, all 3 photos visible */
        /* Tablet: smaller, still visible */
        @media (max-width: 768px) {
          .agri-photo-farmer {
            width: 22vw !important;
            max-width: 180px !important;
            opacity: 0.7 !important;
          }
          .agri-photo-crew {
            width: 26vw !important;
            max-width: 240px !important;
            right: 14% !important;
          }
          .agri-photo-buyer {
            width: 20vw !important;
            max-width: 180px !important;
            opacity: 0.75 !important;
          }
          .route-pulse-clock p:first-child {
            font-size: 1rem !important;
          }
        }

        /* Mobile: show photos at smaller size + reposition so they don't
           overlap the main content. Route line + clock stay hidden on phones
           (too cluttered), but the 3 photos are visible. */
        @media (max-width: 640px) {
          .agri-photo-farmer {
            width: 28vw !important;
            max-width: 110px !important;
            bottom: 2% !important;
            left: 2% !important;
            opacity: 0.8 !important;
            z-index: 1 !important;
          }
          .agri-photo-crew {
            width: 36vw !important;
            max-width: 150px !important;
            bottom: 2% !important;
            right: 2% !important;
            z-index: 1 !important;
          }
          .agri-photo-buyer {
            display: none !important;
          }
          .route-line-svg {
            display: none !important;
          }
          .route-pulse-clock {
            display: none !important;
          }
        }

        /* ── Route line animation (dashed line flowing) ── */
        @keyframes routeFlow {
          to { stroke-dashoffset: -32; }
        }
        .route-line {
          animation: routeFlow 2.5s linear infinite;
        }

        /* ── Route dots pulse ── */
        @keyframes routeDotPulse {
          0%, 100% { opacity: 0.55; r: 7; }
          50%      { opacity: 1; r: 9; }
        }
        .route-dot {
          animation: routeDotPulse 2.5s ease-in-out infinite;
          transform-origin: center;
        }
        .route-dot[fill="#e3874d"] {
          animation-delay: 0.6s;
        }

        /* ── Cloud drift (existing background clouds already have this class) ── */
        @keyframes cloudDrift {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(40px); }
          100% { transform: translateX(0); }
        }

        /* ── Field breathe (green hill at bottom) ── */
        @keyframes fieldBreathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50%      { transform: scale(1.04); opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}
