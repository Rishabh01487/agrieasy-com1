'use client'

import { useState, useEffect, useRef } from 'react'
import { SOCIAL, SHARED } from '@/lib/styles'

interface Song {
  title: string
  artist: string
  previewUrl: string
  artworkUrl: string
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
  const [previewProgress, setPreviewProgress] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(30)
  const [seekStartTime, setSeekStartTime] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [trending, setTrending] = useState<Song[]>([])

  useEffect(() => {
    searchMusic('top bollywood songs 2024', true)
  }, [])

  const searchMusic = async (searchQuery: string, isTrending = false) => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setError('')
    if (!isTrending) setResults([])
    try {
      // iTunes Search API is CORS-friendly, but a CSP rule in middleware.ts
      // must explicitly allow itunes.apple.com in connect-src / media-src /
      // img-src — otherwise the browser blocks the fetch and songs never appear.
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
      })).filter((s: Song) => s.previewUrl)

      if (isTrending) {
        setTrending(songs)
      } else {
        setResults(songs)
      }
      // Distinguish "no results" from "fetch failed" for obscure queries.
      if (songs.length === 0 && !isTrending) {
        setError(`No songs found for "${searchQuery}". Try a different spelling or artist name.`)
      }
    } catch (e: any) {
      console.error('Music search failed:', e)
      // Visible error so the user knows the fetch failed (otherwise the
      // sheet just stays empty and looks broken).
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

  // Track playback position for the seek slider.
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

  // Seek handler — user drags the slider to pick the song's start point.
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setPreviewProgress(newTime)
    setSeekStartTime(newTime)
  }

  // Instagram-style scrubber: pointer-based drag on a custom bar (not a
  // native range input) so we can match IG's look — thin track, brand-color
  // filled portion, large draggable handle.
  const handleScrubberPointerDown = (e: React.PointerEvent) => {
    if (!audioRef.current || !scrubberRef.current) return
    e.preventDefault()
    setIsScrubbing(true)
    // Pause while scrubbing so the audio doesn't fight the drag
    audioRef.current.pause()

    const updateFromPointer = (clientX: number) => {
      const rect = scrubberRef.current!.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newTime = ratio * (previewDuration || 30)
      audioRef.current!.currentTime = newTime
      setPreviewProgress(newTime)
      setSeekStartTime(newTime)
    }

    // Jump to the tap position immediately
    updateFromPointer(e.clientX)

    const onPointerMove = (ev: PointerEvent) => updateFromPointer(ev.clientX)
    const onPointerUp = () => {
      setIsScrubbing(false)
      // Resume playback from the new position
      audioRef.current?.play().catch(() => {})
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const handleSelect = (song: Song) => {
    if (audioRef.current) audioRef.current.pause()
    // Pass seekStartTime so the post plays from the user's chosen point —
    // only if they actually previewed this song and moved the slider.
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
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, color: SOCIAL.text, fontWeight: 800, fontSize: '1.1rem' }}>🎵 Choose Music</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.66rem', color: SOCIAL.muted }}>30-sec preview clips · loops in your post (like Instagram)</p>
          </div>
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

        {loading && (
          <div style={{ textAlign: 'center', padding: 30, color: SOCIAL.muted, fontSize: '0.85rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${SOCIAL.borderLight}`, borderTopColor: SOCIAL.primary, animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
            Searching...
          </div>
        )}

        {/* Error state */}
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

                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => handleSelect(song)}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: SOCIAL.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: SOCIAL.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist} · {song.genre}</p>
                </div>

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

        {/* Sticky scrubber bar — appears when a song is selected. Lets
            the user play/pause, drag to set the start time, and see
            elapsed/total time. The chosen start time is passed to the post
            when they tap "Use". */}
        {playingUrl && (
          <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0,
            background: SOCIAL.white,
            borderTop: `1px solid ${SOCIAL.border}`,
            padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
            flexShrink: 0, zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <button
                onClick={() => playingUrl && togglePreview(playingUrl)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: SOCIAL.primary, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: SOCIAL.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displaySongs.find(s => s.previewUrl === playingUrl)?.title || 'Preview'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: SOCIAL.primary, fontWeight: 600 }}>
                  Drag to set start: {formatTime(seekStartTime)}
                </p>
              </div>

              <span style={{ fontSize: '0.7rem', color: SOCIAL.muted, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {formatTime(previewProgress)} / {formatTime(previewDuration)}
              </span>
            </div>

            <div
              ref={(el) => {
                (scrubberRef as any).current = el
              }}
              onPointerDown={handleScrubberPointerDown}
              style={{
                position: 'relative', width: '100%', height: 24,
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                touchAction: 'none',  // prevent scroll while dragging
              }}
            >
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 4,
                borderRadius: 2, background: SOCIAL.border,
              }} />
              <div style={{
                position: 'absolute', left: 0, height: 4, borderRadius: 2,
                background: SOCIAL.primary,
                width: `${(previewProgress / (previewDuration || 30)) * 100}%`,
              }} />
              <div style={{
                position: 'absolute',
                left: `calc(${(previewProgress / (previewDuration || 30)) * 100}% - 10px)`,
                width: 20, height: 20, borderRadius: '50%',
                background: '#fff', border: `2px solid ${SOCIAL.primary}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'transform 0.1s ease',
                transform: isScrubbing ? 'scale(1.2)' : 'scale(1)',
              }} />
            </div>

            <button
              onClick={() => {
                const song = displaySongs.find(s => s.previewUrl === playingUrl)
                if (song) handleSelect(song)
              }}
              style={{
                width: '100%', marginTop: 14, padding: '12px',
                background: SOCIAL.primary, color: '#fff', border: 'none',
                borderRadius: 10, fontWeight: 800, fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Use this song • Start at {formatTime(seekStartTime)}
            </button>
          </div>
        )}

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
