'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Icon, IconButton } from '@/lib/icons'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface StoryItem { _id: string; mediaUrl: string; mediaType: string; caption?: string; duration?: number; viewed: boolean; likesCount?: number; viewedByCount?: number; createdAt: string }
interface StoryGroup { userId: string; user: User; stories: StoryItem[]; hasUnviewed: boolean }

// Build an Instagram-style @handle from a user's name.
// "Rishabh Gupta" → "@rishabhgupta", "Test Firm Pvt Ltd" → "@testfirmpvtltd"
function makeHandle(user: User): string {
    const name = user.farmerName || user.firmName || 'user'
    return '@' + name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default function StoryViewer({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: profileId } = use(params)
    const router = useRouter()
    const [groups, setGroups] = useState<StoryGroup[]>([])
    const [gIdx, setGIdx] = useState(0)
    const [sIdx, setSIdx] = useState(0)
    const [loading, setLoading] = useState(true)
    const [paused, setPaused] = useState(false)
    const [progress, setProgress] = useState(0)
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [liked, setLiked] = useState(false)
    const [ended, setEnded] = useState(false) // show end card after last story
    const [muted, setMuted] = useState(false) // audio toggle for video stories
    const [videoDuration, setVideoDuration] = useState<number | null>(null) // actual video length (seconds)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                const res = await authFetch('/api/social/stories')
                if (res.ok) {
                    const d = await res.json()
                    const all: StoryGroup[] = d.data?.stories || d.stories || []
                    setGroups(all)
                    const idx = all.findIndex(g => g.userId === profileId)
                    if (idx >= 0) {
                        setGIdx(idx)
                        setSIdx(0)
                    }
                }
            } catch {}
            setLoading(false)
        }
        void load()
    }, [profileId])

    const current = groups[gIdx]
    const story = current?.stories?.[sIdx]
    // Use the actual video duration for video stories; fall back to the
    // story.duration field (default 5s) for images.
    const durationSecs = (story?.mediaType === 'video' && videoDuration) ? videoDuration : (story?.duration || 5)
    const duration = durationSecs * 1000

    // Mark story viewed
    useEffect(() => {
        if (!story) return
        authFetch(`/api/social/stories/${story._id}/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null)
    }, [story?._id])

    // Reset video duration when story changes
    useEffect(() => {
        setVideoDuration(null)
        setProgress(0)
    }, [story?._id])

    // Auto-advance progress — syncs to video.currentTime for video stories
    useEffect(() => {
        if (!story || paused || ended) return
        setProgress(0)
        const start = Date.now()

        // For videos, prefer syncing to the video's currentTime so the
        // progress bar matches the actual playback exactly (handles
        // buffering, seeks, variable duration).
        const videoEl = videoRef.current
        if (story.mediaType === 'video' && videoEl) {
            const onTimeUpdate = () => {
                if (!videoEl.duration) return
                const pct = (videoEl.currentTime / videoEl.duration) * 100
                setProgress(Math.min(100, pct))
                if (videoEl.ended) {
                    advance()
                }
            }
            const onLoadedMetadata = () => {
                if (videoEl.duration && isFinite(videoEl.duration)) {
                    setVideoDuration(videoEl.duration)
                }
            }
            videoEl.addEventListener('timeupdate', onTimeUpdate)
            videoEl.addEventListener('loadedmetadata', onLoadedMetadata)
            videoEl.addEventListener('ended', advance)
            return () => {
                videoEl.removeEventListener('timeupdate', onTimeUpdate)
                videoEl.removeEventListener('loadedmetadata', onLoadedMetadata)
                videoEl.removeEventListener('ended', advance)
            }
        }

        // For images, use a timer
        const tick = () => {
            const elapsed = Date.now() - start
            const pct = Math.min(100, (elapsed / duration) * 100)
            setProgress(pct)
            if (pct >= 100) {
                advance()
            } else {
                timerRef.current = setTimeout(tick, 50)
            }
        }
        timerRef.current = setTimeout(tick, 50)
        return () => { if (timerRef.current) clearTimeout(timerRef.current) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [story?._id, paused, ended, videoDuration])

    const advance = () => {
        if (!current) return
        if (sIdx < current.stories.length - 1) {
            setSIdx(i => i + 1)
            setProgress(0)
        } else if (gIdx < groups.length - 1) {
            setGIdx(i => i + 1)
            setSIdx(0)
            setProgress(0)
        } else {
            // All stories done — show end card instead of immediately leaving
            setEnded(true)
        }
    }

    const goBack = () => {
        if (ended) { setEnded(false); return }
        if (sIdx > 0) {
            setSIdx(i => i - 1)
            setProgress(0)
        } else if (gIdx > 0) {
            const prev = groups[gIdx - 1]
            setGIdx(i => i - 1)
            setSIdx(prev.stories.length - 1)
            setProgress(0)
        } else {
            router.push('/agrisocial')
        }
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: SHARED.font }}>
            Loading…
        </div>
    )

    if (!current || !story) return (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '16px', fontFamily: SHARED.font }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agrisocial-logo.png" alt="AgriSocial" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover' }} />
            <p>No active stories</p>
            <Link href="/agrisocial" style={{ color: SOCIAL.primary, fontWeight: 700 }}>← Back to feed</Link>
        </div>
    )

    const name = current.user?.farmerName || current.user?.firmName || 'User'
    const handle = makeHandle(current.user)
    const roleLabel = current.user?.role === 'farmer' ? 'Farmer' : current.user?.role === 'buyer' ? 'Buyer' : current.user?.role === 'transporter' ? 'Transporter' : 'Member'

    const handleLike = async () => {
        if (liked) return
        setLiked(true)
        // Persist the like to the server
        if (story?._id) {
            try {
                await authFetch(`/api/social/stories/${story._id}/like`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
                })
            } catch {}
        }
        // Visual feedback: heart stays "liked" (no auto-reset — Instagram keeps it liked)
    }

    // ── END CARD — Instagram-style "story ended" screen ───────────────
    // After the last story completes, show the AgriSocial logo + the
    // creator's @handle, with options to view profile or go back to feed.
    if (ended) {
        return (
            <div style={{
                height: '100vh', background: '#000', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: SHARED.font,
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background blur of last story */}
                {story.mediaUrl && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url(${story.mediaUrl})`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        filter: 'blur(40px) brightness(0.3)', transform: 'scale(1.2)',
                    }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24 }}>
                    {/* AgriSocial logo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/agrisocial-logo.png" alt="AgriSocial" style={{
                        width: 80, height: 80, borderRadius: 22, objectFit: 'cover',
                        margin: '0 auto 24px', display: 'block',
                        boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
                    }} />

                    {/* Brand name */}
                    <h1 style={{
                        fontSize: '1.6rem', fontWeight: 900, margin: '0 0 4px',
                        background: SOCIAL.gradient,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        AgriSocial
                    </h1>

                    {/* "You're all caught up" */}
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.86rem', margin: '0 0 28px' }}>
                        You're all caught up
                    </p>

                    {/* Creator card */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 12,
                        background: 'rgba(255,255,255,0.08)', borderRadius: 100,
                        padding: '8px 18px 8px 8px', marginBottom: 28,
                        backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: SOCIAL.gradient,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                        }}>
                            {name[0]?.toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{handle}</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: 0 }}>{roleLabel}</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
                        <Link href={`/agrisocial/profile/${current.userId}`}
                            style={{
                                padding: '13px 24px', background: SOCIAL.gradient, color: '#fff',
                                borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
                            }}>
                            <Icon name="explore" size={18} color="#fff" /> View Profile
                        </Link>
                        <button onClick={() => router.push('/agrisocial')}
                            style={{
                                padding: '13px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
                                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backdropFilter: 'blur(8px)',
                            }}>
                            <Icon name="home" size={18} color="#fff" /> Back to Feed
                        </button>
                    </div>

                    {/* Replay option */}
                    <button onClick={() => { setEnded(false); setSIdx(0); setGIdx(0); setProgress(0) }}
                        style={{
                            marginTop: 20, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                        ↻ Replay stories
                    </button>
                </div>
            </div>
        )
    }

    // ── ACTIVE STORY VIEWER ───────────────────────────────────────────
    return (
        <div style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Media */}
            {story.mediaType === 'video' ? (
                <video
                    ref={videoRef}
                    src={story.mediaUrl}
                    autoPlay
                    playsInline
                    muted={muted}
                    style={{ maxWidth: '100%', maxHeight: '100vh' }}
                />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.mediaUrl} alt="story" style={{ maxWidth: '100%', maxHeight: '100vh' }} />
            )}

            {/* Gradient overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none' }} />

            {/* Progress bars */}
            <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4 }}>
                {current.stories.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ width: i < sIdx ? '100%' : (i === sIdx ? `${progress}%` : '0%'), height: '100%', background: '#fff', transition: i === sIdx ? 'width 50ms linear' : 'none' }} />
                    </div>
                ))}
            </div>

            {/* Header — Instagram-style with @handle */}
            <div style={{ position: 'absolute', top: 28, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                <Link href={`/agrisocial/profile/${current.userId}`} style={{ width: 38, height: 38, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', fontWeight: 800, border: '2px solid #fff', flexShrink: 0 }}>
                    {name[0]?.toUpperCase()}
                </Link>
                <div style={{ minWidth: 0 }}>
                    <Link href={`/agrisocial/profile/${current.userId}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'block' }}>
                        {handle}
                    </Link>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: 0 }}>
                        {roleLabel} · {new Date(story.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                </div>
                {/* Mute/unmute toggle (only for video stories) */}
                {story.mediaType === 'video' && (
                    <button
                        onClick={() => setMuted(m => !m)}
                        title={muted ? 'Unmute' : 'Mute'}
                        style={{
                            marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none',
                            color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {muted ? (
                            // Muted icon — speaker with X
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <line x1="23" y1="9" x2="17" y2="15" />
                                <line x1="17" y1="9" x2="23" y2="15" />
                            </svg>
                        ) : (
                            // Unmuted icon — speaker with sound waves
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                            </svg>
                        )}
                    </button>
                )}
                <button onClick={() => router.push('/agrisocial')} title="Close"
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                    <Icon name="close" size={18} color="#fff" />
                </button>
            </div>

            {/* Tap zones */}
            <button onClick={goBack} style={{ position: 'absolute', left: 0, top: 60, bottom: 60, width: '30%', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Previous" />
            <button onClick={advance} style={{ position: 'absolute', right: 0, top: 60, bottom: 60, width: '70%', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Next" />

            {/* Caption + actions */}
            <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, color: '#fff' }}>
                {story.caption && <p style={{ fontSize: '0.9rem', margin: '0 0 12px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{story.caption}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={handleLike}
                        style={{
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            color: liked ? SOCIAL.red : '#fff', padding: '8px 14px',
                            borderRadius: 100, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                            backdropFilter: 'blur(8px)', transition: 'transform 0.15s',
                            transform: liked ? 'scale(1.05)' : 'scale(1)',
                            fontWeight: 700, fontSize: '0.82rem',
                        }}>
                        <Icon name="heart" size={18} color={liked ? '#ef4444' : '#fff'} filled={liked} />
                        {liked ? 'Liked' : 'Like'}
                    </button>
                    {/* Reply via DM (Instagram stories use DM replies instead of comments) */}
                    <Link href={`/agrisocial/dm?userId=${current.userId}`}
                        style={{
                            background: 'rgba(255,255,255,0.15)', color: '#fff',
                            padding: '8px 14px', borderRadius: 100, textDecoration: 'none',
                            display: 'flex', alignItems: 'center', gap: 6,
                            backdropFilter: 'blur(8px)', fontWeight: 700, fontSize: '0.82rem',
                        }}>
                        <Icon name="send" size={17} color="#fff" /> Reply
                    </Link>
                    <Link href={`/agrisocial/dm?shareStory=${story._id}`}
                        title="Share via DM"
                        style={{
                            background: 'rgba(255,255,255,0.15)', color: '#fff',
                            padding: '8px', borderRadius: 100, textDecoration: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(8px)',
                        }}>
                        <Icon name="share" size={18} color="#fff" />
                    </Link>
                    {/* Stats: likes + views (visible to everyone) */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 700 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="heart" size={14} color="rgba(255,255,255,0.7)" /> {story.likesCount || 0}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="eye" size={14} color="rgba(255,255,255,0.7)" /> {story.viewedByCount || 0}
                        </span>
                        {viewerId === current.userId && (
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>· {current.stories.length - sIdx - 1} left</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Pause on long-press / mouse-down */}
            <div
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onMouseLeave={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
                style={{ position: 'absolute', inset: 60, zIndex: -1 }}
            />
        </div>
    )
}
