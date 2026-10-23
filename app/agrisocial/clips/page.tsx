'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Spinner, InlineLoader } from '@/app/components/Spinner'
import { Icon } from '@/lib/icons'
import BottomSheet from '@/app/components/BottomSheet'
import ShareSheet from '../components/ShareSheet'
import MusicSticker from '../components/MusicSticker'
import { GlobeIcon, FarmingIcon, TradingIcon, TechniqueIcon, EquipmentIcon, OrganicIcon, mithilaPillBackground } from '@/lib/category-icons'
import AgriSocialBottomNav from '../components/AgriSocialBottomNav'

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
const CATEGORIES = [
    { key: 'all', label: 'All', icon: <GlobeIcon /> },
    { key: 'farming', label: 'Farming', icon: <FarmingIcon /> },
    { key: 'technique', label: 'Technique', icon: <TechniqueIcon /> },
    { key: 'agritrading', label: 'Trading', icon: <TradingIcon /> },
    { key: 'equipment', label: 'Equipment', icon: <EquipmentIcon /> },
    { key: 'organic', label: 'Organic', icon: <OrganicIcon /> },
]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; profilePic?: string }
interface Comment { _id: string; userId: User | string; text: string; createdAt: string }
interface Clip { _id: string; userId: User; mediaUrl?: string; mediaType?: string; caption: string; hashtags: string[]; category: string; likes: string[]; likesCount: number; commentsCount?: number; views: number; createdAt: string; savedBy?: string[]; savedCount?: number; sharedBy?: string[]; sharedCount?: number; allowDownload?: boolean; audioUrl?: string; audioTitle?: string; audioArtist?: string; audioStartTime?: number }

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    return `${Math.floor(s / 86400)}d`
}

