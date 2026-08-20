'use client'

/**
 * CommentSheet — Instagram-style bottom sheet for viewing + posting comments.
 *
 * Features:
 *  - Slides up from the bottom with a dimmed backdrop
 *  - Swipe-down to dismiss (drag handle at top)
 *  - Comment list with infinite scroll
 *  - Each comment shows: avatar, username, text, time ago, like heart, reply button
 *  - Comment liking — tap heart to like/unlike (calls /api/social/comment/like)
 *  - Reply threading — tap "Reply" to add a nested reply (Instagram-style)
 *  - Sticky comment input at the bottom with "Post" button
 *  - Smooth animations + haptic feedback (where supported)
 *
 * Usage:
 *  <CommentSheet
 *    postId="..."
 *    postOwnerId="..."
 *    viewerId="..."
 *    isOpen={true}
 *    onClose={() => { ... }}
 *    initialComments={[...]}
 *  />
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface User { _id: string; farmerName?: string; firmName?: string; profilePic?: string }
interface Comment {
    _id: string
    userId: User | string
    text: string
    createdAt: string
    parentId?: string | null
    likes?: string[]
    likesCount?: number
}

interface CommentSheetProps {
    postId: string
    postOwnerId?: string
    viewerId: string
    isOpen: boolean
    onClose: () => void
    initialComments?: Comment[]
    onCommentAdded?: (count: number) => void
}

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function getUserName(u: User | string): string {
    if (typeof u === 'string') return 'User'
    return u.farmerName || u.firmName || 'User'
}

function getUserId(u: User | string): string {
    if (typeof u === 'string') return u
    return u._id
}

function getUserPic(u: User | string): string | undefined {
    if (typeof u === 'string') return undefined
    return u.profilePic
}

function Avatar({ name, src, size = 32 }: { name: string; src?: string; size?: number }) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: size * 0.4,
        }}>
            {name?.[0]?.toUpperCase() || 'U'}
        </div>
    )
}

export default function CommentSheet({ postId, postOwnerId, viewerId, isOpen, onClose, initialComments = [], onCommentAdded }: CommentSheetProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments)
    const [text, setText] = useState('')
    const [posting, setPosting] = useState(false)
    const [replyTo, setReplyTo] = useState<Comment | null>(null)
    const [likedComments, setLikedComments] = useState<Set<string>>(new Set())
    const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
    const [visible, setVisible] = useState(false)
    const sheetRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const dragStartY = useRef(0)
    const [dragOffset, setDragOffset] = useState(0)
    const [isDragging, setIsDragging] = useState(false)

    // Sync initial comments when sheet opens
    useEffect(() => {
        if (isOpen) {
            setComments(initialComments)
            // Build initial like state from comment data
            const liked = new Set<string>()
            const counts: Record<string, number> = {}
            for (const c of initialComments) {
                if (c.likes?.some(id => (typeof id === 'string' ? id : (id as any).toString?.()) === viewerId)) {
                    liked.add(c._id)
                }
                counts[c._id] = c.likesCount || c.likes?.length || 0
            }
            setLikedComments(liked)
            setLikeCounts(counts)
            // Trigger entrance animation
            requestAnimationFrame(() => setVisible(true))
        } else {
            setVisible(false)
            setReplyTo(null)
            setText('')
        }
    }, [isOpen, initialComments, viewerId])

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            return () => { document.body.style.overflow = '' }
        }
    }, [isOpen])

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    const handleClose = useCallback(() => {
        setVisible(false)
        setTimeout(onClose, 250)  // wait for exit animation
    }, [onClose])

    // ── Drag-to-dismiss ──
    const handleTouchStart = (e: React.TouchEvent) => {
        dragStartY.current = e.touches[0].clientY
        setIsDragging(true)
    }
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return
        const delta = e.touches[0].clientY - dragStartY.current
        if (delta > 0) setDragOffset(delta)  // only allow downward drag
    }
    const handleTouchEnd = () => {
        setIsDragging(false)
        if (dragOffset > 100) {
            handleClose()  // dismissed
        }
        setDragOffset(0)
    }

    // ── Post comment (or reply) ──
    const handleSubmit = async () => {
        if (!text.trim() || !viewerId) return
        setPosting(true)
        try {
            const body: any = { userId: viewerId, postId, text: text.trim() }
            if (replyTo) body.parentId = replyTo._id
            const res = await authFetch('/api/social/comment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (res.ok) {
                const d = await res.json()
                setComments(c => [...c, d.comment])
                setText('')
                setReplyTo(null)
                onCommentAdded?.(comments.length + 1)
                // Haptic feedback (if supported)
                if (navigator.vibrate) navigator.vibrate(10)
            }
        } catch {}
        finally { setPosting(false) }
    }

    // ── Like/unlike a comment ──
    const handleLike = async (commentId: string) => {
        const wasLiked = likedComments.has(commentId)
        // Optimistic update
        setLikedComments(prev => {
            const next = new Set(prev)
            if (wasLiked) next.delete(commentId)
            else next.add(commentId)
            return next
        })
        setLikeCounts(prev => ({
            ...prev,
            [commentId]: Math.max(0, (prev[commentId] || 0) + (wasLiked ? -1 : 1)),
        }))
        if (navigator.vibrate) navigator.vibrate(5)
        try {
            await authFetch('/api/social/comment/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, commentId }),
            })
        } catch {
            // Revert on failure
            setLikedComments(prev => {
                const next = new Set(prev)
                if (wasLiked) next.add(commentId)
                else next.delete(commentId)
                return next
            })
            setLikeCounts(prev => ({
                ...prev,
                [commentId]: Math.max(0, (prev[commentId] || 0) + (wasLiked ? 1 : -1)),
            }))
        }
    }

    // ── Start replying to a comment ──
    const handleReply = (comment: Comment) => {
        setReplyTo(comment)
        inputRef.current?.focus()
    }

    // Separate top-level comments from replies
    const topLevel = comments.filter(c => !c.parentId)
    const repliesByParent: Record<string, Comment[]> = {}
    for (const c of comments) {
        if (c.parentId) {
            if (!repliesByParent[c.parentId]) repliesByParent[c.parentId] = []
            repliesByParent[c.parentId].push(c)
        }
    }

    if (!isOpen) return null

    // Sheet transform: entrance from bottom + drag offset
    const sheetTransform = isDragging
        ? `translateY(${dragOffset}px)`
        : visible
            ? 'translateY(0)'
            : 'translateY(100%)'
    const sheetTransition = isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'

    return (
        <>
            {/* Dimmed backdrop */}
            <div
                onClick={handleClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: visible ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                    transition: 'background 0.25s ease',
                }}
            />

            {/* Bottom sheet */}
            <div
                ref={sheetRef}
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
                    background: '#fff', borderRadius: '16px 16px 0 0',
                    maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                    transform: sheetTransform,
                    transition: sheetTransition,
                    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
                    fontFamily: SHARED.font,
                }}
            >
                {/* Drag handle */}
                <div
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        padding: '10px 0 6px', display: 'flex', justifyContent: 'center',
                        cursor: 'grab', touchAction: 'none',
                    }}
                >
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#cbd5e1' }} />
                </div>

                {/* Header */}
                <div style={{
                    padding: '8px 16px 12px', borderBottom: `1px solid ${SOCIAL.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: SOCIAL.text }}>
                        Comments
                    </h3>
                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: SOCIAL.muted, fontSize: '1.4rem', padding: 4, lineHeight: 1,
                        }}
                    >✕</button>
                </div>

                {/* Comment list */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '12px 16px',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {topLevel.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: SOCIAL.muted }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>💬</div>
                            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No comments yet</p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Start the conversation.</p>
                        </div>
                    )}

                    {topLevel.map((c) => {
                        const cName = getUserName(c.userId)
                        const cPic = getUserPic(c.userId)
                        const cId = getUserId(c.userId)
                        const isLiked = likedComments.has(c._id)
                        const likeCount = likeCounts[c._id] || 0
                        const replies = repliesByParent[c._id] || []
                        return (
                            <div key={c._id} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                    <Avatar name={cName} src={cPic} size={32} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: '0.86rem', color: SOCIAL.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
                                            <Link href={`/agrisocial/profile/${cId}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none', marginRight: 6 }}>
                                                {cName}
                                            </Link>
                                            {c.text}
                                        </p>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                                            <span style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 600 }}>{timeAgo(c.createdAt)}</span>
                                            {likeCount > 0 && (
                                                <span style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 600 }}>
                                                    {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                                                </span>
                                            )}
                                            {viewerId && (
                                                <button
                                                    onClick={() => handleReply(c)}
                                                    style={{
                                                        background: 'none', border: 'none', cursor: 'pointer',
                                                        color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700,
                                                        padding: 0,
                                                    }}
                                                >
                                                    Reply
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Like heart button */}
                                    {viewerId && (
                                        <button
                                            onClick={() => handleLike(c._id)}
                                            aria-label={isLiked ? 'Unlike' : 'Like'}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                padding: 4, flexShrink: 0, lineHeight: 1,
                                            }}
                                        >
                                            <HeartIcon filled={isLiked} size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Replies (nested) */}
                                {replies.length > 0 && (
                                    <div style={{ marginLeft: 42, marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${SOCIAL.border}` }}>
                                        {replies.map((r) => {
                                            const rName = getUserName(r.userId)
                                            const rPic = getUserPic(r.userId)
                                            const rId = getUserId(r.userId)
                                            const rLiked = likedComments.has(r._id)
                                            const rCount = likeCounts[r._id] || 0
                                            return (
                                                <div key={r._id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                                                    <Avatar name={rName} src={rPic} size={24} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ margin: 0, fontSize: '0.82rem', color: SOCIAL.text, lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                            <Link href={`/agrisocial/profile/${rId}`} style={{ color: SOCIAL.text, fontWeight: 700, textDecoration: 'none', marginRight: 6 }}>
                                                                {rName}
                                                            </Link>
                                                            {r.text}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center' }}>
                                                            <span style={{ color: SOCIAL.muted, fontSize: '0.68rem', fontWeight: 600 }}>{timeAgo(r.createdAt)}</span>
                                                            {rCount > 0 && (
                                                                <span style={{ color: SOCIAL.muted, fontSize: '0.68rem', fontWeight: 600 }}>
                                                                    {rCount} {rCount === 1 ? 'like' : 'likes'}
                                                                </span>
                                                            )}
                                                            {viewerId && (
                                                                <button
                                                                    onClick={() => handleLike(r._id)}
                                                                    aria-label={rLiked ? 'Unlike' : 'Like'}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 1 }}
                                                                >
                                                                    <HeartIcon filled={rLiked} size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Reply-to banner */}
                {replyTo && (
                    <div style={{
                        padding: '8px 16px', background: SOCIAL.bgSub || '#f8fafc',
                        borderTop: `1px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: '0.78rem', color: SOCIAL.muted,
                    }}>
                        <span>Replying to <strong style={{ color: SOCIAL.text }}>{getUserName(replyTo.userId)}</strong></span>
                        <button
                            onClick={() => { setReplyTo(null); setText('') }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: SOCIAL.muted, fontSize: '1.1rem', padding: 0 }}
                        >✕</button>
                    </div>
                )}

                {/* Sticky comment input */}
                {viewerId ? (
                    <div style={{
                        padding: '10px 16px', borderTop: `1px solid ${SOCIAL.border}`,
                        background: '#fff', display: 'flex', gap: 10, alignItems: 'center',
                        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                    }}>
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            placeholder={replyTo ? `Reply to ${getUserName(replyTo.userId)}…` : 'Add a comment…'}
                            style={{
                                flex: 1, padding: '10px 16px', background: SOCIAL.bg || '#f1f5f9',
                                border: `1px solid ${SOCIAL.border}`, borderRadius: '100px',
                                fontSize: '0.88rem', outline: 'none', color: SOCIAL.text,
                                fontFamily: SHARED.font,
                            }}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={posting || !text.trim()}
                            style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: SOCIAL.primary, fontWeight: 700, fontSize: '0.88rem',
                                opacity: posting || !text.trim() ? 0.4 : 1,
                                padding: '8px 4px', transition: 'opacity 0.15s ease',
                            }}
                        >
                            Post
                        </button>
                    </div>
                ) : (
                    <div style={{ padding: 16, borderTop: `1px solid ${SOCIAL.border}`, textAlign: 'center' }}>
                        <Link href="/auth/login" style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>
                            Log in to comment
                        </Link>
                    </div>
                )}
            </div>

            <style>{`
                @media (min-width: 768px) {
                    .comment-sheet { max-width: 480px; left: 50% !important; transform: translateX(-50%) !important; }
                }
            `}</style>
        </>
    )
}

function HeartIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#ed4956' : 'none'} stroke={filled ? '#ed4956' : '#8e8e8e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
    )
}
