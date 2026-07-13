'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserInfo, logout } from '@/lib/auth-fetch'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { SHARED } from '@/lib/styles'

export default function SettingsPage() {
  const router = useRouter()
  const { lang, setLang, t } = useLanguage()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const { userRole } = getUserInfo()
    if (!userRole) {
      router.replace('/auth/login')
      return
    }
    setUserRole(userRole)
  }, [router])

  const dashboardHref = userRole ? `/${userRole}/dashboard` : '/'

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: '#0f172a' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        borderBottom: '1px solid #e2e8f0',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <Link href={dashboardHref} style={{ color: '#AC3B61', textDecoration: 'none', fontWeight: 700, fontSize: '0.88rem' }}>← {t('common.back')}</Link>
        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>⚙️ {t('settings.title')}</span>
        <button onClick={logout} style={{ color: '#dc2626', background: '#fee2e2', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>{t('nav.logout')}</button>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 80px' }}>
        {/* Language Section */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20,
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            🌐 {t('settings.language')}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#64748b' }}>
            {lang === 'en' ? 'Choose your preferred language' : 'अपनी पसंदीदा भाषा चुनें'}
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setLang('en')}
              style={{
                flex: 1, padding: '16px 20px', borderRadius: 14,
                border: `2px solid ${lang === 'en' ? '#AC3B61' : '#e2e8f0'}`,
                background: lang === 'en' ? '#eff6ff' : '#fff',
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>🇬🇧</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: lang === 'en' ? '#AC3B61' : '#0f172a' }}>English</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>Default</p>
              </div>
              {lang === 'en' && <span style={{ marginLeft: 'auto', color: '#AC3B61', fontSize: '1.2rem' }}>✓</span>}
            </button>

            <button
              onClick={() => setLang('hi')}
              style={{
                flex: 1, padding: '16px 20px', borderRadius: 14,
                border: `2px solid ${lang === 'hi' ? '#AC3B61' : '#e2e8f0'}`,
                background: lang === 'hi' ? '#eff6ff' : '#fff',
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>🇮🇳</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: lang === 'hi' ? '#AC3B61' : '#0f172a' }}>हिंदी</p>
                <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>Hindi</p>
              </div>
              {lang === 'hi' && <span style={{ marginLeft: 'auto', color: '#AC3B61', fontSize: '1.2rem' }}>✓</span>}
            </button>
          </div>
        </div>

        {/* Quick language toggle — always visible */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20,
          border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
              {lang === 'en' ? 'Quick toggle' : 'त्वरित बदलाव'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              {lang === 'en' ? 'Switch between English and Hindi instantly' : 'अंग्रेज़ी और हिंदी के बीच तुरंत बदलें'}
            </p>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            style={{
              padding: '10px 24px', borderRadius: 100,
              background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 100%)',
              color: '#fff', border: 'none', fontSize: '0.86rem', fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {lang === 'en' ? 'हिंदी में बदलें →' : 'Switch to English →'}
          </button>
        </div>

        {/* About */}
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20,
          border: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            ℹ️ {t('settings.about')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>{t('settings.version')}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>1.0.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>App</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>AgriEasy</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontSize: '0.84rem', color: '#64748b' }}>Made in</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>🇮🇳 India</span>
            </div>
          </div>
        </div>

        {/* Link to dashboard */}
        <Link href={dashboardHref} style={{
          display: 'block', textAlign: 'center', padding: '14px',
          background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 100%)',
          color: '#fff', borderRadius: 14, fontSize: '0.92rem', fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
        }}>
          {t('nav.dashboard')} →
        </Link>
      </div>
    </div>
  )
}