function ClipCard({ clip, viewerId, isActive, userInteracted, onDelete }: { clip: Clip; viewerId: string; isActive: boolean; userInteracted: boolean; onDelete?: (id: string) => void }) {
    const [liked, setLiked] = useState(viewerId ? clip.likes?.includes(viewerId) : false)
    const [likesCount, setLikesCount] = useState(clip.likesCount || 0)
    const [saved, setSaved] = useState(viewerId ? clip.savedBy?.includes(viewerId) : false)
    const [viewsCount, setViewsCount] = useState(clip.views || 0)
    const [following, setFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [shareCopied, setShareCopied] = useState(false)
    const [showShareSheet, setShowShareSheet] = useState(false)
    const [muted, setMuted] = useState(false)
    const [paused, setPaused] = useState(false)
    const [ended, setEnded] = useState(false)  // clip finished — shows AgriSocial end screen
    const [heartBurst, setHeartBurst] = useState(false)
    const ytId = clip.mediaUrl ? (clip.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null
    const [showComments, setShowComments] = useState(false)
    const [comments, setComments] = useState<Comment[]>([])
    const [commentText, setCommentText] = useState('')
    const [postingComment, setPostingComment] = useState(false)
    const [loadingComments, setLoadingComments] = useState(false)
    const lastTapRef = useRef<number>(0)
    const videoRef = useRef<HTMLVideoElement>(null)
    const viewRecordedRef = useRef(false)
    const cardRef = useRef<HTMLDivElement>(null)

    // Backup IntersectionObserver — self-pause when card scrolls out of view.
    // Safety net in case the parent's activeIdx doesn't update reliably.
    useEffect(() => {
        const card = cardRef.current
        if (!card) return
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (!e.isIntersecting && videoRef.current) {
                    videoRef.current.pause()
                    videoRef.current.currentTime = 0
                    setPaused(false)
                }
            })
        }, { threshold: 0.5 })
        observer.observe(card)
        return () => observer.disconnect()
    }, [])

    // Global event: when any clip becomes active, all OTHER clips pause.
    // Custom-event broadcast is the most reliable approach.
    useEffect(() => {
        const handleActiveChange = (e: Event) => {
            const activeClipId = (e as CustomEvent).detail?.clipId
            if (activeClipId !== clip._id && videoRef.current) {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
                setPaused(false)
            }
        }
        window.addEventListener('agrieasy-active-clip-change', handleActiveChange as EventListener)
        return () => window.removeEventListener('agrieasy-active-clip-change', handleActiveChange as EventListener)
    }, [clip._id])

    // When THIS clip becomes active, broadcast so all other clips pause.
    useEffect(() => {
        if (isActive) {
            window.dispatchEvent(new CustomEvent('agrieasy-active-clip-change', { detail: { clipId: clip._id } }))
        }
    }, [isActive, clip._id])

    useEffect(() => {
        if (videoRef.current) {
            if (isActive && !paused) {
                setEnded(false)
                videoRef.current.play().catch(() => null)
            } else {
                videoRef.current.pause()
                videoRef.current.currentTime = 0
                setEnded(false)
            }
        }
    }, [isActive, paused])

    // YouTube IFrame API posts state changes via postMessage:
    // 0 = ended, 1 = playing, 2 = paused. Listen for state 0 to show
    // the AgriSocial end screen.
    useEffect(() => {
        if (!ytId || !isActive) return

        // Tell the YouTube iframe to start sending state change events.
        const iframe = document.querySelector('iframe[title="KrishiClip"]') as HTMLIFrameElement
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(JSON.stringify({
                event: 'listening',
            }), '*')
        }

        const handler = (e: MessageEvent) => {
            try {
                if (e.origin !== 'https://www.youtube.com') return
                const data = JSON.parse(e.data)
                if (data.event === 'onStateChange' && data.info === 0) {
                    setEnded(true)
                }
                if (data.event === 'onStateChange' && data.info === 1) {
                    setEnded(false)
                }
            } catch { /* ignore non-JSON messages */ }
        }
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
    }, [ytId, isActive])

    // Record ONE view per active session (ref guards against re-renders).
    useEffect(() => {
        if (isActive && viewerId && !viewRecordedRef.current) {
            viewRecordedRef.current = true
            setViewsCount(c => c + 1)
            authFetch(`/api/social/clips/${clip._id}/view`, { method: 'POST' }).catch(() => null)
        }
        if (!isActive) {
            viewRecordedRef.current = false
        }
    }, [isActive, viewerId, clip._id])

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
        setShowShareSheet(true)
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

    return (
        <div ref={cardRef} style={{ position: 'relative', height: '100vh', width: '100%', background: SOCIAL.clips.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', flexShrink: 0 }}>
            {/* Media */}
            {ytId ? (
                <iframe key={`${ytId}-${isActive ? 'active' : 'inactive'}`} src={`https://www.youtube.com/embed/${ytId}?autoplay=${isActive ? 1 : 0}&mute=0&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : 'https://agrieasy.site'}`}
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }} allowFullScreen title="KrishiClip" allow="autoplay" />
            ) : clip.mediaUrl && clip.mediaType === 'video' ? (
                <video ref={videoRef} src={clip.mediaUrl}
                    // If the clip has EXTERNAL music (clip.audioUrl), mute the video so
                    // only the music plays. Otherwise the video's own audio plays. Always
                    // muted when the clip is NOT active so the previous clip's audio can't
                    // bleed into the next during scroll.
                    muted={!!clip.audioUrl || muted || !isActive}
                    playsInline controls={false}
                    onClick={handleVideoTap}
                    onEnded={() => setEnded(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, cursor: 'pointer' }} />
            ) : clip.mediaUrl && clip.mediaType === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={clip.mediaUrl} alt="clip" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
            ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #D9534F, #B8423F)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0 }}>
                    <span style={{ fontSize: '4rem' }}>🌾</span>
                </div>
            )}

            {/* Overlay gradient */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', pointerEvents: 'none' }} />

            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 100, padding: '4px 10px 4px 4px', pointerEvents: 'none', zIndex: 5 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#D9534F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 1 }}><path d="M8 5v14l11-7z" /></svg>
                </div>
                <span style={{ color: '#fff', fontSize: '0.68rem', fontWeight: 700, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>AgriSocial</span>
            </div>

            {heartBurst && (
                <div className="heart-burst" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: '5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))', zIndex: 10 }}>❤️</div>
            )}

            {paused && !ended && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: 'rgba(139,10,20,0.85)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        border: '2px solid rgba(255,255,255,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(139,10,20,0.5)',
                    }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
                    </div>
                </div>
            )}

            {/* End screen — AgriSocial branding when the clip finishes. */}
            {ended && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 20,
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(20,20,20,0.9) 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 16, animation: 'fadeIn 0.3s ease',
                }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/agrisocial-logo.png" alt="AgriSocial"
                        style={{
                            width: 72, height: 72, borderRadius: 18,
                            boxShadow: '0 8px 32px rgba(217,83,79,0.4)',
                            animation: 'logoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{
                            color: '#fff', fontSize: '1.6rem', fontWeight: 800, margin: 0,
                            letterSpacing: '-0.02em',
                        }}>
                            Agri<span style={{ color: SOCIAL.clips.accent || '#D9534F' }}>Social</span>
                        </h2>
                        <p style={{
                            color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 600,
                            margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.15em',
                        }}>
                            India's Agricultural Community
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEnded(false)
                            if (videoRef.current) {
                                videoRef.current.currentTime = 0
                                videoRef.current.play().catch(() => null)
                            }
                        }}
                        style={{
                            marginTop: 8, background: 'rgba(255,255,255,0.15)', color: '#fff',
                            border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 100,
                            padding: '10px 28px', fontSize: '0.88rem', fontWeight: 700,
                            cursor: 'pointer', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', gap: 8,
                            transition: 'all 0.2s ease',
                        }}
                    >🔁 Replay</button>
                    <p style={{
                        color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: 600,
                        margin: '8px 0 0', animation: 'bounce 1.5s ease infinite',
                    }}>Swipe up for next clip ↑</p>

                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes logoPop {
                            0% { transform: scale(0.5); opacity: 0; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        @keyframes bounce {
                            0%, 100% { transform: translateY(0); }
                            50% { transform: translateY(-6px); }
                        }
                    `}</style>
                </div>
            )}

            {clip.mediaType === 'video' && (
                <button onClick={() => setMuted(m => !m)} title={muted ? 'Unmute' : 'Mute'}
                    style={{ position: 'absolute', top: 60, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', zIndex: 10 }}>
                    {muted ? '🔇' : '🔊'}
                </button>
            )}

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
                    <Icon name="heart" size={32} color={liked ? '#D9534F' : '#fff'} filled={liked} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{likesCount}</span>
                </button>
                <button onClick={openComments} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="comment" size={32} color="#fff" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.commentsCount || 0}</span>
                </button>
                <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="send" size={30} color="#fff" />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.sharedCount || 0}</span>
                </button>
                <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: SOCIAL.clips.text, transition: 'all 0.2s ease' }}>
                    <Icon name="bookmark" size={32} color={saved ? '#D9534F' : '#fff'} filled={saved} />
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
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{viewsCount}</span>
                </div>
            </div>

            {shareCopied && (
                <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '8px 16px', borderRadius: 100, fontSize: '0.78rem', fontWeight: 700, zIndex: 50, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(8px)' }}>
                    <Icon name="check" size={14} color="#22c55e" /> Link copied
                </div>
            )}

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Link href={`/agrisocial/profile/${authorId || '#'}`} style={{ color: SOCIAL.clips.text, fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none' }}>
                        @{(authorName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')} · {roleLabel[authorRole || ''] || 'Member'}
                    </Link>
                    {viewerId !== authorId && authorId && (
                        <button
                            onClick={async () => {
                                if (!viewerId) { window.location.href = '/auth/login'; return }
                                if (followLoading) return
                                setFollowLoading(true)
                                const prev = following
                                setFollowing(!prev)
                                try {
                                    await authFetch('/api/social/follow', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ followerId: viewerId, followingId: authorId }),
                                    })
                                } catch { setFollowing(prev) }
                                setFollowLoading(false)
                            }}
                            style={{
                                background: following
                                    ? 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))'
                                    : 'linear-gradient(135deg, rgba(217,83,79,0.55), rgba(217,83,79,0.35))',
                                border: following
                                    ? '1px solid rgba(255,255,255,0.3)'
                                    : '1px solid rgba(217,83,79,0.5)',
                                borderRadius: '100px',
                                padding: '4px 14px',
                                color: SOCIAL.clips.text,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                cursor: followLoading ? 'wait' : 'pointer',
                                transition: 'all 0.25s ease',
                                backdropFilter: 'blur(8px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                                boxShadow: following
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 3px rgba(0,0,0,0.2)'
                                    : 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 6px rgba(0,0,0,0.3)',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            }}
                        >
                            {!viewerId ? '+ Follow' : following ? 'Following' : '+ Follow'}
                        </button>
                    )}
                </div>
                {clip.caption && <p style={{ color: 'rgba(245,245,245,0.9)', fontSize: '0.85rem', margin: '0 0 4px', lineHeight: 1.4 }}>{clip.caption}</p>}
                {clip.hashtags?.length > 0 && <p style={{ color: SOCIAL.clips.muted, fontSize: '0.78rem', margin: 0 }}>{clip.hashtags.slice(0, 4).map(h => `${h.startsWith('#') ? h : '#' + h}`).join(' ')}</p>}
                {clip.audioUrl && (
                    <div style={{ marginTop: 8 }}>
                        <MusicSticker audioUrl={clip.audioUrl} audioTitle={clip.audioTitle || ''} audioArtist={clip.audioArtist} startTime={clip.audioStartTime} autoPlay={isActive} isActive={isActive} userInteracted={userInteracted} compact />
                    </div>
                )}
            </div>

            {/* YouTube-style KrishiClip badge */}
            <div style={{ position: 'absolute', top: '60px', left: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#D9534F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
                <span style={{ color: SOCIAL.clips.text, fontSize: '0.72rem', fontWeight: 800, background: 'rgba(0,0,0,0.5)', borderRadius: '100px', padding: '3px 10px', backdropFilter: 'blur(8px)' }}>KrishiClip</span>
            </div>

            {/* Comments bottom sheet */}
            <BottomSheet open={showComments} onClose={() => setShowComments(false)} title="Comments" height="tall">
                {loadingComments ? (
                    <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={24} color={SOCIAL.muted} /></div>
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

            <ShareSheet
                isOpen={showShareSheet}
                onClose={() => setShowShareSheet(false)}
                postUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/agrisocial/post/${clip._id}`}
                postCaption={clip.caption}
                mediaUrl={clip.mediaUrl}
                mediaType={clip.mediaType}
                allowDownload={clip.allowDownload !== false}
                username={authorName.toLowerCase().replace(/[^a-z0-9]/g, '')}
            />
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
    // userInteracted gates audio autoplay — music only starts after the
    // user first taps/scrolls, not the moment the page opens.
    const [userInteracted, setUserInteracted] = useState(false)
    const [userId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [category, setCategory] = useState('all')
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const [refreshing, setRefreshing] = useState(false)

    const refreshClips = async () => {
        setRefreshing(true)
        pageRef.current = 1
        setHasMore(true)
        try { localStorage.removeItem(`agrieasy:clips:${category}`) } catch {}
        await loadClips(1, false)
        setRefreshing(false)
    }

    // Track clip IDs we've already fired a view event for so we don't
    // re-fire when the same clip scrolls back into view.
    const viewedClipsRef = useRef<Set<string>>(new Set())

    // Per-category cache key (page 1 only). Stale-while-revalidate: show
    // cached clips IMMEDIATELY (0s load), then fetch fresh ones in background.
    const cacheKey = `agrieasy:clips:${category}:p1`

    const loadClips = async (pageNum: number, append: boolean) => {
        try {
            if (append) setLoadingMore(true)
            // First load: show cached clips instantly (0s) before the network
            // call completes. "loading" stays true only if there's no cached
            // data, so repeat visitors see clips immediately.
            if (!append) {
                try {
                    const cached = localStorage.getItem(cacheKey)
                    if (cached) {
                        const parsed = JSON.parse(cached)
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setClips(parsed)
                            setLoading(false)
                        }
                    }
                } catch {}
            }
            const url = category === 'all' ? `/api/social/clips?page=${pageNum}` : `/api/social/clips?page=${pageNum}&category=${category}`
            const res = await authFetch(url)
            if (!res.ok) throw new Error('Server error')
            const d = await res.json()
            const clipsData = d?.data?.clips || d?.clips || []
            const total = d?.meta?.total || d?.data?.meta?.total || 0
            setClips(prev => append ? [...prev, ...clipsData] : clipsData)
            setHasMore(clipsData.length > 0 && (append ? (clips.length + clipsData.length < total) : (clipsData.length < total)))
            pageRef.current = pageNum
            if (!append && pageNum === 1) {
                try { localStorage.setItem(cacheKey, JSON.stringify(clipsData)) } catch {}
            }
        } catch {
            if (!append) {
                // Network error: keep cached clips visible if any, else show
                // the empty state.
                if (clips.length === 0) setLoading(false)
            }
        }
        setLoading(false)
        setLoadingMore(false)
    }

    // Fire the view endpoint ONCE per clip per page session — even if the
    // user scrolls back and forth 100 times, we only hit the server once.
    useEffect(() => {
        if (!clips[activeIdx]?._id) return
        const clipId = clips[activeIdx]._id
        if (viewedClipsRef.current.has(clipId)) return
        viewedClipsRef.current.add(clipId)
        // Fire-and-forget — don't block the UI on this.
        const url = userId
            ? `/api/social/clips/${clipId}/view?userId=${userId}`
            : `/api/social/clips/${clipId}/view`
        authFetch(url, { method: 'POST' }).catch(() => {})
    }, [activeIdx, clips, userId])

    // Preload cached clips synchronously on mount so first paint is instant.
    useEffect(() => {
        try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) {
                const parsed = JSON.parse(cached)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setClips(parsed)
                    setLoading(false)
                }
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [category])

    useEffect(() => {
        pageRef.current = 1
        setHasMore(true)
        // Reset viewed-clips set when category changes so new clips can be viewed again.
        viewedClipsRef.current = new Set()
        void loadClips(1, false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Mark userInteracted=true on the first tap/scroll/keydown in the feed.
    // MusicSticker won't auto-play until then, so music doesn't blast the
    // moment the page opens — only after the user engages.
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        const handler = () => setUserInteracted(true)
        container.addEventListener('pointerdown', handler, { once: true, passive: true })
        container.addEventListener('touchstart', handler, { once: true, passive: true })
        container.addEventListener('scroll', handler, { once: true, passive: true })
        container.addEventListener('wheel', handler, { once: true, passive: true })
        container.addEventListener('keydown', handler, { once: true, passive: true })
        return () => {
            container.removeEventListener('pointerdown', handler)
            container.removeEventListener('touchstart', handler)
            container.removeEventListener('scroll', handler)
            container.removeEventListener('wheel', handler)
            container.removeEventListener('keydown', handler)
        }
    }, [])

    // Track the most-visible clip. Uses 2 thresholds to minimize callbacks.
    useEffect(() => {
        const container = containerRef.current
        if (!container) return
        let lastActiveIdx = -1
        const observer = new IntersectionObserver((entries) => {
            let bestIdx = -1
            let bestRatio = 0
            for (const e of entries) {
                if (e.intersectionRatio > bestRatio) {
                    bestRatio = e.intersectionRatio
                    bestIdx = parseInt((e.target as HTMLElement).dataset.idx || '0')
                }
            }
            if (bestIdx < 0 || bestRatio < 0.4) return
            if (bestIdx === lastActiveIdx) return
            const prevIdx = lastActiveIdx
            lastActiveIdx = bestIdx
            setActiveIdx(bestIdx)
            if (prevIdx >= 0) {
                const prevEl = container.querySelector(`.clip-item[data-idx="${prevIdx}"]`) as HTMLElement | null
                if (prevEl) {
                    const v = prevEl.querySelector('video')
                    if (v) { v.pause(); v.currentTime = 0 }
                    prevEl.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0 })
                }
            }
        }, { root: container, threshold: [0, 0.5] })
        container.querySelectorAll('.clip-item').forEach(el => observer.observe(el))
        return () => observer.disconnect()
    }, [clips])

    return (
        <div style={{ height: '100vh', overflow: 'hidden', background: SOCIAL.clips.bg, fontFamily: SHARED.font, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => router.push('/agrisocial')} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '10px', padding: '8px 12px', color: SOCIAL.clips.text, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>← Back</button>
                <button onClick={refreshClips} style={{ flex: 1, fontWeight: 900, fontSize: '1.1rem', color: SOCIAL.clips.text, display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: refreshing ? 'wait' : 'pointer', padding: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#D9534F', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 1 }}>
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                    KrishiClips
                </button>
                <button onClick={() => router.push('/agrisocial/create?type=krishiclip')} style={{ background: `${SOCIAL.clips.accent}d9`, border: 'none', borderRadius: '10px', padding: '8px 14px', color: SOCIAL.clips.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>+ Create</button>
            </div>

            {/* Category pills */}
            <div style={{ position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 100, display: 'flex', gap: '6px', padding: '8px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: category === c.key ? SOCIAL.clips.accent : 'rgba(255,255,255,0.15)', color: SOCIAL.clips.text, backdropFilter: 'blur(8px)', transition: 'all 0.2s ease' }}>
                        {c.icon} {c.label}
                    </button>
                ))}
            </div>

            {/* Vertical scroll feed */}
            <div ref={containerRef} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                {loading ? (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: SOCIAL.clips.text }}>
                        <Spinner size={36} color="#fff" />
                        <p style={{ fontWeight: 700, fontSize: '0.85rem', opacity: 0.8 }}>Loading KrishiClips…</p>
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
                        <ClipCard clip={clip} viewerId={userId} isActive={idx === activeIdx} userInteracted={userInteracted} onDelete={(id) => setClips(cs => cs.filter(x => x._id !== id))} />
                    </div>
                ))}
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} style={{ height: 1, scrollSnapAlign: 'none' }} />
                {loadingMore && (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.clips.text, gap: 12 }}>
                        <Spinner size={24} color="#fff" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', opacity: 0.8 }}>Loading more clips…</span>
                    </div>
                )}
            </div>
            {/* Instagram-style bottom nav — dark theme for clips page */}
            <AgriSocialBottomNav active="reels" dark />
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}