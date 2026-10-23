'use client'

import { useState, useEffect, useRef, useId } from 'react'

interface MusicStickerProps {
  audioUrl: string
  audioTitle: string
  audioArtist?: string
  startTime?: number
  autoPlay?: boolean
  isActive?: boolean
  userInteracted?: boolean
  compact?: boolean
}

/* Global single-audio-source coordinator.
   Only ONE MusicSticker can play at a time across the whole app — when a
   sticker starts playing it broadcasts an event with its unique ID, and
   all other stickers listen and pause themselves. Fixes the feed bug
   where post A's music kept playing after scrolling to post B. */

const PLAY_EVENT = 'agrieasy-music-play'

/**
 * MusicSticker — Instagram-style music overlay for posts/clips/stories.
 * Auto-plays only when autoPlay && isActive && userInteracted (the user
 * gate prevents music blasting the moment the app opens).
 */
export default function MusicSticker({
  audioUrl,
  audioTitle,
  audioArtist,
  startTime = 0,
  autoPlay = false,
  isActive = true,
  userInteracted = true,
  compact = false,
}: MusicStickerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const myId = useId()

  const startPlayback = () => {
    if (!audioRef.current) return
    // Seek to the user-chosen start time so users can pick any point in the song.
    if (startTime > 0 && audioRef.current.currentTime < startTime) {
      try { audioRef.current.currentTime = startTime } catch { /* may fail before metadata loads */ }
    }
    audioRef.current.volume = 0.5
    const p = audioRef.current.play()
    if (p && typeof p.then === 'function') {
      p.then(() => {
        setPlaying(true)
        // Broadcast: "I'm playing now" — all other stickers will pause
        window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { id: myId } }))
      }).catch(() => setPlaying(false))
    } else {
      setPlaying(true)
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { id: myId } }))
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlaying(false)
  }

  // Single audio source — listen for other stickers starting to play.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.id === myId) return  // it's me, ignore
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
        setPlaying(false)
      }
    }
    window.addEventListener(PLAY_EVENT, handler as EventListener)
    return () => window.removeEventListener(PLAY_EVENT, handler as EventListener)
  }, [myId])

  // Self-pause IntersectionObserver — HIGH threshold (0.5) so the pause
  // triggers as soon as half the sticker leaves the viewport, not when
  // it's almost completely gone. Fixes the feed scroll-away bug.
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
      { threshold: [0, 0.25, 0.5] }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // userInteracted gate prevents music from auto-playing when the clips page
  // loads — only starts after the first tap/scroll.
  useEffect(() => {
    if (!audioRef.current) return
    if (autoPlay && isActive && userInteracted) {
      startPlayback()
    } else {
      stopPlayback()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isActive, userInteracted, audioUrl])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  // Pause when the document is hidden (user switched tabs / minimized).
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
      stopPlayback()
    } else {
      startPlayback()
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
