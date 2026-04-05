'use client'

import { useEffect, useState, useCallback } from 'react'
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
}

function PostCard({ post, viewerId, onLike }: { post: Post; viewerId: string; onLike: (id: string, liked: boolean, count: number) => void }) {
    const [liked, setLiked] = useState(viewerId ? post.likes?.includes(viewerId) : false)
    const [likesCount, setLikesCount] = useState(post.likesCount || 0)
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [comments, setComments] = useState<Comment[]>(post.comments || [])
    const [posting, setPosting] = useState(false)
    const [imgErr, setImgErr] = useState(false)

    const authorName = typeof post.userId === 'object' ? (post.userId.farmerName || post.userId.firmName || 'User') : 'User'
    const authorRole = typeof post.userId === 'object' ? post.userId.role : ''
    const authorId = typeof post.userId === 'object' ? post.userId._id : post.userId

    const handleLike = async () => {
        if (!viewerId) return
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        onLike(post._id, newLiked, newLiked ? likesCount + 1 : likesCount - 1)
        await fetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) })
    }

    const handleComment = async () => {
        if (!commentText.trim() || !viewerId) return
        setPosting(true)
        const res = await fetch('/api/social/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id, text: commentText }) })
        if (res.ok) {
            const d = await res.json()
            setComments(c => [...c, d.comment])
            setCommentText('')
        }
        setPosting(false)
    }

    const ytId = post.mediaUrl ? (post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '18px', overflow: 'hidden', marginBottom: '16px', boxShadow: '0 2px 12px rgba(234,88,12,0.07)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                <Link href={`/agrisocial/profile/${authorId}`} style={{ textDecoration: 'none' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                        {authorName[0]?.toUpperCase() || 'U'}
                    </div>
                </Link>
                <div style={{ flex: 1 }}>
                    <Link href={`/agrisocial/profile/${authorId}`} style={{ color: C.text, fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', display: 'block' }}>{authorName}</Link>
                    <p style={{ color: C.muted, fontSize: '0.72rem', margin: 0 }}>
                        {roleLabel[authorRole || ''] || '👤 User'}
                        {post.location ? ` · 📍 ${post.location}` : ''}
                        {' · '}{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                </div>
                <span style={{ background: `${catColors[post.category] || C.orange}18`, color: catColors[post.category] || C.orange, padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                    {catIcon[post.category]} {post.category}
                </span>
            </div>

            {/* Caption first (above image) */}
            {post.caption && (
                <div style={{ padding: '0 16px 10px' }}>
                    <p style={{ color: C.text, fontSize: '0.92rem', margin: 0, lineHeight: 1.55 }}>
                        <strong>{authorName}</strong>{' '}{post.caption}
                    </p>
                    {post.hashtags?.length > 0 && (
                        <p style={{ color: C.orange, fontSize: '0.82rem', margin: '5px 0 0' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderTop: `1px solid ${C.orLight}` }}>
                <button onClick={handleLike}
                    style={{ background: liked ? '#fff0f0' : 'none', border: liked ? '1.5px solid #fca5a5' : 'none', borderRadius: '100px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: liked ? C.red : C.muted, fontSize: '0.88rem', fontWeight: 700, padding: liked ? '5px 10px' : '5px 6px', transition: 'all 0.15s' }}>
                    {liked ? '❤️' : '🤍'} {likesCount}
                </button>
                <button onClick={() => setShowComments(s => !s)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: C.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px' }}>
                    💬 {comments.length}
                </button>
                <Link href={`/agrisocial/post/${post._id}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: C.muted, fontSize: '0.88rem', fontWeight: 700, padding: '5px 6px', textDecoration: 'none', marginLeft: 'auto' }}>
                    🔗 View
                </Link>
            </div>

            {/* Comments */}
            {showComments && (
                <div style={{ borderTop: `1px solid ${C.orLight}`, padding: '10px 16px' }}>
                    {comments.length === 0 && <p style={{ color: C.muted, fontSize: '0.82rem', margin: '0 0 8px', textAlign: 'center' }}>No comments yet — be first! 🌾</p>}
                    {comments.slice(-3).map((c: Comment, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.orMid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                                {typeof c.userId === 'object' ? ((c.userId as User).farmerName || 'U')[0]?.toUpperCase() : 'U'}
                            </div>
                            <p style={{ color: C.text, fontSize: '0.82rem', margin: 0, paddingTop: '4px' }}>
                                <strong>{typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'}</strong>{' '}{c.text}
                            </p>
                        </div>
                    ))}
                    {viewerId ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()} placeholder="Add a comment…"
                                style={{ flex: 1, padding: '7px 12px', background: C.orLight, border: `1px solid ${C.border}`, borderRadius: '100px', fontSize: '0.82rem', outline: 'none', color: C.text }} />
                            <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                style={{ background: C.orange, border: 'none', borderRadius: '100px', padding: '7px 14px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', opacity: posting ? 0.6 : 1 }}>Post</button>
                        </div>
                    ) : (
                        <Link href="/auth/login" style={{ color: C.orange, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>Log in to comment</Link>
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
    const [userId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const router = useRouter()

    const fetchPosts = useCallback(async (uid: string, cat: string) => {
        setLoading(true)
        setError('')
        try {
            const params = new URLSearchParams({ page: '1' })
            if (uid) params.set('userId', uid)
            if (cat && cat !== 'all') params.set('category', cat)
            const res = await fetch(`/api/social/posts?${params}`)
            if (!res.ok) throw new Error('Server error')
            const d = await res.json()
            setPosts(d.posts || [])
        } catch {
            setError('Could not load posts. Please check your connection.')
            setPosts([])
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        void fetchPosts(userId, category)
    }, [fetchPosts, userId, category])

    const handleLike = (postId: string, liked: boolean, count: number) => {
        setPosts(ps => ps.map(p => p._id === postId ? { ...p, liked, likesCount: count } : p))
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            {/* Sticky Nav */}
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '0 20px', boxShadow: '0 1px 8px rgba(234,88,12,0.08)', position: 'sticky', top: 0, zIndex: 50, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🌾</div>
                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: C.orDark }}>Agri<span style={{ color: C.orange }}>Social</span></span>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[['/', '🏠'], ['/agrisocial/clips', '🎬'], ['/agrisocial/explore', '🔍'], [userId ? `/agrisocial/profile/${userId}` : '/auth/login', '👤']].map(([href, icon]) => (
                        <Link key={href} href={href} style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', textDecoration: 'none', background: C.orLight }}>
                            {icon}
                        </Link>
                    ))}
                    <button onClick={() => router.push('/agrisocial/create')}
                        style={{ marginLeft: '4px', background: C.orange, border: 'none', borderRadius: '10px', padding: '0 14px', height: '36px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                        + Create
                    </button>
                </div>
            </nav>

            <div style={{ maxWidth: '620px', margin: '0 auto', padding: '16px 14px 80px' }}>

                {/* Category filter tabs */}
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '6px', scrollbarWidth: 'none' }}>
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', background: category === c.key ? C.orange : C.white, border: `1.5px solid ${category === c.key ? C.orange : C.border}`, borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700, color: category === c.key ? '#fff' : C.orDark, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                {/* Create post CTA */}
                <div onClick={() => router.push('/agrisocial/create')}
                    style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', cursor: 'pointer', boxShadow: '0 1px 6px rgba(234,88,12,0.07)', transition: 'box-shadow 0.15s' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>
                        {userId ? userId[0]?.toUpperCase() : '🌾'}
                    </div>
                    <div style={{ flex: 1, padding: '9px 14px', background: C.orLight, borderRadius: '100px', color: C.muted, fontSize: '0.875rem' }}>What&apos;s happening on your farm today?</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ fontSize: '1.1rem' }}>📸</span>
                        <span style={{ fontSize: '1.1rem' }}>🎬</span>
                    </div>
                </div>

                {/* Posts */}
                {loading ? (
                    <div>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ background: C.white, borderRadius: '18px', border: `1px solid ${C.border}`, padding: '16px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: C.orMid, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}><div style={{ height: '14px', background: C.orLight, borderRadius: '4px', marginBottom: '6px', width: '60%' }} /><div style={{ height: '10px', background: C.orLight, borderRadius: '4px', width: '40%' }} /></div>
                                </div>
                                <div style={{ height: '200px', background: C.orLight, borderRadius: '12px' }} />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '40px 24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📡</div>
                        <h3 style={{ color: C.orDark, margin: '0 0 8px' }}>Could not connect to server</h3>
                        <p style={{ color: C.muted, fontSize: '0.88rem', margin: '0 0 20px' }}>MongoDB Atlas might be paused. Check your connection.</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => fetchPosts(userId, category)}
                                style={{ padding: '10px 20px', background: C.orange, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
                            <Link href="/agrisocial/create"
                                style={{ padding: '10px 20px', background: C.orLight, color: C.orDark, border: `1px solid ${C.border}`, borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>+ Create Post</Link>
                        </div>
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '48px 24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{category === 'all' ? '🌾' : catIcon[category] || '📢'}</div>
                        <h3 style={{ color: C.orDark, margin: '0 0 8px' }}>{category === 'all' ? 'No posts yet!' : `No ${category} posts yet`}</h3>
                        <p style={{ color: C.muted, fontSize: '0.9rem', margin: '0 0 20px' }}>
                            {category === 'all' ? 'Be the first AgriSocial creator! Share your farm, crops, prices & techniques.' : `Be the first to post about ${category}!`}
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => router.push('/agrisocial/create')}
                                style={{ padding: '11px 22px', background: C.orange, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                📸 Create First Post
                            </button>
                            <Link href="/agrisocial/explore"
                                style={{ padding: '11px 22px', background: C.orLight, color: C.orDark, border: `1.5px solid ${C.border}`, borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                                🔍 Explore
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {category === 'all' ? `${posts.length} posts from the community` : `${posts.length} ${category} posts`}
                        </p>
                        {posts.map(p => <PostCard key={p._id} post={p} viewerId={userId} onLike={handleLike} />)}
                    </>
                )}

            </div>

            {/* Bottom nav */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 50 }}>
                {[['🏠', 'Feed', '/agrisocial'], ['🎬', 'Clips', '/agrisocial/clips'], ['➕', 'Create', '/agrisocial/create'], ['🔍', 'Explore', '/agrisocial/explore'], ['👤', 'Profile', userId ? `/agrisocial/profile/${userId}` : '/auth/login']].map(([icon, label, href]) => (
                    <Link key={label} href={href}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: C.muted, fontSize: '0.6rem', fontWeight: 700, gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '1.3rem' }}>{icon}</span>{label}
                    </Link>
                ))}
            </div>
        </div>
    )
}
