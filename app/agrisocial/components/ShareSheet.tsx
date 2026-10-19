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

/* ------------------------------------------------------------------ */
/* Brand SVG icons (replaces the old emoji icons)                      */
/* ------------------------------------------------------------------ */

function WhatsAppIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3C9.37 3 4 8.37 4 15c0 2.12.55 4.1 1.5 5.83L4 29l8.34-1.45A12 12 0 0 0 16 27c6.63 0 12-5.37 12-12S22.63 3 16 3z" fill="#25D366" />
      <path d="M16 5.5c5.24 0 9.5 4.26 9.5 9.5S21.24 24.5 16 24.5c-1.7 0-3.3-.45-4.69-1.23l-.33-.2-4.95.86.86-4.83-.21-.34A9.46 9.46 0 0 1 6.5 15c0-5.24 4.26-9.5 9.5-9.5z" fill="#fff" fillOpacity="0" />
      <path d="M11.6 9.3c-.25-.56-.5-.57-.73-.58l-.62-.01c-.22 0-.57.08-.87.4-.3.33-1.15 1.12-1.15 2.74 0 1.62 1.18 3.18 1.34 3.4.17.22 2.32 3.54 5.62 4.96 2.78 1.2 3.35.96 3.95.9.6-.06 1.95-.8 2.22-1.57.27-.77.27-1.43.19-1.57-.08-.14-.3-.22-.62-.38-.33-.16-1.95-.96-2.25-1.07-.3-.11-.52-.16-.74.17-.22.33-.85 1.07-1.04 1.29-.19.22-.38.25-.7.08-.33-.16-1.38-.51-2.63-1.62-.97-.87-1.63-1.94-1.82-2.27-.19-.33-.02-.5.15-.66.15-.15.33-.38.5-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.43z" fill="#fff" />
    </svg>
  )
}

function InstagramIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <defs>
        <radialGradient id="ig-grad" cx="0.3" cy="1.05" r="1.1">
          <stop offset="0" stopColor="#FFDD55" />
          <stop offset="0.1" stopColor="#FFDD55" />
          <stop offset="0.5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
        <radialGradient id="ig-grad2" cx="0.88" cy="0.18" r="0.78">
          <stop offset="0" stopColor="#3771C8" />
          <stop offset="0.5" stopColor="#3771C8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="3" y="3" width="26" height="26" rx="7.5" fill="url(#ig-grad)" />
      <rect x="3" y="3" width="26" height="26" rx="7.5" fill="url(#ig-grad2)" />
      <rect x="7.5" y="7.5" width="17" height="17" rx="5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="22" cy="10" r="1.3" fill="#fff" />
    </svg>
  )
}

function ThreadsIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#000" />
      <path d="M22.3 15.1c-.1-.05-.2-.1-.3-.14-.18-3.32-1.99-5.22-5.04-5.25h-.05c-1.82 0-3.34.78-4.28 2.19l1.67 1.15c.7-1.06 1.8-1.29 2.61-1.29h.04c1.01.01 1.78.3 2.27.87.36.42.6 1 .72 1.74-.3-.05-.62-.09-.96-.1-1.7-.08-3.06.32-3.95 1.16-.74.69-1.13 1.65-1.1 2.7.03 1.07.5 2.02 1.31 2.66.68.53 1.56.79 2.48.73 1.2-.08 2.15-.6 2.81-1.54.5-.7.82-1.61.97-2.77.6.37 1.05.85 1.31 1.44.43.99.46 2.61-.87 3.94-1.16 1.16-2.55 1.66-4.65 1.67-2.33-.02-4.09-.76-5.24-2.22-1.07-1.35-1.62-3.32-1.64-5.83.02-2.51.57-4.48 1.64-5.83 1.15-1.46 2.91-2.2 5.24-2.22 2.34.02 4.13.77 5.31 2.25.58.72 1.02 1.64 1.31 2.71l2.05-.55c-.36-1.41-.96-2.62-1.79-3.66C24.5 9.86 22.16 8.89 19.2 8.87h-.01c-2.96.02-5.27.98-6.86 2.86C9.5 14.96 9.6 18.9 9.61 19.1v.27c.04 1.85.41 3.42 1.1 4.66.05.09.1.18.16.27 1.34 2.06 3.55 3.12 6.41 3.14h.01c2.55-.02 4.34-.69 5.78-2.14 1.92-1.92 1.86-4.32 1.23-5.79-.46-1.06-1.32-1.92-2.49-2.51l-.51-.05zm-5.3 5.74c-.94.05-1.91-.37-1.96-1.65-.04-.95.68-1.99 2.85-1.89.26.01.51.03.75.07-.16 2.13-.93 3.4-1.64 3.47z" fill="#fff" />
    </svg>
  )
}

function LinkIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#31372B" />
      <path d="M14 18.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.54 3.54 0 0 0-5-5L15 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M18 13.5a3.5 3.5 0 0 0-5 0L10.5 16a3.54 3.54 0 0 0 5 5L17 20" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function DownloadIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#16a34a" />
      <path d="M16 8v12m0 0l-4.5-4.5M16 20l4.5-4.5M9 24h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoreIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="3" y="3" width="26" height="26" rx="8" fill="#6b7280" />
      <circle cx="10" cy="16" r="2" fill="#fff" />
      <circle cx="16" cy="16" r="2" fill="#fff" />
      <circle cx="22" cy="16" r="2" fill="#fff" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Helper: fetch a media URL as a File (for native file share)         */
/* ------------------------------------------------------------------ */

async function fetchMediaAsFile(mediaUrl: string, fallbackName = 'krishiclip'): Promise<File | null> {
  try {
    const response = await fetch(mediaUrl, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    // Derive a sensible extension from the blob type
    const ext =
      blob.type.includes('mp4') ? 'mp4' :
      blob.type.includes('webm') ? 'webm' :
      blob.type.includes('quicktime') ? 'mov' :
      blob.type.includes('matroska') ? 'mkv' :
      blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg' :
      blob.type.includes('png') ? 'png' :
      blob.type.includes('gif') ? 'gif' :
      blob.type.includes('webp') ? 'webp' : 'bin'
    const mime = blob.type || 'application/octet-stream'
    return new File([blob], `${fallbackName}.${ext}`, { type: mime })
  } catch {
    return null
  }
}

function canShareFiles(files: File[]): boolean {
  if (typeof navigator === 'undefined') return false
  if (typeof (navigator as any).canShare !== 'function') return false
  try {
    return (navigator as any).canShare({ files })
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */

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
  const [sharing, setSharing] = useState(false)

  if (!isOpen) return null

  const shareText = postCaption
    ? `${postCaption.slice(0, 100)}${postCaption.length > 100 ? '...' : ''}`
    : 'Check this out on AgriEasy!'
  const encodedUrl = encodeURIComponent(postUrl)
  const encodedText = encodeURIComponent(shareText)

  // YouTube videos can't be file-shared (they're not hosted by us). For
  // those, fall back to URL sharing.
  const isSharableFile = !!mediaUrl && mediaType !== 'youtube' && mediaType !== 'text'
  const isVideo = mediaType === 'video' || (mediaUrl?.match(/\.(mp4|webm|mov|mkv)$/i) ? true : false)

  const handleCopyLink = async () => {
    const result = await shareContent(postUrl, 'AgriEasy Post', postCaption)
    if (result === 'copied' || result === 'shared') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /* ---------------------------------------------------------------- */
  /* WhatsApp — share the ACTUAL video clip as a file when supported, */
  /* so WhatsApp receives a playable video (not just a link).         */
  /* ---------------------------------------------------------------- */
  const handleWhatsApp = async () => {
    if (isSharableFile && !sharing) {
      setSharing(true)
      try {
        const file = await fetchMediaAsFile(mediaUrl!, 'krishiclip')
        if (file && canShareFiles([file])) {
          await (navigator as any).share({
            files: [file],
            title: 'KrishiClip',
            text: shareText,
          })
          return
        }
      } catch {
        // user cancelled or share failed — fall through to URL share
      } finally {
        setSharing(false)
      }
    }
    // Fallback: open WhatsApp with a text + link message
    window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank')
  }

  /* ---------------------------------------------------------------- */
  /* Instagram — only accepts FILE shares (it ignores URL shares).    */
  /* Share the video file so Instagram receives it as a new post.     */
  /* ---------------------------------------------------------------- */
  const handleInstagram = async () => {
    if (isSharableFile && !sharing) {
      setSharing(true)
      try {
        const file = await fetchMediaAsFile(mediaUrl!, 'krishiclip')
        if (file && canShareFiles([file])) {
          await (navigator as any).share({
            files: [file],
            title: 'KrishiClip',
            text: shareText,
          })
          return
        }
      } catch {
        // fall through
      } finally {
        setSharing(false)
      }
    }
    // Fallback: copy link + open Instagram (user pastes manually)
    navigator.clipboard?.writeText(`${shareText} ${postUrl}`).catch(() => {})
    window.open('https://www.instagram.com/', '_blank')
  }

  const handleThreads = () => {
    window.open(`https://threads.net/intent/post?text=${encodedText}%20${encodedUrl}`, '_blank')
  }

  /* "More" — opens the native OS share sheet with the file attached */
  const handleMore = async () => {
    if (isSharableFile && !sharing) {
      setSharing(true)
      try {
        const file = await fetchMediaAsFile(mediaUrl!, 'krishiclip')
        if (file && canShareFiles([file])) {
          await (navigator as any).share({
            files: [file],
            title: 'KrishiClip',
            text: `${shareText} ${postUrl}`,
          })
          return
        }
      } catch {
        // fall through
      } finally {
        setSharing(false)
      }
    }
    // Fallback: native share with URL only (or copy)
    const result = await shareContent(postUrl, 'KrishiClip', shareText)
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  // Build the share options list. Each entry has an SVG icon component
  // (replacing the old emoji icons) so the sheet looks like a real native
  // share panel with proper brand logos.
  type ShareOption = {
    icon: React.ReactNode
    label: string
    onClick: () => void
    color: string
    badge?: string
  }

  const shareOptions: ShareOption[] = [
    { icon: <WhatsAppIcon />, label: 'WhatsApp', onClick: handleWhatsApp, color: '#25D366', badge: isSharableFile && isVideo ? 'Video' : undefined },
    { icon: <WhatsAppIcon />, label: 'WA Status', onClick: handleWhatsApp, color: '#25D366' },
    { icon: <InstagramIcon />, label: 'Instagram', onClick: handleInstagram, color: '#E4405F', badge: isSharableFile && isVideo ? 'Video' : undefined },
    { icon: <ThreadsIcon />, label: 'Threads', onClick: handleThreads, color: '#000000' },
    { icon: <MoreIcon />, label: 'More apps', onClick: handleMore, color: '#6b7280' },
    { icon: <LinkIcon />, label: copied ? 'Copied!' : 'Copy Link', onClick: handleCopyLink, color: SOCIAL.primary },
  ]

  if (canDownload) {
    shareOptions.push({
      icon: <DownloadIcon />,
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
        <p style={{ textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: SOCIAL.text, margin: '0 0 20px' }}>
          {sharing ? 'Preparing video…' : 'Share to...'}
        </p>

        {/* File-share availability hint */}
        {isSharableFile && isVideo && !sharing && (
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: SOCIAL.muted, margin: '0 0 14px', lineHeight: 1.4 }}>
            WhatsApp &amp; Instagram will receive the full video clip.<br />
            Other apps will receive a link.
          </p>
        )}
        {!isSharableFile && isVideo === false && mediaType === 'youtube' && (
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: SOCIAL.muted, margin: '0 0 14px', fontStyle: 'italic' }}>
            YouTube clips are shared as a link.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 12, marginBottom: 16 }}>
          {shareOptions.map((option, i) => (
            <button key={i} onClick={option.onClick} disabled={sharing} style={{
              background: 'transparent', border: 'none', padding: '12px 4px', cursor: sharing ? 'wait' : 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'transform 0.15s ease',
              opacity: sharing ? 0.5 : 1,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: `${option.color}10`, border: `1px solid ${option.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}>
                {option.icon}
                {option.badge && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#16a34a', color: '#fff',
                    fontSize: '0.55rem', fontWeight: 800,
                    padding: '1px 5px', borderRadius: 6,
                    border: '1.5px solid #fff',
                    letterSpacing: 0.3,
                  }}>{option.badge}</span>
                )}
              </div>
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
