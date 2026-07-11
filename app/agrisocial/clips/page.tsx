'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Icon } from '@/lib/icons'
import BottomSheet from '@/app/components/BottomSheet'

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
const CATEGORIES = [
    { key: 'all', label: 'All' }, { key: 'farming', label: '🌾 Farming' }, { key: 'technique', label: '🔬 Technique' },
    { key: 'agritrading', label: '💰 Trading' }, { key: 'equipment', label: '🚜 Equipment' }, { key: 'organic', label: '🌱 Organic' },
]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; profilePic?: string }
interface Comment { _id: string; userId: User | string; text: string; createdAt: string }
interface Clip { _id: string; userId: User; mediaUrl?: string; mediaType?: string; caption: string; hashtags: string[]; category: string; likes: string[]; likesCount: number; commentsCount?: number; views: number; createdAt: string; savedBy?: string[]; savedCount?: number; sharedBy?: string[]; sharedCount?: number }

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
}

function ClipCard({ clip, viewerId, isActive, onDelete }: { clip: Clip; viewerId: string; isActive: boolean; onDelete?: (id: string) => void }) {
    const [liked, setLiked] = useState(viewerId ? clip.likes?.includes(viewerId) : false)
    const [likesCount, setLikesCount] = useState(clip.likesCount || 0)
    const [saved, setSaved] = useState(viewerId ? clip.savedBy?.includes(viewerId) : false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [muted, setMuted] = useState(false)
    const [paused, setPaused] = useState(false)
    const [heartBurst, setHeartBurst] = useState(false)
    const [showComments, setShowComments] = useState(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentText, setCommentText] = useState('')
    const [postingComment, setPostingComment] = useState(false)
    const [loadingComments, setLoadingComments] = useState(false)
    const lastTapRef = useRef<number>(0)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            if (isActive && !paused) { videoRef.current.play().catch(() => null) }
            else { videoRef.current.pause() }
        }
    }, [isActive, paused])

    const handleVideoTap = () => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            if (!liked) {
                setLiked(true)
                setLikesCount(c => c + 1)
                authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: clip._id }) }).catch(() => null)
            }
            setHeartBurst(true)
            setTimeout(() => setHeartBurst(false), 1000)
        } else {
            setPaused(p => !p)
        }
        lastTapRef.current = now
    }

    const isDeletedUser = !clip.userId || typeof clip.userId !== 'object'
    const authorName = isDeletedUser ? 'Unknown User' : (clip.userId.farmerName || clip.userId.firmName || 'User')
    const authorRole = isDeletedUser ? '' : clip.userId.role
    const authorId = isDeletedUser ? '' : clip.userId._id
    const isOwner = viewerId && viewerId === authorId

    const handleLike = async () => {
        if (!viewerId) return
        const prevLiked = liked
        const prevCount = likesCount
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        try {
            await authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: clip._id }) })
        } catch { setLiked(prevLiked); setLikesCount(prevCount) }
    }

    const handleSave = async () => {
        if (!viewerId) return
        const prevSaved = saved
        const newSaved = !saved
        setSaved(newSaved)
        try {
            let res: Response
            if (newSaved) {
                res = await authFetch(`/api/social/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId: clip._id }),
                })
            } else {
                res = await authFetch(`/api/social/save?postId=${clip._id}`, { method: 'DELETE' })
            }
            if (!res.ok) setSaved(prevSaved)
        } catch { setSaved(prevSaved) }
    }

    const handleShare = async () => {
        try {
            await authFetch(`/api/social/posts/${clip._id}/share`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
            }).catch(() => null)
        } catch {}
        window.location.href = `/agrisocial/dm?sharePost=${clip._id}`
    }

    const openComments = async () => {
        setShowComments(true)
        if (comments.length === 0 && !loadingComments) {
            setLoadingComments(true)
            try {
                const res = await authFetch(`/api/social/posts/${clip._id}`)
                if (res.ok) {
                    const d = await res.json()
                    setComments(d.post?.comments || [])
                }
            } catch {}
            setLoadingComments(false)
        }
    }

    const handleComment = async () => {
        if (!commentText.trim() || !viewerId) return
        setPostingComment(true)
        try {
            const res = await authFetch('/api/social/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: viewerId, postId: clip._id, text: commentText }),
            })
            if (res.ok) {
                const d = await res.json()
                setComments(c => [...c, d.comment])
                setCommentText('')
            }
        } catch {}
        setPostingComment(false)
    }

    const handleDelete = async () => {
        if (!viewerId) return
        const res = await authFetch(`/api/social/posts/${clip._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: viewerId }),
        })
        if (res.ok) onDelete?.(clip._id)
        else setShowDeleteConfirm(false)
    }

    const ytId = clip.mediaUrl ? (clip.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%', background: SOCIAL.clips.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', flexShrink: 0 }}>
            {/* Media */}
            {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=${isActive ? 1 : 0}&mute=0&loop=1&playlist=${ytId}`}
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }} allowFullScreen title="KrishiClip" allow="autoplay" />
            ) : clip.mediaUrl && clip.mediaType === 'video' ? (
                <video ref={videoRef} src={clip.mediaUrl} loop muted={muted} playsInline controls={false}
                    onClick={handleVideoTap}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, cursor: 'pointer' }} />
            ) : clip.mediaUrl && clip.mediaType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clip.mediaUrl} alt="clip" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
            ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #431407, #9a3412)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0 }}>
                    <span style={{ fontSize: '4rem' }}>🌾</span>
                </div>
            )}

            {/* Overlay gradient */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />

            {/* Heart burst on double-tap */}
            {heartBurst && (
                <div className="heart-burst" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: '5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))', zIndex: 10 }}>❤️</div>
            )}

            {/* Pause indicator */}
            {paused && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fff', fontSize: '3rem', opacity: 0.8, pointerEvents: 'none', zIndex: 10 }}>⏸</div>
            )}

            {/* Sound toggle (top-right) */}
            {clip.mediaType === 'video' && (
                <button onClick={() => setMuted(m => !m)} title={muted ? 'Unmute' : 'Mute'}
                    style={{ position: 'absolute', top: 60, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 10 }}>
                    {muted ? '🔇' : '🔊'}
                </button>
            )}

            {/* Right action bar */}
            <div style={{ position: 'absolute', right: '16px', bottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
                <Link href={`/agrisocial/profile/${authorId || '#'}`} style={{ textDecoration: 'none' }}>
                    {clip.userId && typeof clip.userId === 'object' && (clip.userId as any).profilePic ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={(clip.userId as any).profilePic} alt={authorName} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff' }} />
                    ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem', border: '2px solid #fff' }}>
                            {authorName[0]?.toUpperCase()}
                        </div>
                    )}
                </Link>
                <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="heart" size={32} color={liked ? '#ef4444' : '#fff'} filled={liked} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{likesCount}</span>
                </button>
                {/* Comment — links to the post detail page where comments live */}
                <button onClick={openComments} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="comment" size={32} color="#fff" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.commentsCount || 0}</span>
                </button>
                {/* Share — copies link + tracks share count */}
                <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="send" size={30} color="#fff" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.sharedCount || 0}</span>
                </button>
                <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="bookmark" size={32} color={saved ? '#3b82f6' : '#fff'} filled={saved} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{saved ? 'Saved' : 'Save'}</span>
                </button>
                {isOwner && (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                        <Icon name="trash" size={30} color="#fff" />
                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Delete</span>
                    </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text }}>
                    <Icon name="eye" size={32} color="#fff" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.views || 0}</span>
                </div>
            </div>

            {/* Share copied toast */}
            {shareCopied && (
                <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, zIndex: 50, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}>
                    <Icon name="check" size={14} color="#22c55e" /> Link copied
                </div>
            )}

            {/* Delete confirm overlay */}
            {showDeleteConfirm && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <p style={{ color: SOCIAL.clips.text, fontSize: '1rem', fontWeight: 700, margin: 0 }}>Delete this KrishiClip?</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleDelete} style={{ background: SOCIAL.red, border: 'none', borderRadius: '10px', padding: '10px 22px', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>Yes, delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '10px 22px', color: SOCIAL.clips.text, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Bottom info */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '72px' }}>
                <Link href={`/agrisocial/profile/${authorId || '#'}`} style={{ color: SOCIAL.clips.text, fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                    @{(authorName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')} · {roleLabel[authorRole || ''] || 'Member'}
                </Link>
                {clip.caption && <p style={{ color: 'rgba(245,245,245,0.9)', fontSize: '0.85rem', margin: '0 0 4px', lineHeight: 1.4 }}>{clip.caption}</p>}
                {clip.hashtags?.length > 0 && <p style={{ color: SOCIAL.clips.muted, fontSize: '0.78rem', margin: 0 }}>{clip.hashtags.slice(0, 4).map(h => `${h.startsWith('#') ? h : '#' + h}`).join(' ')}</p>}
            </div>

            {/* KrishiClips badge */}
            <div style={{ position: 'absolute', top: '60px', left: '16px', background: 'rgba(234,88,12,0.85)', borderRadius: '100px', padding: '4px 12px', backdropFilter: 'blur(8px)' }}>
                <span style={{ color: SOCIAL.clips.text, fontSize: '0.72rem', fontWeight: 800 }}>🎬 KrishiClip</span>
            </div>

            {/* Comment bottom sheet — slides up like Instagram Reels */}
            <BottomSheet open={showComments} onClose={() => setShowComments(false)} title="Comments" height="tall">
                {loadingComments ? (
                    <div style={{ textAlign: 'center', padding: 40, color: SOCIAL.muted, fontSize: '0.86rem' }}>Loading comments…</div>
                ) : comments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: SOCIAL.muted, fontSize: '0.86rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💬</div>
                        No comments yet. Be the first!
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        {comments.map(c => {
                            const cn = typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'
                            const cid = typeof c.userId === 'object' ? (c.userId as User)._id : ''
                            return (
                                <div key={c._id} style={{ display: 'flex', gap: 10 }}>
                                    <Link href={`/agrisocial/profile/${cid}`} style={{ width: 32, height: 32, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>{cn[0]?.toUpperCase()}</Link>
                                    <div>
                                        <p style={{ color: SOCIAL.text, fontSize: '0.86rem', margin: 0, lineHeight: 1.5 }}>
                                            <Link href={`/agrisocial/profile/${cid}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{cn}</Link>{' '}{c.text}
                                        </p>
                                        <span style={{ color: SOCIAL.muted, fontSize: '0.7rem' }}>{timeAgo(c.createdAt)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
                {viewerId && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'sticky', bottom: 0, background: '#fff', padding: '10px 0', borderTop: `1px solid ${SOCIAL.border}` }}>
                        <input
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleComment()}
                            placeholder="Add a comment…"
                            style={{ flex: 1, padding: '9px 14px', background: SOCIAL.bg, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 100, fontSize: '0.86rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }}
                        />
                        <button onClick={handleComment} disabled={postingComment || !commentText.trim()} style={{ background: 'none', border: 'none', color: SOCIAL.primary, fontWeight: 700, fontSize: '0.86rem', cursor: (postingComment || !commentText.trim()) ? 'not-allowed' : 'pointer', opacity: (postingComment || !commentText.trim()) ? 0.5 : 1 }}>
                            {postingComment ? '…' : 'Post'}
                        </button>
                    </div>
                )}
            </BottomSheet>
        </div>
    )
}

