'use client'

import Link from 'next/link'
import { CardIcon } from './CardIcons'

interface FeatureCard {
  href: string
  title: string
  sub: string
  color: string
}

const COMING_SOON = new Set(['EasyPay'])

/**
 * Renders the home-page secondary feature cards as a CLIENT component so
 * that "Coming Soon" cards can use an onClick handler to prevent
 * navigation. The parent page (app/page.tsx) is a Server Component and
 * cannot pass event handlers to Link — this extraction keeps the home
 * page server-rendered for SEO while letting us intercept taps.
 */
export default function FeatureCards({ cards }: { cards: FeatureCard[] }) {
  return (
    <>
      {cards.map((c, i) => {
        const isComingSoon = COMING_SOON.has(c.title)
        return (
          <Link
            key={c.title}
            href={isComingSoon ? '#' : c.href}
            onClick={isComingSoon ? (e) => { e.preventDefault() } : undefined}
            aria-disabled={isComingSoon}
            className={`home-card-sm fade-up${c.title === 'Bill Calculator' ? ' home-card-feat' : ''}`}
            style={{
              background: c.title === 'Bill Calculator' ? 'linear-gradient(135deg, rgba(49,55,43,0.10), rgba(74,82,64,0.10))' : 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: c.title === 'Bill Calculator' ? '1.5px solid rgba(49,55,43,0.35)' : '1px solid rgba(49,55,43,0.10)',
              borderRadius: 12, padding: '14px 8px', textAlign: 'center',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
              transition: 'transform .3s, background .2s, box-shadow .2s',
              animationDelay: `${0.28 + i * 0.06}s`,
              position: 'relative',
              opacity: isComingSoon ? 0.75 : 1,
              cursor: isComingSoon ? 'not-allowed' : 'pointer',
            }}
          >
            {c.title === 'Bill Calculator' && (
              <span style={{ position: 'absolute', top: -7, right: -3, background: '#31372B', color: '#fff', fontSize: '0.56rem', fontWeight: 800, padding: '2px 6px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(49,55,43,0.3)' }}>NEW</span>
            )}
            {isComingSoon && (
              <span style={{ position: 'absolute', top: -7, right: -3, background: '#E98074', color: '#fff', fontSize: '0.56rem', fontWeight: 800, padding: '2px 6px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(233,128,116,0.4)' }}>SOON</span>
            )}
            <div style={{
              width: 44, height: 44, borderRadius: 12, marginBottom: 6,
              background: `${c.color}12`, border: `1px solid ${c.color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CardIcon name={isComingSoon ? 'EasyPay' : c.title} size={28} color={c.color} />
            </div>
            <p style={{ color: '#31372B', fontWeight: 700, fontSize: '0.78rem', margin: 0 }}>{c.title}</p>
            <p style={{ color: '#6B6E5A', fontSize: '0.64rem', opacity: 0.75, margin: '2px 0 0' }}>{isComingSoon ? 'Coming soon' : c.sub}</p>
          </Link>
        )
      })}
    </>
  )
}
