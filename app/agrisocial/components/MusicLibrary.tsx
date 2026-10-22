'use client'

import { useState, useEffect, useRef } from 'react'
import { SOCIAL, SHARED } from '@/lib/styles'

interface Song {
  title: string
  artist: string
  previewUrl: string  // 30-second preview clip (m4a)
  artworkUrl: string   // album art
  genre: string
}

interface MusicLibraryProps {
  onSelect: (song: { url: string; title: string; artist: string; startTime?: number }) => void
  onClose: () => void
}

/**
 * MusicLibrary — Instagram-style music picker powered by iTunes Search API.
 * Gives access to millions of songs (entire Apple Music catalog).
 * Returns 30-second preview clips that play in the app.
 *
 * No API key required. Free. CORS-friendly.
 */
export default function MusicLibrary({ onSelect, onClose }: MusicLibraryProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [playingUrl, setPlayingUrl] = useState('')
  const [previewProgress, setPreviewProgress] = useState(0)  // current playback position (seconds)
  const [previewDuration, setPreviewDuration] = useState(30)  // total duration (seconds)
  const [seekStartTime, setSeekStartTime] = useState(0)  // the start time the user picked for the currently-playing song
  const [error, setError] = useState('')  // visible error message so fetch failures aren't silent
  const audioRef = useRef<HTMLAudioElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [trending, setTrending] = useState<Song[]>([])

  // Load trending songs on mount
  useEffect(() => {
    searchMusic('top bollywood songs 2024', true)
  }, [])

  const searchMusic = async (searchQuery: string, isTrending = false) => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    if (!isTrending) setResults([])
    try {
      // iTunes Search API is CORS-friendly, so we call it directly.
      // (A CSP rule in middleware.ts explicitly allows itunes.apple.com
      // in connect-src / media-src / img-src — without that rule the
      // browser blocks the fetch and songs never appear.)
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=50&country=in`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const songs: Song[] = (data.results || []).map((r: any) => ({
        title: r.trackName || 'Unknown',
        artist: r.artistName || 'Unknown',
        previewUrl: r.previewUrl || '',
        artworkUrl: (r.artworkUrl100 || '').replace('100x100', '200x200'),
        genre: r.primaryGenreName || 'Music',
      })).filter((s: Song) => s.previewUrl) // only songs with preview clips

      if (isTrending) {
        setTrending(songs)
      } else {
        setResults(songs)
      }
      // Surface a helpful message if the API returned 0 songs (rare but possible
      // for very obscure queries) — distinguishes "no results" from "fetch failed".
      if (songs.length === 0 && !isTrending) {
        setError(`No songs found for "${searchQuery}". Try a different spelling or artist name.`)
      }
    } catch (e: any) {
      console.error('Music search failed:', e)
      // Show a visible, actionable error so the user knows the fetch failed
      // (otherwise the sheet just stays empty and looks broken).
      setError(
        'Could not reach the music catalog. This is usually a network or ' +
        'content-policy block. Tap Retry, or check your connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      searchMusic(value)
    }, 400)
  }

  const togglePreview = (url: string) => {
    if (!audioRef.current) return
    if (playingUrl === url) {
      audioRef.current.pause()
      setPlayingUrl('')
    } else {
      audioRef.current.src = url
      audioRef.current.currentTime = 0
      setSeekStartTime(0)
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(() => {})
      setPlayingUrl(url)
    }
  }

  // Track playback position for the seek slider
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setPreviewProgress(audio.currentTime)
    const onLoadedMetadata = () => setPreviewDuration(audio.duration || 30)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
    }
  }, [playingUrl])

  // Seek handler — user drags the slider to pick the song's start point
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setPreviewProgress(newTime)
    setSeekStartTime(newTime)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSelect = (song: Song) => {
    if (audioRef.current) audioRef.current.pause()
    // Pass the seekStartTime so the post plays from the user's chosen point
    // (not always from 0:00). Only pass it if the user actually previewed
    // this song and moved the slider; otherwise default to 0.
    const startTime = playingUrl === song.previewUrl ? seekStartTime : 0
    onSelect({ url: song.previewUrl, title: song.title, artist: song.artist, startTime })
  }

  const displaySongs = query.trim() ? results : trending

  const GENRE_SUGGESTIONS = [
    'Bollywood', 'Punjabi', 'Arijit Singh', 'Diljit Dosanjh',
    'Ed Sheeran', 'Drake', 'Taylor Swift', 'Lofi beats',
    'Kumar Sanu', 'Sidhu Moose Wala', 'Neha Kakkar', 'Badshah',
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <audio ref={audioRef} onEnded={() => setPlayingUrl('')} />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: SOCIAL.white, borderRadius: '20px 20px 0 0',
          padding: '20px', width: '100%', maxWidth: '500px',
          maxHeight: '80vh', overflowY: 'auto', boxShadow: SHARED.shadowXl,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px', flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
          <h3 style={{ margin: 0, color: SOCIAL.text, fontWeight: 800, fontSize: '1.1rem' }}>🎵 Choose Music</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: SOCIAL.muted, fontSize: '1.3rem', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        {/* Search bar */}
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search millions of songs..."
          autoFocus
          style={{
            width: '100%', padding: '12px 16px',
            border: `1.5px solid ${SOCIAL.border}`, borderRadius: 12,
            fontSize: '0.92rem', color: SOCIAL.text, outline: 'none',
            boxSizing: 'border-box', fontFamily: SHARED.font,
            marginBottom: 12, flexShrink: 0,
          }}
        />

        {/* Quick suggestions */}
        {!query.trim() && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', flexShrink: 0 }} className="no-scrollbar">
            {GENRE_SUGGESTIONS.map(g => (
              <button key={g} onClick={() => { setQuery(g); searchMusic(g) }}
                style={{
                  padding: '6px 14px', borderRadius: 100,
                  border: `1px solid ${SOCIAL.border}`,
                  background: 'transparent', color: SOCIAL.muted,
                  fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.2s',
                }}>
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 30, color: SOCIAL.muted, fontSize: '0.85rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${SOCIAL.borderLight}`, borderTopColor: SOCIAL.primary, animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
            Searching...
          </div>
        )}

        {/* Error state — visible so fetch failures aren't silent */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: 24, color: SOCIAL.text, background: '#FEF2F2', border: `1px solid #FECACA`, borderRadius: 12, marginBottom: 12 }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>🎵⚠️</div>
            <p style={{ fontSize: '0.84rem', margin: '0 0 12px', lineHeight: 1.5 }}>{error}</p>
            <button
              onClick={() => searchMusic(query.trim() || 'top bollywood songs 2024', !query.trim())}
              style={{ background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Results */}
        {!loading && displaySongs.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!query.trim() && (
              <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                🔥 Trending Now
              </p>
            )}
            {displaySongs.map((song, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
                borderRadius: 10, marginBottom: 6,
                transition: 'background 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = SOCIAL.primaryLight }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Artwork + play button */}
                <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}
                  onClick={() => togglePreview(song.previewUrl)}>
                  {song.artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={song.artworkUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎵</div>
                  )}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'rgba(0,0,0,0.5)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: playingUrl === song.previewUrl ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}>
                    {playingUrl === song.previewUrl ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </div>
                </div>

                {/* Song info */}
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleSelect(song)}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: SOCIAL.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: SOCIAL.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist} · {song.genre}</p>
                </div>

                {/* Select button */}
                <button onClick={() => handleSelect(song)} style={{
                  background: SOCIAL.primary, color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 14px', fontSize: '0.74rem',
                  fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                  Use
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Seek slider — appears when a song is playing.
            Lets the user pick any start point in the song (not just 0:00).
            The selected start time is passed to the post when they tap "Use". */}
        {playingUrl && (
          <div style={{
            background: SOCIAL.primaryLight, borderRadius: 12, padding: '12px 14px',
            marginBottom: 12, flexShrink: 0, border: `1px solid ${SOCIAL.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: SOCIAL.primary }}>
                ✂️ Start from: {formatTime(seekStartTime)}
              </span>
              <span style={{ fontSize: '0.68rem', color: SOCIAL.muted }}>
                {formatTime(previewProgress)} / {formatTime(previewDuration)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={previewDuration || 30}
              step={0.1}
              value={previewProgress}
              onChange={handleSeek}
              style={{
                width: '100%', height: 6, borderRadius: 3,
                background: `linear-gradient(to right, ${SOCIAL.primary} ${(previewProgress / (previewDuration || 30)) * 100}%, ${SOCIAL.border} ${(previewProgress / (previewDuration || 30)) * 100}%)`,
                appearance: 'none', WebkitAppearance: 'none', outline: 'none', cursor: 'pointer',
              }}
            />
            <p style={{ fontSize: '0.66rem', color: SOCIAL.muted, margin: '6px 0 0', textAlign: 'center' }}>
              Drag to choose where the song starts in your post
            </p>
          </div>
        )}

        {/* No results */}
        {!loading && query.trim() && displaySongs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, color: SOCIAL.muted }}>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>No songs found for &quot;{query}&quot;</p>
            <p style={{ fontSize: '0.72rem', margin: '8px 0 0' }}>Try a different search term</p>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}
