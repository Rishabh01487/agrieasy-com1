'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Icon, IconButton } from '@/lib/icons'

const roleLabel: Record<string, string> = { farmer: 'Farmer', buyer: 'Buyer', transporter: 'Transporter', driver: 'Driver' }
const catIcon: Record<string, string> = { farming: '🌾', agritrading: '💰', technique: '🔬', equipment: '🚜', weather: '🌦️', livestock: '🐄', organic: '🌱', general: '📢' }

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; profilePic?: string }
interface Comment { _id: string; userId: User | string; text: string; createdAt: string; parentId?: string | null; likes?: string[]; likesCount?: number }
interface Post {
    _id: string; userId: User; type: string; mediaUrl?: string; mediaUrls?: string[]; mediaType?: string
    caption: string; hashtags: string[]; category: string; likes: string[]
    likesCount: number; commentsCount: number; comments: Comment[]; createdAt: string; location?: string; views?: number
    savedBy?: string[]; savedCount?: number; sharedCount?: number
}

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
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
    const [showLikesModal, setShowLikesModal] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [carouselIdx, setCarouselIdx] = useState(0)
    const [shareCopied, setShareCopied] = useState(false)
    const [replyTo, setReplyTo] = useState<string | null>(null)

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
                await authFetch(`/api/social/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) })
            } else {
                await authFetch(`/api/social/save?postId=${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
            }
        } catch {}
    }

    const handleShare = async () => {
        if (!post) return
        try { await authFetch(`/api/social/posts/${post._id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }) } catch {}
        const url = `${window.location.origin}/agrisocial/post/${post._id}`
        try {
            await navigator.clipboard.writeText(url)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 1800)
        } catch { window.open(url, '_blank') }
    }

    const handleDelete = async () => {
        if (!viewerId || !post) return
        setDeleting(true)
        const res = await authFetch(`/api/social/posts/${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId }) })
        if (res.ok) router.push('/agrisocial')
        else setShowDeleteConfirm(false)
        setDeleting(false)
    }

    const handleComment = async () => {
        if (!commentText.trim() || !viewerId || !post) return
        setPosting(true)
        try {
            const res = await authFetch('/api/social/comment', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: viewerId, postId: post._id, text: commentText, parentId: replyTo }),
            })
            if (res.ok) {
                const d = await res.json()
                setComments(c => [...c, d.comment])
                setCommentText('')
                setReplyTo(null)
            }
        } catch {}
        finally { setPosting(false) }
    }

    if (loading) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>
    if (!post) return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: SHARED.font }}>
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
    const carouselImages = (post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []))
        .filter(u => u && (u.startsWith('http') || u.startsWith('/')))

    // Build a threaded comment view (top-level + their replies)
    // Sort top-level comments by relevance (Instagram-style):
    const topLevel = comments.filter(c => !c.parentId).sort((a, b) => {
        const aLikes = a.likesCount || 0
        const bLikes = b.likesCount || 0
        if (bLikes !== aLikes) return bLikes - aLikes
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    const repliesOf = (id: string) => comments.filter(c => c.parentId === id)

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <button onClick={() => router.back()} style={{ color: SOCIAL.primary, background: 'none', border: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>← Back</button>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>{post.type === 'krishiclip' ? '🎬 KrishiClip' : '📷 Post'}</span>
            </nav>

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 16px 60px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 0, background: SOCIAL.white, borderRadius: 12, boxShadow: SHARED.shadowMd, overflow: 'hidden' }}>
                {/* Media */}
                <div style={{ background: '#000', position: 'relative', minHeight: 400 }}>
                    {ytId ? (
                        <div style={{ position: 'relative', paddingBottom: '100%', height: 0 }}>
                            <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Post" />
                        </div>
                    ) : post.mediaUrl && post.mediaType === 'image' && carouselImages.length > 0 ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={carouselImages[carouselIdx]} alt="post" style={{ width: '100%', height: '100%', maxHeight: '85vh', objectFit: 'contain', display: 'block' }} />
                            {carouselImages.length > 1 && (
                                <>
                                    <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                        {carouselImages.map((_, i) => (
                                            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === carouselIdx ? '#3b82f6' : 'rgba(255,255,255,0.5)' }} />
                                        ))}
                                    </div>
                                    {carouselIdx > 0 && <button onClick={() => setCarouselIdx(i => Math.max(0, i - 1))} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1.4rem' }}>‹</button>}
                                    {carouselIdx < carouselImages.length - 1 && <button onClick={() => setCarouselIdx(i => Math.min(carouselImages.length - 1, i + 1))} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1.4rem' }}>›</button>}
                                    <div style={{ position: 'absolute', bottom: 12, right: 16, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: '0.74rem', fontWeight: 700 }}>{carouselIdx + 1}/{carouselImages.length}</div>
                                </>
                            )}
                        </>
                    ) : post.mediaUrl && post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '85vh', display: 'block' }} />
                    ) : (
                        <div style={{ height: '100%', minHeight: 400, background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '4rem' }}>📢</div>
                    )}
                </div>

                {/* Right panel: author + actions + comments */}
                <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '85vh', borderLeft: `1px solid ${SOCIAL.border}` }}>
                    {/* Author */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${SOCIAL.border}` }}>
                        <Link href={`/agrisocial/profile/${authorId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                            {post.userId && typeof post.userId === 'object' && (post.userId as User).profilePic ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={(post.userId as User).profilePic} alt={authorName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                                    {authorName[0]?.toUpperCase()}
                                </div>
                            )}
                        </Link>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'block' }}>{authorName}</Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ color: SOCIAL.muted, fontSize: '0.72rem' }}>{roleLabel[authorRole || ''] || 'User'}</span>
                                {post.location && <span style={{ color: SOCIAL.muted, fontSize: '0.72rem' }}>· 📍 {post.location}</span>}
                                <span style={{ color: SOCIAL.muted, fontSize: '0.72rem' }}>· {timeAgo(post.createdAt)}</span>
                            </div>
                        </div>
                        <span style={{ background: SOCIAL.primaryLight, color: SOCIAL.primary, padding: '3px 10px', borderRadius: 100, fontSize: '0.68rem', fontWeight: 700 }}>
                            {catIcon[post.category]} {post.category}
                        </span>
                    </div>

                    {/* Comments list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {/* Caption as first comment */}
                        {post.caption && (
                            <div style={{ display: 'flex', gap: 10, padding: '10px 16px' }}>
                                <Link href={`/agrisocial/profile/${authorId}`} style={{ width: 32, height: 32, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>{authorName[0]?.toUpperCase()}</Link>
                                <div>
                                    <p style={{ color: SOCIAL.text, fontSize: '0.86rem', margin: 0, lineHeight: 1.5 }}>
                                        <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{authorName}</Link>{' '}
                                        {post.hashtags?.length > 0
                                            ? post.caption.split(/(#[\w]+)/g).map((part, i) =>
                                                part.startsWith('#')
                                                    ? <Link key={i} href={`/agrisocial/search?tag=${encodeURIComponent(part)}`} style={{ color: SOCIAL.primary, textDecoration: 'none' }}>{part}</Link>
                                                    : <span key={i}>{part}</span>
                                            )
                                            : post.caption}
                                    </p>
                                    {post.hashtags?.length > 0 && (
                                        <p style={{ color: SOCIAL.primary, fontSize: '0.8rem', margin: '4px 0 0' }}>{post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}</p>
                                    )}
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.7rem', margin: '4px 0 0' }}>{timeAgo(post.createdAt)}</p>
                                </div>
                            </div>
                        )}

                        {topLevel.length === 0 && !post.caption && (
                            <p style={{ color: SOCIAL.muted, fontSize: '0.86rem', padding: '24px', textAlign: 'center' }}>No comments yet. Be the first! 🌾</p>
                        )}

                        {topLevel.map((c, i) => {
                            const cn = typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'
                            const cid = typeof c.userId === 'object' ? (c.userId as User)._id : ''
                            const replies = repliesOf(c._id)
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', gap: 10, padding: '8px 16px' }}>
                                        <Link href={`/agrisocial/profile/${cid}`} style={{ width: 32, height: 32, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none', flexShrink: 0 }}>{cn[0]?.toUpperCase()}</Link>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ color: SOCIAL.text, fontSize: '0.86rem', margin: 0, lineHeight: 1.5 }}>
                                                <Link href={`/agrisocial/profile/${cid}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{cn}</Link>{' '}{c.text}
                                            </p>
                                            <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                                                <span style={{ color: SOCIAL.muted, fontSize: '0.7rem' }}>{timeAgo(c.createdAt)}</span>
                                                {(c.likesCount || 0) > 0 && <span style={{ color: SOCIAL.muted, fontSize: '0.7rem' }}>❤️ {c.likesCount}</span>}
                                                {viewerId && (
                                                    <button onClick={async () => {
                                                        const isLiked = c.likes?.includes(viewerId)
                                                        setComments(prev => prev.map(cm => cm._id === c._id ? {
                                                            ...cm,
                                                            likes: isLiked ? (cm.likes || []).filter(x => x !== viewerId) : [...(cm.likes || []), viewerId],
                                                            likesCount: isLiked ? Math.max(0, (cm.likesCount || 0) - 1) : (cm.likesCount || 0) + 1,
                                                        } : cm))
                                                    }} style={{ background: 'none', border: 'none', color: c.likes?.includes(viewerId) ? SOCIAL.red : SOCIAL.muted, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        {c.likes?.includes(viewerId) ? '❤️' : '🤍'} Like
                                                    </button>
                                                )}
                                                {viewerId && <button onClick={() => setReplyTo(replyTo === c._id ? null : c._id)} style={{ background: 'none', border: 'none', color: SOCIAL.muted, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Reply</button>}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Replies (indented) */}
                                    {replies.map((r, ri) => {
                                        const rn = typeof r.userId === 'object' ? ((r.userId as User).farmerName || (r.userId as User).firmName || 'User') : 'User'
                                        const rid = typeof r.userId === 'object' ? (r.userId as User)._id : ''
                                        return (
                                            <div key={ri} style={{ display: 'flex', gap: 10, padding: '6px 16px 6px 58px' }}>
                                                <Link href={`/agrisocial/profile/${rid}`} style={{ width: 28, height: 28, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.75rem', textDecoration: 'none', flexShrink: 0 }}>{rn[0]?.toUpperCase()}</Link>
                                                <div>
                                                    <p style={{ color: SOCIAL.text, fontSize: '0.84rem', margin: 0, lineHeight: 1.5 }}>
                                                        <Link href={`/agrisocial/profile/${rid}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{rn}</Link>{' '}{r.text}
                                                    </p>
                                                    <span style={{ color: SOCIAL.muted, fontSize: '0.7rem' }}>{timeAgo(r.createdAt)}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>

                    {/* Action bar */}
                    <div style={{ borderTop: `1px solid ${SOCIAL.border}`, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: 8 }}>
                            <IconButton name="heart" size={24} title="Like" onClick={handleLike}
                                active={liked} activeColor="#ef4444" color={SOCIAL.text}
                                style={{ transform: liked ? 'scale(1.05)' : 'scale(1)' }}
                            />
                            <IconButton name="comment" size={24} title="Comment" color={SOCIAL.text} />
                            <Link href={`/agrisocial/dm?sharePost=${post._id}`} title="Share via DM" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                                <IconButton name="send" size={22} color={SOCIAL.text} />
                            </Link>
                            <IconButton name="link" size={22} title="Copy link" onClick={handleShare} color={SOCIAL.text} />
                            <IconButton name="bookmark" size={24} title="Save" onClick={handleSave}
                                active={saved} activeColor={SOCIAL.primary} color={SOCIAL.text}
                                style={{ marginLeft: 'auto' }}
                            />
                            {viewerId && viewerId === authorId && (
                                <IconButton name="trash" size={22} title="Delete" onClick={() => setShowDeleteConfirm(true)} color="#94a3b8" />
                            )}
                        </div>
                        <p style={{ color: SOCIAL.text, fontSize: '0.84rem', fontWeight: 700, margin: '0 0 4px', cursor: 'pointer' }} onClick={() => setShowLikesModal(true)}>{likesCount.toLocaleString('en-IN')} {likesCount === 1 ? 'like' : 'likes'}</p>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span>{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            {post.type === 'krishiclip' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Icon name="eye" size={13} color={SOCIAL.muted} /> {post.views || 0}
                                </span>
                            )}
                            {(post.sharedCount || 0) > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Icon name="share" size={13} color={SOCIAL.muted} /> {post.sharedCount}
                                </span>
                            )}
                        </p>
                        {shareCopied && <p style={{ color: SOCIAL.green, fontSize: '0.74rem', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={13} color={SOCIAL.green} /> Link copied</p>}

                        {replyTo && (
                            <div style={{ background: SOCIAL.primaryLight, padding: '4px 10px', borderRadius: 6, marginBottom: 6, fontSize: '0.74rem', color: SOCIAL.primary, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Replying to comment</span>
                                <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SOCIAL.primary, fontWeight: 700 }}>✕</button>
                            </div>
                        )}

                        {viewerId ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()}
                                    placeholder={replyTo ? 'Reply…' : 'Add a comment…'}
                                    style={{ flex: 1, padding: '9px 14px', background: SOCIAL.bg, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 100, fontSize: '0.86rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }} />
                                <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                    style={{ background: 'none', border: 'none', color: SOCIAL.primary, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', opacity: posting || !commentText.trim() ? 0.5 : 1 }}>
                                    Post
                                </button>
                            </div>
                        ) : (
                            <Link href="/auth/login" style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.86rem' }}>Log in to comment</Link>
                        )}
                    </div>

                    {showDeleteConfirm && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10 }}>
                            <p style={{ color: SOCIAL.red, fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Delete this {post.type === 'krishiclip' ? 'KrishiClip' : 'post'}?</p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={handleDelete} disabled={deleting} style={{ background: SOCIAL.red, border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem', opacity: deleting ? 0.7 : 1 }}>{deleting ? 'Deleting…' : 'Yes, delete'}</button>
                                <button onClick={() => setShowDeleteConfirm(false)} style={{ background: SOCIAL.bg, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, padding: '8px 20px', color: SOCIAL.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Likes modal — shows who liked this post */}
            {showLikesModal && (
                <div onClick={() => setShowLikesModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: SOCIAL.white, borderRadius: 16, padding: 0, maxWidth: 400, width: '100%', maxHeight: '70vh', overflowY: 'auto', boxShadow: SHARED.shadowXl }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: SOCIAL.white, zIndex: 1 }}>
                            <h3 style={{ margin: 0, color: SOCIAL.text, fontWeight: 800, fontSize: '1.1rem' }}>Likes</h3>
                            <button onClick={() => setShowLikesModal(false)} style={{ background: 'none', border: 'none', color: SOCIAL.muted, cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
                        </div>
                        {post.likes && post.likes.length > 0 ? (
                            <div style={{ padding: '8px 0' }}>
                                {post.likes.map((likeId, i) => {
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px' }}>
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>U</div>
                                            <span style={{ color: SOCIAL.text, fontSize: '0.86rem', fontWeight: 600 }}>User {String(likeId).slice(-6)}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: SOCIAL.muted }}>
                                <p style={{ fontSize: '0.86rem', margin: 0 }}>No likes yet. Be the first!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
