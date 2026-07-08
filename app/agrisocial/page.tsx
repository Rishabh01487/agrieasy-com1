'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Icon, IconButton } from '@/lib/icons'

const roleLabel: Record<string, string> = { farmer: 'Farmer', buyer: 'Buyer', transporter: 'Transporter', driver: 'Driver' }
const catIcon: Record<string, string> = { farming: '🌾', agritrading: '💰', technique: '🔬', equipment: '🚜', weather: '🌦️', livestock: '🐄', organic: '🌱', general: '📢' }

const CATEGORIES = [
    { key: 'all', label: 'All', icon: '🌍' },
    { key: 'farming', label: 'Farming', icon: '🌾' },
    { key: 'agritrading', label: 'Trading', icon: '💰' },
    { key: 'technique', label: 'Technique', icon: '🔬' },
    { key: 'equipment', label: 'Equipment', icon: '🚜' },
    { key: 'livestock', label: 'Livestock', icon: '🐄' },
    { key: 'organic', label: 'Organic', icon: '🌱' },
]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string }
interface Comment { _id: string; userId: User | string; text: string; createdAt: string; parentId?: string | null; likes?: string[]; likesCount?: number }
interface Post {
    _id: string; userId: User; type: string; mediaUrl?: string; mediaUrls?: string[]; mediaType?: string
    caption: string; hashtags: string[]; category: string; likes: string[]
    likesCount: number; commentsCount: number; comments?: Comment[]; createdAt: string; location?: string
    savedBy?: string[]; savedCount?: number; sharedCount?: number
}

interface StoryItem { _id: string; mediaUrl: string; mediaType: string; caption?: string; duration?: number; viewed: boolean; likesCount?: number; createdAt: string }
interface StoryGroup { userId: string; user: User; stories: StoryItem[]; hasUnviewed: boolean }

