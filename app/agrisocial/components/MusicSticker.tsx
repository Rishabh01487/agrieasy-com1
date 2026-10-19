'use client'

import { useState, useEffect, useRef } from 'react'

interface MusicStickerProps {
  audioUrl: string
  audioTitle: string
  audioArtist?: string
  autoPlay?: boolean       // auto-play when component mounts (for clips when active)
  isActive?: boolean       // whether this clip is currently in view (stops audio when false)
  compact?: boolean
}

/**
 * MusicSticker — Instagram-style music overlay for posts/clips/stories.
 * - Auto-plays when autoPlay=true (used on clips when the clip is active)
 * - Stops audio when isActive=false (previous clip scrolled away)
 * - On feed posts: user taps play/pause button
 * - Scrolling marquee shows song name + artist
 */
export default function MusicSticker({ audioUrl, audioTitle, audioArtist, autoPlay = false, isActive = true, compact = false }: MusicStickerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)

  // Auto-play when active, stop when inactive
  useEffect(() => {
    if (!audioRef.current) return
    if (autoPlay && isActive) {
      audioRef.current.volume = 0.5
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [autoPlay, isActive, audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause() }
  }, [])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
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
          animation: playing ? 'musicMarquee 10s linear infinite' : 'none',
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
