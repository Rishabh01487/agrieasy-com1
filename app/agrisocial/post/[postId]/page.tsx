'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
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
            const res = await authFetch(`/api/social/posts/${postId}`)
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
        await authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) })
    }

    const handleSave = async () => {
        if (!viewerId || !post) return
        const newSaved = !saved
        setSaved(newSaved)
        try {
            if (newSaved) {
                await authFetch(`/api/social/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: viewerId, postId: post._id }),
                })
            } else {
                await authFetch(`/api/social/save?postId=${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
            }
        } catch {}
    }

    const handleDelete = async () => {
        if (!viewerId || !post) return
        setDeleting(true)
        const res = await authFetch(`/api/social/posts/${post._id}`, {
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
        try {
            const res = await authFetch('/api/social/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id, text: commentText }) })
            if (res.ok) {
                const d = await res.json()
                setComments(c => [...c, d.comment])
                setCommentText('')
            }
        } catch {}
        finally { setPosting(false) }
    }

    if (loading) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>🌾 Loading…</div>
    if (!post) return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
            <span style={{ fontSize: '3rem' }}>🔍</span>
            <p style={{ color: SOCIAL.muted }}>Post not found</p>
            <Link href="/agrisocial" style={{ color: SOCIAL.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to Feed</Link>
        </div>
    )

    const isDeletedUser = !post.userId || typeof post.userId !== 'object'
    const authorName = isDeletedUser ? 'Unknown User' : (post.userId.farmerName || post.userId.firmName || 'User')
    const authorRole = isDeletedUser ? '' : (post.userId.role || '')
    const authorId = isDeletedUser ? '' : post.userId._id
    const ytId = post.mediaUrl ? (post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 50, boxShadow: SHARED.shadow, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <button onClick={() => router.back()} style={{ color: SOCIAL.primary, background: 'none', border: 'none', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>← Back</button>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>{post.type === 'krishiclip' ? '🎬 KrishiClip' : '📷 Post'}</span>
            </nav>

            <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px 60px' }}>
                <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '18px', overflow: 'hidden', boxShadow: SHARED.shadowMd }}>
                    {/* Author header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px' }}>
                        <Link href={`/agrisocial/profile/${authorId}`} style={{ width: '48px', height: '48px', borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.3rem', textDecoration: 'none', flexShrink: 0, transition: 'all 0.2s ease' }}>
                            {authorName[0]?.toUpperCase()}
                        </Link>
                        <div style={{ flex: 1 }}>
                            <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', display: 'block' }}>{authorName}</Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ color: SOCIAL.muted, fontSize: '0.75rem' }}>{roleLabel[authorRole || ''] || '👤 User'}</span>
                                {post.location && <span style={{ color: SOCIAL.muted, fontSize: '0.75rem' }}>📍 {post.location}</span>}
                                <span style={{ background: `${SOCIAL.primary}15`, color: SOCIAL.primary, padding: '2px 8px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700 }}>
                                    {catIcon[post.category]} {post.category}
                                </span>
                            </div>
                        </div>
                        <span style={{ color: SOCIAL.muted, fontSize: '0.72rem' }}>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
                        <div style={{ padding: '18px', borderBottom: `1px solid ${SOCIAL.primaryLight}` }}>
                            <p style={{ color: SOCIAL.text, fontSize: '0.95rem', margin: '0 0 8px', lineHeight: 1.6 }}>
                                <strong>{authorName}</strong>{' '}{post.caption}
                            </p>
                            {post.hashtags?.length > 0 && (
                                <p style={{ color: SOCIAL.primary, fontSize: '0.85rem', margin: '6px 0 0' }}>{post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                            )}
                        </div>
                    )}

                    {/* Action bar */}
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${SOCIAL.primaryLight}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: liked ? SOCIAL.red : SOCIAL.muted, fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                            <span style={{ fontSize: '1.4rem' }}>{liked ? '❤️' : '🤍'}</span>
                            <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: SOCIAL.muted, fontWeight: 700, fontSize: '0.9rem' }}>
                            <span style={{ fontSize: '1.4rem' }}>💬</span>
                            <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
                        </div>
                        <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: saved ? SOCIAL.primary : SOCIAL.muted, fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                            <span style={{ fontSize: '1.4rem' }}>{saved ? '🔖' : '🏷️'}</span>
                            <span>{saved ? 'Saved' : 'Save'}</span>
                        </button>
                        {viewerId && viewerId === authorId && (
                            <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: SOCIAL.muted, fontWeight: 700, fontSize: '0.9rem', marginLeft: 'auto', transition: 'all 0.2s ease' }}>
                                <span style={{ fontSize: '1.2rem' }}>🗑️</span>
                                <span>Delete</span>
                            </button>
                        )}
                        {post.type === 'krishiclip' && !(viewerId && viewerId === authorId) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: SOCIAL.muted, fontWeight: 700, fontSize: '0.9rem', marginLeft: 'auto' }}>
                                <span style={{ fontSize: '1.2rem' }}>👁️</span>
                                <span>{post.views || 0} views</span>
                            </div>
                        )}
                    </div>

                    {/* Delete confirm */}
                    {showDeleteConfirm && (
                        <div style={{ padding: '14px 18px', textAlign: 'center', borderBottom: `1px solid ${SOCIAL.primaryLight}` }}>
                            <p style={{ color: SOCIAL.red, fontSize: '0.9rem', margin: '0 0 10px', fontWeight: 600 }}>Delete this {post.type === 'krishiclip' ? 'KrishiClip' : 'post'}?</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button onClick={handleDelete} disabled={deleting} style={{ background: SOCIAL.red, border: 'none', borderRadius: '8px', padding: '7px 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: deleting ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                                    {deleting ? 'Deleting…' : 'Yes, delete'}
                                </button>
                                <button onClick={() => setShowDeleteConfirm(false)} style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: '8px', padding: '7px 18px', color: SOCIAL.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s ease' }}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Comments list */}
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                        {comments.length === 0 ? (
                            <p style={{ color: SOCIAL.muted, fontSize: '0.85rem', padding: '18px', textAlign: 'center' }}>No comments yet. Be the first! 🌾</p>
                        ) : comments.map((c, i) => {
                            const commenterName = typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'
                            return (
                                <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px 18px', borderBottom: i < comments.length - 1 ? `1px solid ${SOCIAL.bg}` : 'none' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
                                        {commenterName[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ color: SOCIAL.text, fontSize: '0.875rem', margin: 0 }}><strong>{commenterName}</strong>{' '}{c.text}</p>
                                        <p style={{ color: SOCIAL.muted, fontSize: '0.7rem', margin: '3px 0 0' }}>{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add comment */}
                    {viewerId ? (
                        <div style={{ padding: '14px 18px', display: 'flex', gap: '8px', borderTop: `1px solid ${SOCIAL.border}` }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()}
                                placeholder="Add a comment…"
                                style={{ flex: 1, padding: '9px 14px', background: SOCIAL.primaryLight, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '100px', fontSize: '0.875rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font, transition: 'border-color 0.2s, box-shadow 0.2s' }} />
                            <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                style={{ background: SOCIAL.primary, border: 'none', borderRadius: '100px', padding: '9px 18px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', opacity: posting || !commentText.trim() ? 0.6 : 1, transition: 'all 0.2s ease' }}>
                                Post
                            </button>
                        </div>
                    ) : (
                        <div style={{ padding: '14px 18px', textAlign: 'center', borderTop: `1px solid ${SOCIAL.border}` }}>
                            <Link href="/auth/login" style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.875rem' }}>Log in to comment</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}