interface SuggestedUser { _id: string; farmerName?: string; firmName?: string; role?: string; mutualCount?: number; postCount?: number }

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Build an Instagram-style @handle from a name.
// "Rishabh Gupta" → "@rishabhgupta"
function makeHandle(name: string): string {
    return '@' + (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function Avatar({ name, size = 44, ring = false, viewed = false, src }: { name: string; size?: number; ring?: boolean; viewed?: boolean; src?: string }) {
    const inner = src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 800, fontSize: size * 0.4 }}>{name?.[0]?.toUpperCase() || 'U'}</span>
    if (!ring) {
        return <div style={{ width: size, height: size, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{inner}</div>
    }
    return (
        <div className={viewed ? 'story-ring story-ring--viewed' : 'story-ring'} style={{ width: size + 6, height: size + 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: size, height: size, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{inner}</div>
        </div>
    )
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
    const [burst, setBurst] = useState(false)
    const [carouselIdx, setCarouselIdx] = useState(0)
    const [shareCopied, setShareCopied] = useState(false)
    const lastTapRef = useRef<number>(0)

    const isDeletedUser = !post.userId || typeof post.userId !== 'object'
    const authorName = isDeletedUser ? 'Unknown User' : (post.userId.farmerName || post.userId.firmName || 'User')
    const authorRole = isDeletedUser ? '' : (post.userId.role || '')
    const authorId = isDeletedUser ? '' : post.userId._id
    const isOwner = viewerId && viewerId === authorId

    // Carousel images: prefer mediaUrls (array); fallback to single mediaUrl
    const carouselImages = (post.mediaUrls && post.mediaUrls.length > 0 ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []))
        .filter(u => u && (u.startsWith('http') || u.startsWith('/')))

    const handleLike = async () => {
        if (!viewerId) return
        const newLiked = !liked
        setLiked(newLiked)
        setLikesCount(c => newLiked ? c + 1 : Math.max(0, c - 1))
        onLike(post._id, newLiked, newLiked ? likesCount + 1 : likesCount - 1)
        try { await authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) }) } catch {}
    }

    // Double-tap to like (Instagram signature interaction)
    const handleImageDoubleTap = () => {
        if (!viewerId) return
        if (!liked) {
            setLiked(true)
            setLikesCount(c => c + 1)
            onLike(post._id, true, likesCount + 1)
            authFetch('/api/social/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) }).catch(() => null)
        }
        setBurst(true)
        setTimeout(() => setBurst(false), 1000)
    }

    const onImageClick = () => {
        const now = Date.now()
        if (now - lastTapRef.current < 300) {
            handleImageDoubleTap()
        }
        lastTapRef.current = now
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
                await authFetch(`/api/social/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId, postId: post._id }) })
            } else {
                await authFetch(`/api/social/save?postId=${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })
            }
        } catch {}
    }

    const handleShare = async () => {
        try {
            await authFetch(`/api/social/posts/${post._id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        } catch {}
        const url = `${window.location.origin}/agrisocial/post/${post._id}`
        try {
            await navigator.clipboard.writeText(url)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 1800)
        } catch {
            window.open(url, '_blank')
        }
    }

    const handleDelete = async () => {
        if (!viewerId) return
        try {
            const res = await authFetch(`/api/social/posts/${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: viewerId }) })
            if (res.ok) onDelete?.(post._id)
            else setShowDeleteConfirm(false)
        } catch { setShowDeleteConfirm(false) }
    }

    const ytId = post.mediaUrl ? (post.mediaUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]) : null

    return (
        <div className="fade-in-up" style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', boxShadow: SHARED.shadowMd }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px' }}>
                <Link href={`/agrisocial/profile/${authorId}`} style={{ textDecoration: 'none' }}>
                    <Avatar name={authorName} size={38} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {makeHandle(authorName)}
                    </Link>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {roleLabel[authorRole || ''] || 'User'}
                        {post.location ? ` · 📍 ${post.location}` : ''}
                        {' · '}{timeAgo(post.createdAt)}
                    </p>
                </div>
                <span style={{ background: SOCIAL.primaryLight, color: SOCIAL.primary, padding: '3px 10px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                    {catIcon[post.category]} {post.category}
                </span>
            </div>

            {/* Media (with double-tap to like) */}
            {ytId ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000' }} onClick={onImageClick}>
                    <iframe src={`https://www.youtube.com/embed/${ytId}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen title="Post" />
                </div>
            ) : carouselImages.length > 0 && post.mediaType === 'image' && !imgErr ? (
                <div style={{ position: 'relative', background: '#000' }} onClick={onImageClick}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={carouselImages[carouselIdx]} alt="post" onError={() => setImgErr(true)} style={{ width: '100%', maxHeight: '600px', objectFit: 'cover', display: 'block' }} />
                    {/* Heart burst on double-tap */}
                    {burst && (
                        <div className="heart-burst" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', fontSize: '6rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))' }}>❤️</div>
                    )}
                    {/* Carousel dots */}
                    {carouselImages.length > 1 && (
                        <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                            {carouselImages.map((_, i) => (
                                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === carouselIdx ? '#3b82f6' : 'rgba(255,255,255,0.5)' }} />
                            ))}
                        </div>
                    )}
                    {/* Carousel nav arrows */}
                    {carouselImages.length > 1 && (
                        <>
                            {carouselIdx > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); setCarouselIdx(i => Math.max(0, i - 1)) }} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>‹</button>
                            )}
                            {carouselIdx < carouselImages.length - 1 && (
                                <button onClick={(e) => { e.stopPropagation(); setCarouselIdx(i => Math.min(carouselImages.length - 1, i + 1)) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>›</button>
                            )}
                            <div style={{ position: 'absolute', bottom: 8, right: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '2px 8px', borderRadius: '100px', fontSize: '0.68rem', fontWeight: 700 }}>{carouselIdx + 1}/{carouselImages.length}</div>
                        </>
                    )}
                </div>
            ) : post.mediaUrl && post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '600px', display: 'block', background: '#000' }} />
            ) : null}

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '8px 10px' }}>
                <IconButton name="heart" size={24} title="Like" onClick={handleLike}
                    active={liked} activeColor="#ef4444" color={SOCIAL.text}
                    style={{ transform: liked ? 'scale(1.05)' : 'scale(1)' }}
                />
                <IconButton name="comment" size={24} title="Comment" onClick={() => setShowComments(s => !s)} color={SOCIAL.text} />
                <Link href={`/agrisocial/dm?sharePost=${post._id}`} title="Share via DM" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                    <IconButton name="send" size={22} color={SOCIAL.text} />
                </Link>
                <IconButton name="link" size={22} title="Copy link" onClick={handleShare} color={SOCIAL.text} />
                <IconButton name="bookmark" size={24} title="Save" onClick={handleSave}
                    active={saved} activeColor={SOCIAL.primary} color={SOCIAL.text}
                    style={{ marginLeft: 'auto' }}
                />
                {isOwner && (
                    <IconButton name="trash" size={22} title="Delete" onClick={() => setShowDeleteConfirm(true)} color="#94a3b8" />
                )}
            </div>

            {/* Likes count */}
            <div style={{ padding: '0 14px 6px' }}>
                <p style={{ color: SOCIAL.text, fontSize: '0.86rem', fontWeight: 700, margin: 0 }}>{likesCount.toLocaleString('en-IN')} {likesCount === 1 ? 'like' : 'likes'}</p>
            </div>

            {/* Caption */}
            {post.caption && (
                <div style={{ padding: '0 14px 8px' }}>
                    <p style={{ color: SOCIAL.text, fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                        <Link href={`/agrisocial/profile/${authorId}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{authorName}</Link>{' '}
                        <span style={{ color: SOCIAL.textSecondary }}>
                            {post.hashtags?.length > 0
                                ? post.caption.split(/(#[\w]+)/g).map((part, i) =>
                                    part.startsWith('#')
                                        ? <Link key={i} href={`/agrisocial/search?tag=${encodeURIComponent(part)}`} style={{ color: SOCIAL.primary, textDecoration: 'none' }}>{part}</Link>
                                        : <span key={i}>{part}</span>
                                )
                                : post.caption}
                        </span>
                    </p>
                </div>
            )}

            {/* View comments link */}
            {comments.length > 0 && !showComments && (
                <div style={{ padding: '0 14px 10px' }}>
                    <button onClick={() => setShowComments(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: SOCIAL.muted, fontSize: '0.82rem', fontWeight: 600, padding: 0 }}>
                        View all {comments.length} comments
                    </button>
                </div>
            )}

            {shareCopied && (
                <div style={{ padding: '0 14px 8px' }}>
                    <p style={{ color: SOCIAL.green, fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>✓ Link copied to clipboard</p>
                </div>
            )}

            {/* Delete confirm */}
            {showDeleteConfirm && (
                <div style={{ borderTop: `1px solid ${SOCIAL.border}`, padding: '12px 14px', textAlign: 'center' }}>
                    <p style={{ color: SOCIAL.red, fontSize: '0.85rem', margin: '0 0 8px', fontWeight: 600 }}>Delete this post?</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={handleDelete} style={{ background: SOCIAL.red, border: 'none', borderRadius: '8px', padding: '6px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>Yes, delete</button>
                        <button onClick={() => setShowDeleteConfirm(false)} style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: '8px', padding: '6px 16px', color: SOCIAL.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Comments */}
            {showComments && (
                <div style={{ borderTop: `1px solid ${SOCIAL.border}`, padding: '10px 14px' }}>
                    {comments.length === 0 && <p style={{ color: SOCIAL.muted, fontSize: '0.82rem', margin: '0 0 8px', textAlign: 'center' }}>No comments yet — be first! 🌾</p>}
                    {comments.slice(-3).map((c: Comment, i: number) => {
                        const cn = typeof c.userId === 'object' ? ((c.userId as User).farmerName || (c.userId as User).firmName || 'User') : 'User'
                        return (
                            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                <Avatar name={cn} size={28} />
                                <p style={{ color: SOCIAL.text, fontSize: '0.84rem', margin: 0, paddingTop: '4px', flex: 1 }}>
                                    <Link href={`/agrisocial/profile/${typeof c.userId === 'object' ? (c.userId as User)._id : ''}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none' }}>{cn}</Link>{' '}{c.text}
                                </p>
                                <span style={{ color: SOCIAL.muted, fontSize: '0.68rem', paddingTop: '6px' }}>{timeAgo(c.createdAt)}</span>
                            </div>
                        )
                    })}
                    {viewerId ? (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleComment()} placeholder="Add a comment…"
                                style={{ flex: 1, padding: '8px 14px', background: SOCIAL.bg, border: `1px solid ${SOCIAL.border}`, borderRadius: '100px', fontSize: '0.84rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }} />
                            <button onClick={handleComment} disabled={posting || !commentText.trim()}
                                style={{ background: SOCIAL.primary, border: 'none', borderRadius: '100px', padding: '8px 16px', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', opacity: posting || !commentText.trim() ? 0.5 : 1 }}>Post</button>
                        </div>
                    ) : (
                        <Link href="/auth/login" style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>Log in to comment</Link>
                    )}
                </div>
            )}
        </div>
    )
}

function StoryTray({ stories, viewerId }: { stories: StoryGroup[]; viewerId: string }) {
    const router = useRouter()

    // Find the viewer's own story group (if any)
    const ownStory = stories.find(s => s.userId === viewerId)
    const otherStories = stories.filter(s => s.userId !== viewerId)

    return (
        <div className="no-scrollbar" style={{ display: 'flex', gap: '14px', overflowX: 'auto', padding: '12px 4px 16px', borderBottom: `1px solid ${SOCIAL.border}`, marginBottom: '16px' }}>
            {/* "Your Story" + create new story */}
            <button onClick={() => router.push(ownStory ? `/agrisocial/stories/${viewerId}` : '/agrisocial/create?type=story')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: 0, minWidth: '72px' }}>
                <div style={{ position: 'relative', width: 62, height: 62 }}>
                    <div className={ownStory ? 'story-ring' : ''} style={{ width: 62, height: 62, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', border: '2px solid #fff' }}>
                            {'Y'}
                        </div>
                    </div>
                    {!ownStory && (
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: SOCIAL.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, border: '2px solid #fff', lineHeight: 1 }}>
                            +
                        </div>
                    )}
                </div>
                <span style={{ color: SOCIAL.textSecondary, fontSize: '0.72rem', fontWeight: 600, maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ownStory ? 'Your story' : 'Add story'}
                </span>
            </button>

            {/* Other users' stories */}
            {otherStories.map(g => {
                const name = g.user?.farmerName || g.user?.firmName || 'User'
                return (
                    <button key={g.userId} onClick={() => router.push(`/agrisocial/stories/${g.userId}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: 0, minWidth: '72px' }}>
                        <div className={g.hasUnviewed ? 'story-ring' : 'story-ring story-ring--viewed'} style={{ width: 62, height: 62, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.2rem', border: '2px solid #fff' }}>
                                {name[0]?.toUpperCase()}
                            </div>
                        </div>
                        <span style={{ color: SOCIAL.textSecondary, fontSize: '0.72rem', fontWeight: 600, maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name.split(' ')[0]}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

function SuggestedSidebar({ users, viewerId }: { users: SuggestedUser[]; viewerId: string }) {
    const [followStates, setFollowStates] = useState<Record<string, boolean>>({})

    const handleFollow = async (uid: string) => {
        const cur = !!followStates[uid]
        setFollowStates(s => ({ ...s, [uid]: !cur }))
        try {
            await authFetch('/api/social/follow', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ followerId: viewerId, followingId: uid }),
            })
        } catch { setFollowStates(s => ({ ...s, [uid]: cur })) }
    }

    if (users.length === 0) return null

    return (
        <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '16px', boxShadow: SHARED.shadowMd }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ color: SOCIAL.muted, fontSize: '0.84rem', fontWeight: 700, margin: 0 }}>Suggested for you</h3>
                <Link href="/agrisocial/search" style={{ color: SOCIAL.text, fontSize: '0.74rem', fontWeight: 700, textDecoration: 'none' }}>Find more</Link>
            </div>
            {users.slice(0, 5).map(u => {
                const name = u.farmerName || u.firmName || 'User'
                const isFollowing = !!followStates[u._id]
                return (
                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                        <Link href={`/agrisocial/profile/${u._id}`} style={{ textDecoration: 'none' }}>
                            <Avatar name={name} size={38} />
                        </Link>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/agrisocial/profile/${u._id}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.84rem', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                            </Link>
                            <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0 }}>
                                {u.mutualCount ? `${u.mutualCount} mutual · ` : ''}{roleLabel[u.role || ''] || 'User'}
                            </p>
                        </div>
                        <button onClick={() => handleFollow(u._id)}
                            style={{ background: isFollowing ? SOCIAL.bg : SOCIAL.primary, color: isFollowing ? SOCIAL.text : '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            {isFollowing ? 'Following' : 'Follow'}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export default function AgriSocialFeed() {
    const [posts, setPosts] = useState<Post[]>([])
    const [stories, setStories] = useState<StoryGroup[]>([])
    const [suggested, setSuggested] = useState<SuggestedUser[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [category, setCategory] = useState('all')
    const [feed, setFeed] = useState<'following' | 'ranked' | 'latest'>('following')
    const [unreadNotifs, setUnreadNotifs] = useState(0)
    const [unreadDMs, setUnreadDMs] = useState(0)
    const [userId] = useState(() => { try { return typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '' } catch { return '' } })
    const router = useRouter()

    const fetchPosts = useCallback(async (uid: string, cat: string, feedMode: typeof feed) => {
        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({ page: '1', feed: feedMode })
            if (uid) params.set('userId', uid)
            if (cat && cat !== 'all') params.set('category', cat)
            const res = await authFetch(`/api/social/posts?${params}`)
            if (!res.ok) throw new Error('Server error')
            const d = await res.json()
            setPosts(d.posts || d.data?.posts || [])
        } catch {
            setError('Could not load posts. Please check your connection.')
            setPosts([])
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchStories = useCallback(async () => {
        if (!userId) return
        try {
            const res = await authFetch('/api/social/stories')
            if (res.ok) {
                const d = await res.json()
                setStories(d.data?.stories || d.stories || [])
            }
        } catch {}
    }, [userId])

    const fetchSuggested = useCallback(async () => {
        if (!userId) return
        try {
            const res = await authFetch('/api/social/suggested')
            if (res.ok) {
                const d = await res.json()
                setSuggested(d.data?.users || d.users || [])
            }
        } catch {}
    }, [userId])

    const fetchUnreadCounts = useCallback(async () => {
        if (!userId) return
        try {
            const [n, d] = await Promise.all([
                authFetch('/api/social/notifications?page=1&limit=1'),
                authFetch('/api/social/dm/conversations'),
            ])
            if (n.ok) {
                const nd = await n.json()
                setUnreadNotifs(nd.data?.unreadCount || 0)
            }
            if (d.ok) {
                const dd = await d.json()
                const convs = dd.data?.conversations || []
                setUnreadDMs(convs.filter((c: any) => c.unread).length)
            }
        } catch {}
    }, [userId])

    useEffect(() => {
        fetchPosts(userId, category, feed).catch(() => {})
        fetchStories()
        fetchSuggested()
        fetchUnreadCounts()
    }, [fetchPosts, fetchStories, fetchSuggested, fetchUnreadCounts, userId, category, feed])

    // Refresh stories every 60s (they expire)
    useEffect(() => {
        const i = setInterval(() => { fetchStories(); fetchUnreadCounts() }, 60_000)
        return () => clearInterval(i)
    }, [fetchStories, fetchUnreadCounts])

    const handleLike = (postId: string, liked: boolean, count: number) => {
        setPosts(ps => ps.map(p => p._id === postId ? { ...p, likes: liked ? [...(p.likes || []), userId] : (p.likes || []).filter(x => x !== userId), likesCount: count } : p))
    }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            {/* Sticky Top Nav (Instagram-style) */}
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', boxShadow: SHARED.shadow, position: 'sticky', top: 0, zIndex: 50, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <Link href="/agrisocial" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/agrisocial-logo.png" alt="AgriSocial" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 900, fontSize: '1.15rem', color: SOCIAL.text }}>Agri<span style={{ color: SOCIAL.primary }}>Social</span></span>
                </Link>

                {/* Desktop search */}
                <Link href="/agrisocial/search" style={{ flex: 1, maxWidth: 240, margin: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: SOCIAL.bg, borderRadius: '8px', textDecoration: 'none' }}>
                    <Icon name="search" size={16} color={SOCIAL.muted} />
                    <span style={{ color: SOCIAL.muted, fontSize: '0.84rem' }}>Search AgriSocial</span>
                </Link>

                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <Link href="/" title="AgriEasy Home" style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name="home" size={24} color={SOCIAL.text} />
                    </Link>
                    <Link href="/agrisocial/clips" title="Reels" style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name="reels" size={24} color={SOCIAL.text} />
                    </Link>
                    <Link href="/agrisocial/explore" title="Explore" style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name="explore" size={24} color={SOCIAL.text} />
                    </Link>
                    <Link href="/agrisocial/notifications" title="Activity" style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name="heart-nav" size={24} color={SOCIAL.text} />
                        {unreadNotifs > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: SOCIAL.red, color: '#fff', fontSize: '0.62rem', fontWeight: 800, borderRadius: '100px', padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
                    </Link>
                    <Link href="/agrisocial/dm" title="Messages" style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                        <Icon name="dm" size={24} color={SOCIAL.text} />
                        {unreadDMs > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: SOCIAL.red, color: '#fff', fontSize: '0.62rem', fontWeight: 800, borderRadius: '100px', padding: '1px 5px', minWidth: 14, textAlign: 'center' }}>{unreadDMs > 9 ? '9+' : unreadDMs}</span>}
                    </Link>
                    <button onClick={() => router.push('/agrisocial/create')}
                        style={{ marginLeft: '6px', background: SOCIAL.gradient, border: 'none', borderRadius: '10px', padding: '0', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.15s' }}
                        title="Create">
                        <Icon name="plus" size={22} color="#fff" strokeWidth={2.5} />
                    </button>
                </div>
            </nav>

            <div className="agrisocial-layout" style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 14px 80px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '24px' }}>
                {/* Main column */}
                <div style={{ minWidth: 0, maxWidth: '600px', margin: '0 auto', width: '100%' }}>
                    {/* Stories tray */}
                    <StoryTray stories={stories} viewerId={userId} />

                    {/* Feed mode tabs (Instagram-style: Following / Favourites / Latest) */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', overflowX: 'auto' }} className="no-scrollbar">
                        {([['following', 'Following'], ['ranked', '🔥 Top'], ['latest', '⏱ Latest']] as const).map(([k, label]) => (
                            <button key={k} onClick={() => setFeed(k)}
                                style={{ padding: '7px 16px', background: feed === k ? SOCIAL.primary : SOCIAL.white, border: `1.5px solid ${feed === k ? SOCIAL.primary : SOCIAL.border}`, borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700, color: feed === k ? '#fff' : SOCIAL.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '6px' }} className="no-scrollbar">
                        {CATEGORIES.map(c => (
                            <button key={c.key} onClick={() => setCategory(c.key)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 14px', background: category === c.key ? SOCIAL.primary : SOCIAL.white, border: `1.5px solid ${category === c.key ? SOCIAL.primary : SOCIAL.border}`, borderRadius: '100px', fontSize: '0.78rem', fontWeight: 700, color: category === c.key ? '#fff' : SOCIAL.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {c.icon} {c.label}
                            </button>
                        ))}
                    </div>

                    {/* Create post CTA */}
                    <div onClick={() => router.push('/agrisocial/create')}
                        style={{ background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', cursor: 'pointer', boxShadow: SHARED.shadowMd }}>
                        <Avatar name={userId || '🌾'} size={36} />
                        <div style={{ flex: 1, padding: '9px 14px', background: SOCIAL.bg, borderRadius: '100px', color: SOCIAL.muted, fontSize: '0.86rem' }}>What&apos;s happening on your farm today?</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{ fontSize: '1.1rem' }}>📸</span>
                            <span style={{ fontSize: '1.1rem' }}>🎬</span>
                        </div>
                    </div>

                    {/* Posts */}
                    {loading ? (
                        <div>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ background: SOCIAL.white, borderRadius: '12px', border: `1px solid ${SOCIAL.border}`, padding: '16px', marginBottom: '16px', boxShadow: SHARED.shadow }}>
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: SOCIAL.border, flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}><div style={{ height: '14px', background: SOCIAL.bgSub, borderRadius: '4px', marginBottom: '6px', width: '60%' }} /><div style={{ height: '10px', background: SOCIAL.bgSub, borderRadius: '4px', width: '40%' }} /></div>
                                    </div>
                                    <div style={{ height: '220px', background: SOCIAL.bgSub, borderRadius: '8px' }} />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '40px 24px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📡</div>
                            <h3 style={{ color: SOCIAL.text, margin: '0 0 8px' }}>Could not connect to server</h3>
                            <p style={{ color: SOCIAL.muted, fontSize: '0.88rem', margin: '0 0 20px' }}>MongoDB Atlas might be paused. Check your connection.</p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => fetchPosts(userId, category, feed)} style={{ padding: '10px 20px', background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
                                <Link href="/agrisocial/create" style={{ padding: '10px 20px', background: SOCIAL.primaryLight, color: SOCIAL.textSecondary, border: `1px solid ${SOCIAL.border}`, borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>+ Create Post</Link>
                            </div>
                        </div>
                    ) : posts.length === 0 ? (
                        <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '48px 24px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{category === 'all' ? '🌾' : catIcon[category] || '📢'}</div>
                            <h3 style={{ color: SOCIAL.text, margin: '0 0 8px' }}>{category === 'all' ? 'No posts yet!' : `No ${category} posts yet`}</h3>
                            <p style={{ color: SOCIAL.muted, fontSize: '0.9rem', margin: '0 0 20px' }}>
                                {feed === 'following' && category === 'all' ? 'Follow more farmers and buyers to fill your feed, or share your first post!' : 'Be the first to post!'}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <button onClick={() => router.push('/agrisocial/create')} style={{ padding: '11px 22px', background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>📸 Create First Post</button>
                                <Link href="/agrisocial/explore" style={{ padding: '11px 22px', background: SOCIAL.primaryLight, color: SOCIAL.textSecondary, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>🔍 Explore</Link>
                                {feed === 'following' && <button onClick={() => setFeed('ranked')} style={{ padding: '11px 22px', background: SOCIAL.bg, color: SOCIAL.text, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>🔥 See Top Posts</button>}
                            </div>
                        </div>
                    ) : (
                        <>
                            {posts.map(p => <PostCard key={p._id} post={p} viewerId={userId} onLike={handleLike} onDelete={(id) => setPosts(ps => ps.filter(x => x._id !== id))} />)}
                        </>
                    )}
                </div>

                {/* Right sidebar (desktop only) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {userId && (
                        <Link href={`/agrisocial/profile/${userId}`} style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', boxShadow: SHARED.shadowMd }}>
                            <Avatar name="You" size={44} />
                            <div>
                                <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>My Profile</p>
                                <p style={{ color: SOCIAL.muted, fontSize: '0.74rem', margin: 0 }}>View your posts, clips & saved</p>
                            </div>
                        </Link>
                    )}
                    <SuggestedSidebar users={suggested} viewerId={userId} />
                    <div style={{ color: SOCIAL.muted, fontSize: '0.72rem', padding: '0 4px' }}>
                        <p style={{ margin: '0 0 6px' }}>© {new Date().getFullYear()} AgriEasy · AgriSocial</p>
                        <p style={{ margin: 0 }}>Built for India's farmers 🌾</p>
                    </div>
                </div>
            </div>

            {/* Bottom nav (mobile) */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', borderTop: `1px solid ${SOCIAL.border}`, display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 50, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                {([
                    ['home', 'Feed', '/agrisocial'],
                    ['reels', 'Reels', '/agrisocial/clips'],
                    ['plus', 'Create', '/agrisocial/create'],
                    ['search', 'Search', '/agrisocial/search'],
                    ['heart-nav', 'Activity', '/agrisocial/notifications'],
                    ['explore', 'Profile', userId ? `/agrisocial/profile/${userId}` : '/auth/login'],
                ] as const).map(([iconName, label, href]) => (
                    <Link key={label} href={href}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: SOCIAL.muted, fontSize: '0.6rem', fontWeight: 700, gap: '2px', flex: 1 }}>
                        <Icon name={iconName as any} size={24} color={SOCIAL.muted} />{label}
                    </Link>
                ))}
            </div>
        </div>
    )
}
