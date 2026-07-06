'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }
const catIcon: Record<string, string> = { farming: '🌾', agritrading: '💰', technique: '🔬', equipment: '🚜', weather: '🌦️', livestock: '🐄', organic: '🌱', general: '📢' }

const CATEGORIES = [
    { key: 'all', label: 'All Posts', icon: '🌍' },
    { key: 'farming', label: 'Farming', icon: '🌾' },
    { key: 'agritrading', label: 'Trading', icon: '💰' },
    { key: 'technique', label: 'Technique', icon: '🔬' },
    { key: 'equipment', label: 'Equipment', icon: '🚜' },
    { key: 'livestock', label: 'Livestock', icon: '🐄' },
    { key: 'organic', label: 'Organic', icon: '🌱' },
]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string }
interface Comment { _id: string; userId: User | string; text: string; createdAt: string }
interface Post {
    _id: string; userId: User; type: string; mediaUrl?: string; mediaType?: string
    caption: string; hashtags: string[]; category: string; likes: string[]
    likesCount: number; commentsCount: number; comments?: Comment[]; createdAt: string; location?: string
    savedBy?: string[]; savedCount?: number
}

function PostCard({ post, viewerId, onLike, onDelete }: { post: Post; viewerId: string; onLike: (id: string, liked: boolean, count: number) => void; onDelete?: (id: string) => void }) {
    const [liked, setLiked] = useState(viewerId ? post.likes?.includes(viewerId) : false)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [saved, setSaved] = useState(viewerId ? post.savedBy?.includes(viewerId) : false)
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [comments, setComments] = useState<Comment[]>(post.comments || [])
    const [posting, setPosting] = useState(false)
    const [imgErr, setImgErr] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isDeletedUser = !post.userId || typeof post.userId !== 'object'
    const authorName = isDeletedUser ? 'Unknown User' : (post.userId.farmerName || post.userId.firmName || 'User')
    const authorRole = isDeletedUser ? '' : (post.userId.role || '')
    const authorId = isDeletedUser ? '' : post.userId._id
    const isOwner = viewerId && viewerId === authorId

    const handleLike = async () => {
        if (!viewerId) return
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        onLike(post._id, newLiked, newLiked ? likesCount + 1 : likesCount - 1)
        try { await authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) }) } catch {}
    }

    const handleComment = async () => {
        if (!commentText.trim() || !viewerId) return
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

    const handleSave = async () => {
        if (!viewerId) return
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
        if (!viewerId) return
        try {
            const res = await authFetch(`/api/social/posts/${post._id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: viewerId }),
            })
            if (res.ok) onDelete?.(post._id)
            else setShowDeleteConfirm(false)
        } catch { setShowDeleteConfirm(false) }
    }

    const ytId = post.mediaUrl ? (post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '18px', overflow: 'hidden', marginBottom: '16px', boxShadow: SHARED.shadowMd }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px' }}>
                <Link href={`/agrisocial/profile/${authorId}`} style={{ textDecoration: 'none' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${SOCIAL.primary}, ${SOCIAL.textSecondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0, transition: 'all 0.2s ease' }}>
                        {authorName[0]?.toUpperCase() || 'U'}
                    </div>
                </Link>
                <div style={{ flex: 1 }}>
                    <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', display: 'block' }}>{authorName}</Link>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0 }}>
                        {roleLabel[authorRole || ''] || '👤 User'}
                        {post.location ? ` · 📍 ${post.location}` : ''}
                        {' · '}{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                </div>
                <span style={{ background: `${SOCIAL.primary}18`, color: SOCIAL.primary, padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                    {catIcon[post.category]} {post.category}
                </span>
            </div>

            {/* Caption first (above image) */}
            {post.caption && (
                <div style={{ padding: '0 18px 12px' }}>
                    <p style={{ color: SOCIAL.text, fontSize: '0.92rem', margin: 0, lineHeight: 1.55 }}>
                        <strong>{authorName}</strong>{' '}{post.caption}
                    </p>
                    {post.hashtags?.length > 0 && (
                        <p style={{ color: SOCIAL.primary, fontSize: '0.82rem', margin: '5px 0 0' }}>
                            {post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                        </p>
                    )}
                </div>
            )}

            {/* Media */}
            {ytId ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }}>
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Post" />
                </div>
            ) : post.mediaUrl && post.mediaType === 'image' && !imgErr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.mediaUrl} alt="post" onError={() => setImgErr(true)} style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
            ) : post.mediaUrl && post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '400px', display: 'block', background: '#000' }} />
            ) : null}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 18px', borderTop: `1px solid ${SOCIAL.primaryLight}` }}>
                <button onClick={handleLike}
                    style={{ background: liked ? '#fff0f0' : 'none', border: liked ? '1.5px solid #fca5a5' : 'none', borderRadius: '100px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: liked ? SOCIAL.red : SOCIAL.muted, fontSize: '0.88rem', fontWeight: 700, padding: liked ? '5px 10px' : '5px 6px', transition: 'all 0.2s ease' }}>
                    {liked ? '❤️' : '🤍'} {likesCount}
                </button>
                <button onClick={() => setShowComments(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: SOCIAL.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px', transition: 'all 0.2s ease' }}>
                    💬 {comments.length}
                </button>
                <button onClick={handleSave}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: saved ? SOCIAL.primary : SOCIAL.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px', transition: 'all 0.2s ease' }}>
                    {saved ? '🔖' : '🏷️'}
                </button>
                {isOwner && (
                    <button onClick={() => setShowDeleteConfirm(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: SOCIAL.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px', transition: 'all 0.2s ease' }}>
                        🗑️
                    </button>
                )}
                <Link href={`/agrisocial/post/${post._id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: SOCIAL.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px', textDecoration: 'none', marginLeft: 'auto', transition: 'all 0.2s ease' }}>
                    🔗 View
                </Link>
            </div>

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div style={{ borderTop: `1px solid ${SOCIAL.primaryLight}`, padding: '10px 18px', textAlign: 'center' }}>
                    <p style={{ color: SOCIAL.red, fontSize: '0.85rem', margin: '0 0 8px', fontWeight: 600 }}>Delete this post?</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={handleDelete} style={{ background: SOCIAL.red, border: 'none', borderRadius: '8px', padding: '6px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s ease' }}>Yes, delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: '8px', padding: '6px 16px', color: SOCIAL.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.2s ease' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Comments */}
            {showComments && (
                <div style={{ borderTop: `1px solid ${SOCIAL.primaryLight}`, padding: '12px 18px' }}>
                    {comments.length === 0 && <p style={{ color: SOCIAL.muted, fontSize: '0.82rem', margin: '0 0 8px', textAlign: 'center' }}>No comments yet — be first! 🌾</p>}
                    {comments.slice(-3).map((c: Comment, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: SOCIAL.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                                {typeof c.userId === 'object' ? ((c.userId as User).farmerName || 'U')[0]?.toUpperCase() : 'U'}
                            </div>
                            <p style={{ color: SOCIAL.text, fontSize: '0.82rem', margin: 0, paddingTop: '4px' }}>
                                <strong>{typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'}</strong>{' '}{c.text}
                            </p>
                        </div>
                    ))}
                    {viewerId ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()} placeholder="Add a comment…"
                                style={{ flex: 1, padding: '7px 12px', background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: '100px', fontSize: '0.82rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font, transition: 'border-color 0.2s' }} />
                            <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                style={{ background: SOCIAL.primary, border: 'none', borderRadius: '100px', padding: '7px 14px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: posting ? 0.6 : 1, transition: 'all 0.2s ease' }}>Post</button>
                        </div>
                    ) : (
                        <Link href="/auth/login" style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>Log in to comment</Link>
                    )}
                </div>
            )}
        </div>
    )
}

export default function AgriSocialFeed() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [category, setCategory] = useState('all')
    const [userId] = useState(() => { try { return typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '' } catch { return '' } })
    const router = useRouter()

    const fetchPosts = useCallback(async (uid: string, cat: string) => {
        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({ page: '1' })
            if (uid) params.set('userId', uid)
            if (cat && cat !== 'all') params.set('category', cat)
            const res = await authFetch(`/api/social/posts?${params}`)
            if (!res.ok) throw new Error('Server error')
            const d = await res.json()
            setPosts(d.posts || [])
        } catch {
            setError('Could not load posts. Please check your connection.')
            setPosts([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPosts(userId, category).catch(() => {})
    }, [fetchPosts, userId, category])

    const handleLike = (postId: string, liked: boolean, count: number) => {
        setPosts(ps => ps.map(p => p._id === postId ? { ...p, liked, likesCount: count } : p))
    }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            {/* Sticky Nav */}
            <nav style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', boxShadow: SHARED.shadow, position: 'sticky', top: 0, zIndex: 50, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🌾</div>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: SOCIAL.textSecondary }}>Agri<span style={{ color: SOCIAL.primary }}>Social</span></span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[['/agrisocial', '🏠'], ['/agrisocial/clips', '🎬'], ['/agrisocial/explore', '🔍'], [userId ? `/agrisocial/profile/${userId}` : '/auth/login', '👤']].map(([href, icon]) => (
                        <Link key={href} href={href} style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', textDecoration: 'none', background: SOCIAL.primaryLight, transition: 'all 0.2s ease' }}>
                            {icon}
                        </Link>
                    ))}
                    <button onClick={() => router.push('/agrisocial/create')}
                        style={{ marginLeft: '4px', background: SOCIAL.primary, border: 'none', borderRadius: '10px', padding: '0 14px', height: '36px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        + Create
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: '620px', margin: '0 auto', padding: '16px 14px 80px' }}>

                {/* Category filter tabs */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '6px', scrollbarWidth: 'none' }}>
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', background: category === c.key ? SOCIAL.primary : SOCIAL.white, border: `1.5px solid ${category === c.key ? SOCIAL.primary : SOCIAL.border}`, borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700, color: category === c.key ? '#fff' : SOCIAL.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                {/* Create post CTA */}
                <div onClick={() => router.push('/agrisocial/create')}
                    style={{ background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '16px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', cursor: 'pointer', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                        {userId ? userId[0]?.toUpperCase() : '🌾'}
                    </div>
                    <div style={{ flex: 1, padding: '9px 14px', background: SOCIAL.primaryLight, borderRadius: '100px', color: SOCIAL.muted, fontSize: '0.875rem' }}>What&apos;s happening on your farm today?</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '1.1rem' }}>📸</span>
                        <span style={{ fontSize: '1.1rem' }}>🎬</span>
                    </div>
                </div>

                {/* Posts */}
                {loading ? (
                    <div>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ background: SOCIAL.white, borderRadius: '18px', border: `1px solid ${SOCIAL.border}`, padding: '18px', marginBottom: '16px', boxShadow: SHARED.shadow }}>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: SOCIAL.border, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}><div style={{ height: '14px', background: SOCIAL.primaryLight, borderRadius: '4px', marginBottom: '6px', width: '60%' }} /><div style={{ height: '10px', background: SOCIAL.primaryLight, borderRadius: '4px', width: '40%' }} /></div>
                                </div>
                                <div style={{ height: '200px', background: SOCIAL.primaryLight, borderRadius: '12px' }} />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '18px', padding: '40px 24px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📡</div>
                        <h3 style={{ color: SOCIAL.textSecondary, margin: '0 0 8px' }}>Could not connect to server</h3>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.88rem', margin: '0 0 20px' }}>MongoDB Atlas might be paused. Check your connection.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => fetchPosts(userId, category)}
                                style={{ padding: '10px 20px', background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Try Again</button>
                            <Link href="/agrisocial/create"
                                style={{ padding: '10px 20px', background: SOCIAL.primaryLight, color: SOCIAL.textSecondary, border: `1px solid ${SOCIAL.border}`, borderRadius: '10px', fontWeight: 700, textDecoration: 'none', transition: 'all 0.2s ease' }}>+ Create Post</Link>
                        </div>
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '18px', padding: '48px 24px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{category === 'all' ? '🌾' : catIcon[category] || '📢'}</div>
                        <h3 style={{ color: SOCIAL.textSecondary, margin: '0 0 8px' }}>{category === 'all' ? 'No posts yet!' : `No ${category} posts yet`}</h3>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.9rem', margin: '0 0 20px' }}>
                            {category === 'all' ? 'Be the first AgriSocial creator! Share your farm, crops, prices & techniques.' : `Be the first to post about ${category}!`}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => router.push('/agrisocial/create')}
                                style={{ padding: '11px 22px', background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                                📸 Create First Post
                            </button>
                            <Link href="/agrisocial/explore"
                                style={{ padding: '11px 22px', background: SOCIAL.primaryLight, color: SOCIAL.textSecondary, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                                🔍 Explore
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.75rem', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {category === 'all' ? `${posts.length} posts from the community` : `${posts.length} ${category} posts`}
                        </p>
                        {posts.map(p => <PostCard key={p._id} post={p} viewerId={userId} onLike={handleLike} onDelete={(id) => setPosts(ps => ps.filter(x => x._id !== id))} />)}
                    </>
                )}

            </div>

            {/* Bottom nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.85)', borderTop: `1px solid ${SOCIAL.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 50, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                {[['🏠', 'Feed', '/agrisocial'], ['🎬', 'Clips', '/agrisocial/clips'], ['➕', 'Create', '/agrisocial/create'], ['🔍', 'Explore', '/agrisocial/explore'], ['👤', 'Profile', userId ? `/agrisocial/profile/${userId}` : '/auth/login']].map(([icon, label, href]) => (
                    <Link key={label} href={href}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: SOCIAL.muted, fontSize: '0.6rem', fontWeight: 700, gap: '2px', flex: 1, transition: 'all 0.2s ease' }}>
                        <span style={{ fontSize: '1.3rem' }}>{icon}</span>{label}
                    </Link>
                ))}
            </div>
        </div>
    )
}