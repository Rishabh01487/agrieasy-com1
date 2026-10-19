'use client'

import { useState, useEffect, useRef } from 'react'

interface MusicStickerProps {
  audioUrl: string
  audioTitle: string
  audioArtist?: string
  autoPlay?: boolean       // auto-play when component mounts (for clips when active)
  isActive?: boolean       // whether this clip is currently in view (stops audio when false)
  userInteracted?: boolean // whether the user has interacted with the page (gates autoplay on app open)
  compact?: boolean
}

/**
 * MusicSticker — Instagram-style music overlay for posts/clips/stories.
 * - Auto-plays only when: autoPlay && isActive && userInteracted
 *   (prevents music blasting the moment the app/page opens — needs a user gesture first)
 * - Self-pauses via its own IntersectionObserver when scrolled out of view
 *   (safety net so the previous clip's music never keeps playing on the feed)
 * - On feed posts: user taps play/pause button
 * - Scrolling marquee shows song name + artist
 */
export default function MusicSticker({
  audioUrl,
  audioTitle,
  audioArtist,
  autoPlay = false,
  isActive = true,
  userInteracted = true,
  compact = false,
}: MusicStickerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)

  // Self-pause IntersectionObserver — if the sticker scrolls out of view,
  // pause the audio IMMEDIATELY. This is a safety net on top of the isActive
  // prop, so that even if the parent's activeIdx update has a timing gap,
  // the previous clip's music can never keep playing.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting && audioRef.current) {
            audioRef.current.pause()
            setPlaying(false)
          }
        })
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Auto-play when active + user has interacted, stop otherwise.
  // The userInteracted gate prevents music from auto-playing the moment
  // the clips page loads — it only starts after the first tap/scroll.
  useEffect(() => {
    if (!audioRef.current) return
    if (autoPlay && isActive && userInteracted) {
      audioRef.current.volume = 0.5
      const p = audioRef.current.play()
      if (p && typeof p.then === 'function') {
        p.then(() => setPlaying(true)).catch(() => setPlaying(false))
      }
    } else {
      audioRef.current.pause()
      setPlaying(false)
    }
  }, [autoPlay, isActive, userInteracted, audioUrl])

  // Cleanup on unmount — always pause to release the audio element
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  // Also pause when the document is hidden (user switched tabs / minimized)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && audioRef.current) {
        audioRef.current.pause()
        setPlaying(false)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.volume = 0.5
      const p = audioRef.current.play()
      if (p && typeof p.then === 'function') {
        p.then(() => setPlaying(true)).catch(() => {})
      } else {
        setPlaying(true)
      }
    }
  }

  if (!audioUrl) return null

  return (
    <div ref={wrapperRef} style={{
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