export default function KrishiClips() {
    const [clips, setClips] = useState<Clip[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const pageRef = useRef(1)
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const [activeIdx, setActiveIdx] = useState(0)
    const [userId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [category, setCategory] = useState('all')
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()


    const loadClips = async (pageNum: number, append: boolean) => {
        try {
            if (append) setLoadingMore(true)
            else setLoading(true)
            const url = category === 'all' ? `/api/social/clips?page=${pageNum}` : `/api/social/clips?page=${pageNum}&category=${category}`
            const res = await authFetch(url)
            const d = await res.json()
            const clipsData = d?.data?.clips || d?.clips || []
            const total = d?.meta?.total || d?.data?.meta?.total || 0
            setClips(prev => append ? [...prev, ...clipsData] : clipsData)
            setHasMore(clipsData.length > 0 && (append ? (clips.length + clipsData.length < total) : (clipsData.length < total)))
            pageRef.current = pageNum
        } catch {}
        setLoading(false)
        setLoadingMore(false)
    }

    useEffect(() => {
        pageRef.current = 1
        setHasMore(true)
        void loadClips(1, false)
    }, [category])

    useEffect(() => {
        const sentinel = sentinelRef.current
        const container = containerRef.current
        if (!sentinel || !container) return
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadClips(pageRef.current + 1, true) },
            { root: container, rootMargin: '200px' }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, loadingMore, clips.length])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => { if (e.isIntersecting) { const idx = parseInt((e.target as HTMLElement).dataset.idx || '0'); setActiveIdx(idx) } })
        }, { threshold: 0.6 })
        container.querySelectorAll('.clip-item').forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [clips])

    return (
        <div style={{ height: '100vh', overflow: 'hidden', background: SOCIAL.clips.bg, fontFamily: SHARED.font, position: 'relative' }}>
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => router.push('/agrisocial')} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '10px', padding: '8px 12px', color: SOCIAL.clips.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>← Back</button>
                <div style={{ flex: 1, fontWeight: 900, fontSize: '1.1rem', color: SOCIAL.clips.text }}>🎬 KrishiClips</div>
                <button onClick={() => router.push('/agrisocial/create?type=krishiclip')} style={{ background: `${SOCIAL.clips.accent}d9`, border: 'none', borderRadius: '10px', padding: '8px 14px', color: SOCIAL.clips.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>+ Create</button>
            </div>

            {/* Category pills */}
            <div style={{ position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 100, display: 'flex', gap: '6px', padding: '8px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                        style={{ padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: category === c.key ? SOCIAL.clips.accent : 'rgba(255,255,255,0.15)', color: SOCIAL.clips.text, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Vertical scroll feed */}
            <div ref={containerRef} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                {loading ? (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: SOCIAL.clips.text }}>
                        <span style={{ fontSize: '3rem' }}>🎬</span>
                        <p style={{ fontWeight: 700 }}>Loading KrishiClips…</p>
                    </div>
                ) : clips.length === 0 ? (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: SOCIAL.clips.text, textAlign: 'center', padding: '24px' }}>
                        <span style={{ fontSize: '3rem' }}>🌾</span>
                        <h2>No KrishiClips yet</h2>
                        <p style={{ color: SOCIAL.clips.muted }}>Be the first to share a farming clip!</p>
                        <button onClick={() => router.push('/agrisocial/create?type=krishiclip')} style={{ background: SOCIAL.clips.accent, border: 'none', borderRadius: '12px', padding: '12px 24px', color: SOCIAL.clips.text, fontWeight: 800, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s ease' }}>+ Create KrishiClip</button>
                    </div>
                ) : clips.map((clip, idx) => (
                    <div key={clip._id} className="clip-item" data-idx={idx.toString()}>
                        <ClipCard clip={clip} viewerId={userId} isActive={idx === activeIdx} onDelete={(id) => setClips(cs => cs.filter(x => x._id !== id))} />
                    </div>
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: 1, scrollSnapAlign: 'none' }} />
                {loadingMore && (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.clips.text }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Loading more clips…</span>
                    </div>
                )}
            </div>
        </div>
    )
}