'use client'

import { useState } from 'react'
import { SOCIAL } from '@/lib/styles'
import { shareContent } from '@/lib/share'

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  postUrl: string
  postCaption: string
  mediaUrl?: string
  mediaType?: string
  allowDownload?: boolean
}

export default function ShareSheet({
  isOpen,
  onClose,
  postUrl,
  postCaption,
  mediaUrl,
  mediaType,
  allowDownload = true,
}: ShareSheetProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!isOpen) return null

  const shareText = postCaption
    ? `${postCaption.slice(0, 100)}${postCaption.length > 100 ? '...' : ''}`
    : 'Check this out on AgriEasy!'
  const encodedUrl = encodeURIComponent(postUrl)
  const encodedText = encodeURIComponent(shareText)

  const handleCopyLink = async () => {
    const result = await shareContent(postUrl, 'AgriEasy Post', postCaption)
    if (result === 'copied' || result === 'shared') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank')
  }

  const handleInstagram = () => {
    navigator.clipboard?.writeText(postUrl).catch(() => {})
    window.open('https://www.instagram.com/', '_blank')
  }

  const handleThreads = () => {
    window.open(`https://threads.net/intent/post?text=${encodedText}%20${encodedUrl}`, '_blank')
  }

  const handleDownload = async () => {
    if (!mediaUrl || !allowDownload) return
    if (mediaType === 'youtube' || mediaType === 'text') return

    setDownloading(true)
    try {
      const response = await fetch(mediaUrl)
      const blob = await response.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = mediaUrl.split('/').pop() || 'agrieasy-download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch {
      window.open(mediaUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const canDownload = allowDownload && mediaUrl && mediaType !== 'text' && mediaType !== 'youtube'

  const shareOptions = [
    { icon: '\u{1F4AC}', label: 'WhatsApp', onClick: handleWhatsApp, color: '#25D366' },
    { icon: '\u{1F4F7}', label: 'WA Status', onClick: handleWhatsApp, color: '#25D366' },
    { icon: '\u{1F4F8}', label: 'Instagram', onClick: handleInstagram, color: '#E4405F' },
    { icon: '\u{1F9F5}', label: 'Threads', onClick: handleThreads, color: '#000000' },
    { icon: '\u{1F517}', label: copied ? 'Copied!' : 'Copy Link', onClick: handleCopyLink, color: SOCIAL.primary },
  ]

  if (canDownload) {
    shareOptions.push({
      icon: '\u{2B07}\u{FE0F}',
      label: downloading ? 'Saving...' : 'Download',
      onClick: handleDownload,
      color: SOCIAL.green,
    })
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, animation: 'fadeIn 0.2s ease-out' }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderRadius: '20px 20px 0 0', padding: '20px 16px calc(20px + env(safe-area-inset-bottom))',
        zIndex: 10000, boxShadow: '0 -4px 24px rgba(0,0,0,0.15)', animation: 'slideUp 0.3s ease-out',
        maxWidth: '500px', margin: '0 auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px' }} />
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: SOCIAL.text, margin: '0 0 20px' }}>Share to...</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 12, marginBottom: 16 }}>
          {shareOptions.map((option, i) => (
            <button key={i} onClick={option.onClick} style={{
              background: 'transparent', border: 'none', padding: '12px 4px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'transform 0.15s ease',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${option.color}15`, border: `1px solid ${option.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
              }}>{option.icon}</div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: SOCIAL.text, textAlign: 'center', lineHeight: 1.2 }}>{option.label}</span>
            </button>
          ))}
        </div>
        {allowDownload === false && (
          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: SOCIAL.muted, margin: '0 0 12px', fontStyle: 'italic' }}>
            The creator has disabled downloads for this post
          </p>
        )}
        <button onClick={onClose} style={{
          width: '100%', padding: '14px', background: SOCIAL.bgSub, border: 'none',
          borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', color: SOCIAL.text, cursor: 'pointer',
        }}>Cancel</button>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}
