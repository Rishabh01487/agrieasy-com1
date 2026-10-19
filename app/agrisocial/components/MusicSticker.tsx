'use client'

import { useState, useEffect, useRef } from 'react'
import { SOCIAL } from '@/lib/styles'

interface MusicStickerProps {
  audioUrl: string
  audioTitle: string
  audioArtist?: string
  autoPlay?: boolean
  compact?: boolean
}

/**
 * MusicSticker — Instagram-style music overlay for posts/clips/stories.
 * Shows a scrolling marquee with the song name + a play/pause button.
 * The audio plays from the Cloudinary-hosted URL.
 */
export default function MusicSticker({ audioUrl, audioTitle, audioArtist, autoPlay = false, compact = false }: MusicStickerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (autoPlay && audioRef.current) {
      audioRef.current.volume = 0.5
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    }
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [autoPlay, audioUrl])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause(); setPlaying(false) }
    else { audioRef.current.volume = 0.5; audioRef.current.play().then(() => setPlaying(true)).catch(() => {}) }
  }

  if (!audioUrl) return null

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 100, padding: compact ? '4px 10px' : '6px 14px',
      maxWidth: compact ? 200 : 280,
      overflow: 'hidden',
    }}>
      <audio ref={audioRef} src={audioUrl} loop preload="metadata" />

      {/* Play/Pause button */}
      <button onClick={togglePlay} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, color: '#fff',
      }}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      {/* Music note icon */}
      <span style={{ fontSize: compact ? '0.7rem' : '0.8rem', flexShrink: 0 }}>🎵</span>

      {/* Scrolling marquee */}
      <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-block', whiteSpace: 'nowrap',
          color: '#fff', fontSize: compact ? '0.68rem' : '0.76rem', fontWeight: 600,
          animation: 'musicMarquee 10s linear infinite',
        }}>
          {audioTitle || 'Unknown Track'}{audioArtist ? ` · ${audioArtist}` : ''}
        </div>
      </div>

      <style>{`
        @keyframes musicMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
