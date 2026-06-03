'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = {
    bg: '#fffbf5', white: '#ffffff', orange: '#ea580c', orLight: '#fff7ed',
    orMid: '#fed7aa', orDark: '#9a3412', text: '#1c1917', muted: '#78716c',
    border: '#fed7aa', red: '#ef4444',
}
const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
const catColors: Record<string, string> = { farming: '#16a34a', agritrading: '#ea580c', technique: '#6366f1', equipment: '#f59e0b', weather: '#0891b2', livestock: '#a21caf', organic: '#15803d', general: '#78716c' }
const catIcon: Record<string, string> = { farming: '🌾', agritrading: '💰', technique: '🔬', equipment: '🚜', weather: '🌦️', livestock: '🐄', organic: '🌱', general: '📢' }

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Comment { _id: string; userId: User | { farmerName?: string; firmName?: string }; text: string; createdAt: string }
interface Post {
    _id: string; userId: User; type: string; mediaUrl?: string; mediaType?: string
    caption: string; hashtags: string[]; category: string; likes: string[]
    likesCount: number; commentsCount: number; comments: Comment[]; createdAt: string; location?: string; views?: number
    savedBy?: string[]; savedCount?: number
}

export default function PostDetail({ params }: { params: Promise<{ postId: string }> }) {
    const { postId } = use(params)
    const router = useRouter()
    const [post, setPost] = useState<Post | null>(null)
    const [loading, setLoading] = useState(true)
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [liked, setLiked] = useState(false)
    const [likesCount, setLikesCount] = useState(0)
    const [saved, setSaved] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [comments, setComments] = useState<Comment[]>([])
    const [posting, setPosting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        const load = async () => {
            const res = await fetch(`/api/social/posts/${postId}`)
            if (res.ok) {
                const d = await res.json()
                const found = d.post
                setPost(found)
                setLiked(viewerId ? found.likes?.includes(viewerId) : false)
                setLikesCount(found.likesCount || 0)
                setSaved(viewerId ? found.savedBy?.includes(viewerId) : false)
                setComments(found.comments || [])
            }
            setLoading(false)
        }
        void load()
    }, [postId, viewerId])

    const handleLike = async () => {
        if (!viewerId || !post) return
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        await fetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) })
    }

    const handleSave = async () => {
        if (!viewerId || !post) return
        const newSaved = !saved
        setSaved(newSaved)
        await fetch(`/api/social/save`, {
            method: newSaved ? 'POST' : 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: newSaved ? JSON.stringify({ userId: viewerId, postId: post._id }) : undefined,
        })
    }

    const handleDelete = async () => {
        if (!viewerId || !post) return
        setDeleting(true)
        const res = await fetch(`/api/social/posts/${post._id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: viewerId }),
        })
        if (res.ok) router.push('/agrisocial')
        else setShowDeleteConfirm(false)
        setDeleting(false)
    }

    const handleComment = async () => {
        if (!commentText.trim() || !viewerId || !post) return
        setPosting(true)
        const res = await fetch('/api/social/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id, text: commentText }) })
        if (res.ok) {
            const d = await res.json()
            setComments(c => [...c, d.comment])
            setCommentText('')
        }
        setPosting(false)
    }

    if (loading) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.orange, fontWeight: 700, fontFamily: '"Inter",sans-serif' }}>🌾 Loading…</div>
    if (!post) return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: '"Inter",sans-serif' }}>
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <p style={{ color: C.muted }}>Post not found</p>
            <Link href="/agrisocial" style={{ color: C.orange, fontWeight: 700, textDecoration: 'none' }}>← Back to Feed</Link>
        </div>
    )

    const authorName = typeof post.userId === 'object' ? (post.userId.farmerName || post.userId.firmName || 'User') : 'User'
    const authorRole = typeof post.userId === 'object' ? post.userId.role : ''
    const authorId = typeof post.userId === 'object' ? post.userId._id : post.userId
    const ytId = post.mediaUrl ? (post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(234,88,12,0.06)' }}>
                <button onClick={() => router.back()} style={{ color: C.orange, background: 'none', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>← Back</button>
                <span style={{ color: C.muted }}>›</span>
                <span style={{ fontWeight: 700, color: C.text }}>{post.type === 'krishiclip' ? '🎬 KrishiClip' : '📷 Post'}</span>
            </nav>

            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px 60px' }}>
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(234,88,12,0.07)' }}>
                    {/* Author header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
                        <Link href={`/agrisocial/profile/${authorId}`} style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.3rem', textDecoration: 'none', flexShrink: 0 }}>
                            {authorName[0]?.toUpperCase()}
                        </Link>
                        <div style={{ flex: 1 }}>
                            <Link href={`/agrisocial/profile/${authorId}`} style={{ color: C.text, fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', display: 'block' }}>{authorName}</Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ color: C.muted, fontSize: '0.75rem' }}>{roleLabel[authorRole || ''] || '👤 User'}</span>
                                {post.location && <span style={{ color: C.muted, fontSize: '0.75rem' }}>📍 {post.location}</span>}
                                <span style={{ background: `${catColors[post.category] || C.orange}15`, color: catColors[post.category] || C.orange, padding: '2px 8px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700 }}>
                                    {catIcon[post.category]} {post.category}
                                </span>
                            </div>
                        </div>
                        <span style={{ color: C.muted, fontSize: '0.72rem' }}>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    {/* Media */}
                    {ytId ? (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                            <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="KrishiClip" />
                        </div>
                    ) : post.mediaUrl && post.mediaType === 'image' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.mediaUrl} alt="post" style={{ width: '100%', maxHeight: '600px', objectFit: 'cover', display: 'block' }} />
                    ) : post.mediaUrl && post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '600px', display: 'block', background: '#000' }} />
                    ) : null}

                    {/* Caption */}
                    {post.caption && (
                        <div style={{ padding: '16px', borderBottom: `1px solid ${C.orLight}` }}>
                            <p style={{ color: C.text, fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.6 }}>
                                <strong>{authorName}</strong>{' '}{post.caption}
                            </p>
                            {post.hashtags?.length > 0 && (
                                <p style={{ color: C.orange, fontSize: '0.85rem', margin: '6px 0 0' }}>{post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                            )}
                        </div>
                    )}

                    {/* Action bar */}
                    <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.orLight}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: liked ? C.red : C.muted, fontWeight: 700, fontSize: '0.9rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>{liked ? '❤️' : '🤍'}</span>
                            <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.muted, fontWeight: 700, fontSize: '0.9rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>💬</span>
                            <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                        </div>
                        <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: saved ? C.orange : C.muted, fontWeight: 700, fontSize: '0.9rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>{saved ? '🔖' : '🏷️'}</span>
                            <span>{saved ? 'Saved' : 'Save'}</span>
                        </button>
                        {viewerId && viewerId === (typeof post.userId === 'object' ? post.userId._id : post.userId) && (
                            <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: C.muted, fontWeight: 700, fontSize: '0.9rem', marginLeft: 'auto' }}>
                                <span style={{ fontSize: '1.2rem' }}>🗑️</span>
                                <span>Delete</span>
                            </button>
                        )}
                        {post.type === 'krishiclip' && !(viewerId && viewerId === (typeof post.userId === 'object' ? post.userId._id : post.userId)) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.muted, fontWeight: 700, fontSize: '0.9rem', marginLeft: 'auto' }}>
                                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                                <span>{post.views || 0} views</span>
                            </div>
                        )}
                    </div>

                    {/* Delete confirm */}
                    {showDeleteConfirm && (
                        <div style={{ padding: '12px 16px', textAlign: 'center', borderBottom: `1px solid ${C.orLight}` }}>
                            <p style={{ color: C.red, fontSize: '0.9rem', margin: '0 0 10px', fontWeight: 600 }}>Delete this {post.type === 'krishiclip' ? 'KrishiClip' : 'post'}?</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={handleDelete} disabled={deleting} style={{ background: C.red, border: 'none', borderRadius: '8px', padding: '7px 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.7 : 1 }}>
                                    {deleting ? 'Deleting…' : 'Yes, delete'}
                                </button>
                                <button onClick={() => setShowDeleteConfirm(false)} style={{ background: C.orLight, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '7px 18px', color: C.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                        {comments.length === 0 ? (
                            <p style={{ color: C.muted, fontSize: '0.85rem', padding: '16px', textAlign: 'center' }}>No comments yet. Be the first! 🌾</p>
                        ) : comments.map((c, i) => {
                            const commenterName = typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'
                            return (
                                <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 16px', borderBottom: i < comments.length - 1 ? `1px solid ${C.bg}` : 'none' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orMid}, ${C.orange})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                                        {commenterName[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ color: C.text, fontSize: '0.875rem', margin: 0 }}><strong>{commenterName}</strong>{' '}{c.text}</p>
                                        <p style={{ color: C.muted, fontSize: '0.7rem', margin: '3px 0 0' }}>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add comment */}
                    {viewerId ? (
                        <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', borderTop: `1px solid ${C.border}` }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()}
                                placeholder="Add a comment…"
                                style={{ flex: 1, padding: '9px 14px', background: C.orLight, border: `1.5px solid ${C.border}`, borderRadius: '100px', fontSize: '0.875rem', outline: 'none', color: C.text }} />
                            <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                style={{ background: C.orange, border: 'none', borderRadius: '100px', padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: posting || !commentText.trim() ? 0.6 : 1 }}>
                                Post
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '12px 16px', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
                            <Link href="/auth/login" style={{ color: C.orange, fontWeight: 700, fontSize: '0.875rem' }}>Log in to comment</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
