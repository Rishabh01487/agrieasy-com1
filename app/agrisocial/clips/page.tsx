'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = {
    bg: '#000', white: '#ffffff', orange: '#ea580c', orLight: '#fff7ed',
    orMid: '#fed7aa', orDark: '#9a3412', text: '#1c1917', muted: '#78716c',
    border: '#fed7aa', red: '#ef4444',
}

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
const CATEGORIES = [
    { key: 'all', label: 'All' }, { key: 'farming', label: '🌾 Farming' }, { key: 'technique', label: '🔬 Technique' },
    { key: 'agritrading', label: '💰 Trading' }, { key: 'equipment', label: '🚜 Equipment' }, { key: 'organic', label: '🌱 Organic' },
]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Clip { _id: string; userId: User; mediaUrl?: string; mediaType?: string; caption: string; hashtags: string[]; category: string; likes: string[]; likesCount: number; views: number; createdAt: string; savedBy?: string[]; savedCount?: number }

function ClipCard({ clip, viewerId, isActive, onDelete }: { clip: Clip; viewerId: string; isActive: boolean; onDelete?: (id: string) => void }) {
    const [liked, setLiked] = useState(viewerId ? clip.likes?.includes(viewerId) : false)
    const [likesCount, setLikesCount] = useState(clip.likesCount || 0)
    const [saved, setSaved] = useState(viewerId ? clip.savedBy?.includes(viewerId) : false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current) {
            if (isActive) { videoRef.current.play().catch(() => null) }
            else { videoRef.current.pause() }
        }
    }, [isActive])

    const isDeletedUser = !clip.userId || typeof clip.userId !== 'object'
    const authorName = isDeletedUser ? 'Unknown User' : (clip.userId.farmerName || clip.userId.firmName || 'User')
    const authorRole = isDeletedUser ? '' : clip.userId.role
    const authorId = isDeletedUser ? '' : clip.userId._id
    const isOwner = viewerId && viewerId === authorId

    const handleLike = async () => {
        if (!viewerId) return
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        await fetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: clip._id }) })
    }

    const handleSave = async () => {
        if (!viewerId) return
        const newSaved = !saved
        setSaved(newSaved)
        await fetch(`/api/social/save`, {
            method: newSaved ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: newSaved ? JSON.stringify({ userId: viewerId, postId: clip._id }) : undefined,
        })
    }

    const handleDelete = async () => {
        if (!viewerId) return
        const res = await fetch(`/api/social/posts/${clip._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: viewerId }),
        })
        if (res.ok) onDelete?.(clip._id)
        else setShowDeleteConfirm(false)
    }

    const ytId = clip.mediaUrl ? (clip.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', scrollSnapAlign: 'start', flexShrink: 0 }}>
            {/* Media */}
            {ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=${isActive ? 1 : 0}&mute=0&loop=1&playlist=${ytId}`}
                    style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }} allowFullScreen title="KrishiClip" allow="autoplay" />
            ) : clip.mediaUrl && clip.mediaType === 'video' ? (
                <video ref={videoRef} src={clip.mediaUrl} loop muted={false} playsInline controls={false}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }} />
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

            {/* Right action bar */}
            <div style={{ position: 'absolute', right: '16px', bottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem', border: '2px solid #fff' }}>
                    {authorName[0]?.toUpperCase()}
                </div>
                <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#fff' }}>
                    <span style={{ fontSize: '1.8rem' }}>{liked ? '❤️' : '🤍'}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{likesCount}</span>
                </button>
                <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#fff' }}>
                    <span style={{ fontSize: '1.8rem' }}>{saved ? '🔖' : '🏷️'}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{saved ? 'Saved' : 'Save'}</span>
                </button>
                {isOwner && (
                    <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#fff' }}>
                        <span style={{ fontSize: '1.8rem' }}>🗑️</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>Delete</span>
                    </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#fff' }}>
                    <span style={{ fontSize: '1.8rem' }}>👁️</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{clip.views || 0}</span>
                </div>
            </div>

            {/* Delete confirm overlay */}
            {showDeleteConfirm && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>Delete this KrishiClip?</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handleDelete} style={{ background: C.red, border: 'none', borderRadius: '10px', padding: '10px 22px', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Yes, delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px', padding: '10px 22px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Bottom info */}
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '72px' }}>
                <Link href={`/agrisocial/profile/${authorId || '#'}`} style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
                    @{authorName} · {roleLabel[authorRole || ''] || '👤'}
                </Link>
                {clip.caption && <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', margin: '0 0 4px', lineHeight: 1.4 }}>{clip.caption}</p>}
                {clip.hashtags?.length > 0 && <p style={{ color: C.orMid, fontSize: '0.78rem', margin: 0 }}>{clip.hashtags.slice(0, 4).map(h => `${h.startsWith('#') ? h : '#' + h}`).join(' ')}</p>}
            </div>

            {/* KrishiClips badge */}
            <div style={{ position: 'absolute', top: '60px', left: '16px', background: 'rgba(234,88,12,0.85)', borderRadius: '100px', padding: '4px 12px', backdropFilter: 'blur(8px)' }}>
                <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>🎬 KrishiClip</span>
            </div>
        </div>
    )
}

export default function KrishiClips() {
    const [clips, setClips] = useState<Clip[]>([])
    const [loading, setLoading] = useState(true)
    const [activeIdx, setActiveIdx] = useState(0)
    const [userId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [category, setCategory] = useState('all')
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()


    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const url = category === 'all' ? '/api/social/clips?page=1' : `/api/social/clips?page=1&category=${category}`
            const res = await fetch(url)
            const d = await res.json()
            setClips(d.clips || [])
            setLoading(false)
        }
        void load()
    }, [category])

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
        <div style={{ height: '100vh', overflow: 'hidden', background: '#000', fontFamily: '"Inter","Segoe UI",sans-serif', position: 'relative' }}>
            {/* Top bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={() => router.push('/agrisocial')} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '10px', padding: '8px 12px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, backdropFilter: 'blur(8px)' }}>← Back</button>
                <div style={{ flex: 1, fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>🎬 KrishiClips</div>
                <button onClick={() => router.push('/agrisocial/create?type=krishiclip')} style={{ background: 'rgba(234,88,12,0.85)', border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800, backdropFilter: 'blur(8px)' }}>+ Create</button>
            </div>

            {/* Category pills */}
            <div style={{ position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 100, display: 'flex', gap: '6px', padding: '8px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setCategory(c.key)}
                        style={{ padding: '5px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap', background: category === c.key ? C.orange : 'rgba(255,255,255,0.15)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                        {c.label}
                    </button>
                ))}
            </div>

            {/* Vertical scroll feed */}
            <div ref={containerRef} style={{ height: '100vh', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>
                {loading ? (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#fff' }}>
                        <span style={{ fontSize: '3rem' }}>🎬</span>
                        <p style={{ fontWeight: 700 }}>Loading KrishiClips…</p>
                    </div>
                ) : clips.length === 0 ? (
                    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#fff', textAlign: 'center', padding: '24px' }}>
                        <span style={{ fontSize: '3rem' }}>🌾</span>
                        <h2>No KrishiClips yet</h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)' }}>Be the first to share a farming clip!</p>
                        <button onClick={() => router.push('/agrisocial/create?type=krishiclip')} style={{ background: C.orange, border: 'none', borderRadius: '12px', padding: '12px 24px', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '1rem' }}>+ Create KrishiClip</button>
                    </div>
                ) : clips.map((clip, idx) => (
                    <div key={clip._id} className="clip-item" data-idx={idx.toString()}>
                        <ClipCard clip={clip} viewerId={userId} isActive={idx === activeIdx} onDelete={(id) => setClips(cs => cs.filter(x => x._id !== id))} />
                    </div>
                ))}
            </div>
        </div>
    )
}
