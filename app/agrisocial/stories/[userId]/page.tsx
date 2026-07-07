'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface StoryItem { _id: string; mediaUrl: string; mediaType: string; caption?: string; duration?: number; viewed: boolean; likesCount?: number; createdAt: string }
interface StoryGroup { userId: string; user: User; stories: StoryItem[]; hasUnviewed: boolean }

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
    const duration = (story?.duration || 5) * 1000

    // Mark story viewed
    useEffect(() => {
        if (!story) return
        authFetch(`/api/social/stories/${story._id}/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => null)
    }, [story?._id])

    // Auto-advance progress
    useEffect(() => {
        if (!story || paused) return
        setProgress(0)
        const start = Date.now()
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
    }, [story?._id, paused])

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
            router.push('/agrisocial')
        }
    }

    const goBack = () => {
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

    if (loading) return <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading…</div>
    if (!current || !story) return (
        <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '16px' }}>
            <span style={{ fontSize: '3rem' }}>🌾</span>
            <p>No active stories</p>
            <Link href="/agrisocial" style={{ color: SOCIAL.primary, fontWeight: 700 }}>← Back to feed</Link>
        </div>
    )

    const name = current.user?.farmerName || current.user?.firmName || 'User'

    const handleLike = () => {
        if (liked) return
        setLiked(true)
        setTimeout(() => setLiked(false), 1500)
    }

    return (
        <div style={{ height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Media */}
            {story.mediaType === 'video' ? (
                <video src={story.mediaUrl} autoPlay muted playsInline style={{ maxWidth: '100%', maxHeight: '100vh' }} />
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

            {/* Header */}
            <div style={{ position: 'absolute', top: 28, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
                <Link href={`/agrisocial/profile/${current.userId}`} style={{ width: 36, height: 36, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#fff', fontWeight: 800, border: '2px solid #fff' }}>
                    {name[0]?.toUpperCase()}
                </Link>
                <div>
                    <Link href={`/agrisocial/profile/${current.userId}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem', textDecoration: 'none' }}>{name}</Link>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', margin: 0 }}>{current.user?.role || ''}</p>
                </div>
                <button onClick={() => router.push('/agrisocial')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Tap zones */}
            <button onClick={goBack} style={{ position: 'absolute', left: 0, top: 60, bottom: 60, width: '30%', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Previous" />
            <button onClick={advance} style={{ position: 'absolute', right: 0, top: 60, bottom: 60, width: '70%', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Next" />

            {/* Caption + actions */}
            <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, color: '#fff' }}>
                {story.caption && <p style={{ fontSize: '0.9rem', margin: '0 0 12px', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{story.caption}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={handleLike} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: liked ? SOCIAL.red : '#fff', padding: '8px 16px', borderRadius: 100, cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', backdropFilter: 'blur(8px)' }}>
                        {liked ? '❤️ Liked' : '🤍 Like'}
                    </button>
                    <Link href={`/agrisocial/dm?shareStory=${story._id}`} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: 100, fontWeight: 700, fontSize: '0.84rem', textDecoration: 'none', backdropFilter: 'blur(8px)' }}>
                        ✈️ Share
                    </Link>
                    {viewerId === current.userId && (
                        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.7)', fontSize: '0.74rem' }}>{story.likesCount || 0} likes · {current.stories.length - sIdx} left</span>
                    )}
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
