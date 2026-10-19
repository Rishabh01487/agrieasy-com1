'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import AgriSocialBottomNav from '../components/AgriSocialBottomNav'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Conversation {
    _id: string
    other: User | null
    lastMessageText: string
    lastMessageAt: string
    unread: boolean
}
interface Message {
    _id: string
    senderId: User | string
    text: string
    mediaUrl?: string
    mediaType?: string
    readBy?: string[]
    createdAt: string
}interface ConversationDetail {
    _id: string
    participants: User[]
    messages: Message[]
}

function senderIdOf(s: User | string): string {
    return typeof s === 'object' ? s._id : s
}
function senderNameOf(s: User | string): string {
    return typeof s === 'object' ? (s.farmerName || s.firmName || 'User') : 'User'
}
const senderNameStr = (m: Message): string =>
    typeof m.senderId === 'object' ? (m.senderId.farmerName || m.senderId.firmName || 'User') : 'User'

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return 'now'
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{name?.[0]?.toUpperCase() || 'U'}</div>
}

/* ------------------------------------------------------------------ */
/* Shared-post preview card — renders inside DM conversations          */
/* Detects /agrisocial/post/{id} URLs in message text and shows the    */
/* post's thumbnail + caption as a tappable card (Instagram Direct).   */
/* ------------------------------------------------------------------ */
interface SharedPostData {
    _id: string
    mediaUrl?: string
    mediaType?: string
    caption: string
    userId?: { _id: string; farmerName?: string; firmName?: string; profilePic?: string } | string
}

// Module-level cache so we don't re-fetch the same shared post every render
const sharedPostCache: Record<string, SharedPostData | null> = {}

function SharedPostCard({ postId, isMine }: { postId: string; isMine: boolean }) {
    const [post, setPost] = useState<SharedPostData | null | undefined>(sharedPostCache[postId] === undefined ? undefined : sharedPostCache[postId])

    useEffect(() => {
        if (sharedPostCache[postId] !== undefined) { setPost(sharedPostCache[postId]); return }
        let cancelled = false
        ;(async () => {
            try {
                const res = await authFetch(`/api/social/posts/${postId}`)
                if (cancelled || !res.ok) { sharedPostCache[postId] = null; setPost(null); return }
                const d = await res.json()
                const p = d.post || d.data?.post
                sharedPostCache[postId] = p || null
                setPost(p || null)
            } catch {
                sharedPostCache[postId] = null
                setPost(null)
            }
        })()
        return () => { cancelled = true }
    }, [postId])

    if (post === undefined) {
        return <div style={{ padding: '14px 18px', background: isMine ? 'rgba(255,255,255,0.15)' : SOCIAL.bgSub, borderRadius: 12, fontSize: '0.78rem', color: isMine ? '#fff' : SOCIAL.muted, textAlign: 'center' }}>Loading shared post…</div>
    }
    if (post === null) {
        return (
            <Link href={`/agrisocial/post/${postId}`} style={{ display: 'block', padding: '10px 14px', background: isMine ? 'rgba(255,255,255,0.15)' : SOCIAL.bgSub, borderRadius: 12, fontSize: '0.78rem', color: isMine ? '#fff' : SOCIAL.primary, textDecoration: 'none', fontWeight: 700 }}>
                View shared post →
            </Link>
        )
    }

    const author = typeof post.userId === 'object' ? post.userId : null
    const authorName = author?.farmerName || author?.firmName || 'User'
    const isVideo = post.mediaType === 'video'
    const isImage = post.mediaType === 'image' && post.mediaUrl

    return (
        <Link href={`/agrisocial/post/${postId}`} style={{ display: 'block', textDecoration: 'none', borderRadius: 12, overflow: 'hidden', border: `1px solid ${isMine ? 'rgba(255,255,255,0.25)' : SOCIAL.border}`, background: '#000', maxWidth: 260 }}>
            {/* Media thumbnail */}
            {post.mediaUrl && (isVideo || isImage) ? (
                <div style={{ position: 'relative', background: '#000' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={isVideo ? `${post.mediaUrl.replace(/\.[^.]+$/, '')}.jpg` : post.mediaUrl} alt="shared" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    {isVideo && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    )}
                    <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{isVideo ? '🎬 Clip' : '📸 Post'}</span>
                </div>
            ) : (
                <div style={{ background: isMine ? 'rgba(255,255,255,0.1)' : SOCIAL.bgSub, padding: '20px', textAlign: 'center', color: isMine ? '#fff' : SOCIAL.muted, fontSize: '1.4rem' }}>📝</div>
            )}
            {/* Caption + author */}
            <div style={{ padding: '8px 12px', background: isMine ? 'rgba(255,255,255,0.12)' : SOCIAL.white }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: isMine ? '#fff' : SOCIAL.text, opacity: 0.9 }}>@{authorName.toLowerCase().replace(/[^a-z0-9]/g, '')}</p>
                {post.caption && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: isMine ? 'rgba(255,255,255,0.9)' : SOCIAL.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.caption}</p>}
            </div>
        </Link>
    )
}

// Detect /agrisocial/post/{id} or /agrisocial/stories/{id} URLs in a text
function extractSharedPostId(text: string): string | null {
    const m = text.match(/\/agrisocial\/post\/([a-f0-9]{24})/i)
    return m ? m[1] : null
}

export default function AgriSocialDM() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <AgriSocialDMInner />
        </Suspense>
    )
}

function AgriSocialDMInner() {
    const searchParams = useSearchParams()
    const targetConversationId = searchParams.get('conversationId')
    const targetUserId = searchParams.get('userId')
    const sharePostId = searchParams.get('sharePost')
    const shareStoryId = searchParams.get('shareStory')

    const [conversations, setConversations] = useState<Conversation[]>([])
    const [activeId, setActiveId] = useState<string | null>(targetConversationId)
    const [active, setActive] = useState<ConversationDetail | null>(null)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(true)
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [shareMode, setShareMode] = useState<string | null>(sharePostId || shareStoryId)
    const [otherTyping, setOtherTyping] = useState(false)
    const [messageReactions, setMessageReactions] = useState<Record<string, string>>({}) // messageId → emoji
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const fetchConversations = useCallback(async () => {
        try {
            const res = await authFetch('/api/social/dm/conversations')
            if (res.ok) {
                const d = await res.json()
                setConversations(d.data?.conversations || [])
            }
        } catch {}
        setLoading(false)
    }, [])

    const fetchActive = useCallback(async (id: string) => {
        try {
            const res = await authFetch(`/api/social/dm/messages?conversationId=${id}`)
            if (res.ok) {
                const d = await res.json()
                setActive(d.data?.conversation || null)
            }
        } catch {}
    }, [])

    useEffect(() => {
        if (!targetUserId) return
        (async () => {
            try {
                const res = await authFetch('/api/social/dm/conversations', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ participantId: targetUserId }),
                })
                if (res.ok) {
                    const d = await res.json()
                    const conv = d.conversation
                    setActiveId(conv._id)
                    fetchConversations()
                }
            } catch {}
        })()
    }, [targetUserId, fetchConversations])

    useEffect(() => { fetchConversations() }, [fetchConversations])
    useEffect(() => { if (activeId) fetchActive(activeId) }, [activeId, fetchActive])

    const prevMsgCountRef = useRef(0)
    useEffect(() => {
        if (!activeId) return
        const i = setInterval(async () => {
            await fetchActive(activeId)
            if (active && active.messages) {
                const newCount = active.messages.length
                if (newCount > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
                        audio.volume = 0.3
                        audio.play().catch(() => null)
                    } catch {}
                }
                prevMsgCountRef.current = newCount
            }
        }, 3000)
        return () => clearInterval(i)
    }, [activeId, fetchActive, active])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [active?.messages?.length])

    const handleSend = async () => {
        if (!text.trim() || sending) return
        const textCopy = text
        setText('')
        setSending(true)
        try {
            // Optimistic: append immediately
            const optimistic: Message = {
                _id: `tmp-${Date.now()}`,
                senderId: viewerId,
                text: textCopy,
                mediaType: 'text',
                readBy: [viewerId],
                createdAt: new Date().toISOString(),
            }
            setActive(a => a ? { ...a, messages: [...(a.messages || []), optimistic] } : a)

            const convId = activeId
            if (!convId) return
            const res = await authFetch('/api/social/dm/messages', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: convId, text: textCopy }),
            })
            if (res.ok) {
                const d = await res.json()
                if (d.conversationId && d.conversationId !== convId) {
                    setActiveId(d.conversationId)
                }
                fetchConversations()
                fetchActive(convId)
            }
        } catch {}
        setSending(false)
    }
    const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font, display: 'flex', flexDirection: 'column' }}>
            {/* Top nav */}
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text, marginLeft: 'auto', marginRight: 'auto' }}>✈️ Direct Messages</span>
            </nav>

            {/* Share overlay — appears when sharing a post/story via DM */}
            {shareMode && (
                <div style={{ background: SOCIAL.primaryLight, borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>📤</span>
                    <span style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.84rem', flex: 1 }}>Sharing a {sharePostId ? 'post' : 'story'} — pick a conversation below to send it</span>
                    <button onClick={() => { setShareMode(null); window.history.replaceState({}, '', '/agrisocial/dm') }} style={{ background: 'none', border: 'none', color: SOCIAL.muted, cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
            )}

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', maxWidth: '1100px', margin: '0 auto', width: '100%', minHeight: 'calc(100vh - 56px)' }}>
                {/* Conversation list */}
                <div style={{ borderRight: `1px solid ${SOCIAL.border}`, background: SOCIAL.white, overflowY: 'auto' }}>
                    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${SOCIAL.border}` }}>
                        <h3 style={{ margin: 0, color: SOCIAL.text, fontWeight: 800, fontSize: '1rem' }}>Messages</h3>
                        <p style={{ margin: '4px 0 0', color: SOCIAL.muted, fontSize: '0.78rem' }}>{conversations.filter(c => c.unread).length} unread</p>
                    </div>
                    {loading ? (
                        <div style={{ padding: 24, textAlign: 'center', color: SOCIAL.muted, fontSize: '0.84rem' }}>Loading…</div>
                    ) : conversations.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: SOCIAL.muted }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✈️</div>
                            <p style={{ fontSize: '0.86rem', margin: 0 }}>No conversations yet.</p>
                            <p style={{ fontSize: '0.78rem', margin: '6px 0 12px' }}>Find people to message on the search page.</p>
                            <Link href="/agrisocial/search" style={{ color: SOCIAL.primary, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>🔍 Search users</Link>
                        </div>
                    ) : (
                        conversations.map(c => {
                            const name = c.other?.farmerName || c.other?.firmName || 'User'
                            return (
                                <button key={c._id} onClick={async () => {
                                    setActiveId(c._id)
                                    if (shareMode) {
                                        const shareUrl = sharePostId
                                            ? `${window.location.origin}/agrisocial/post/${sharePostId}`
                                            : `${window.location.origin}/agrisocial/stories/${shareStoryId}`
                                        const shareText = `Check out this ${sharePostId ? 'post' : 'story'}: ${shareUrl}`
                                        try {
                                            await authFetch('/api/social/dm/messages', {
                                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ conversationId: c._id, text: shareText }),
                                            })
                                        } catch {}
                                        setShareMode(null)
                                        window.history.replaceState({}, '', '/agrisocial/dm')
                                    }
                                }}
                                    style={{ width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: activeId === c._id ? SOCIAL.primaryLight : 'transparent', border: 'none', borderBottom: `1px solid ${SOCIAL.borderLight}`, cursor: 'pointer', textAlign: 'left' }}>
                                    <Avatar name={name} size={44} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <p style={{ color: SOCIAL.text, fontWeight: c.unread ? 800 : 700, fontSize: '0.86rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                            <span style={{ color: SOCIAL.muted, fontSize: '0.7rem', flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                                        </div>
                                        <p style={{ color: c.unread ? SOCIAL.text : SOCIAL.muted, fontWeight: c.unread ? 600 : 400, fontSize: '0.78rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.lastMessageText || 'Start chatting'}
                                        </p>
                                    </div>
                                    {c.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: SOCIAL.primary, flexShrink: 0 }} />}
                                </button>
                            )
                        })
                    )}
                </div>

                {/* Chat panel */}
                <div style={{ display: 'flex', flexDirection: 'column', background: SOCIAL.bgSub }}>
                    {!activeId || !active ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: SOCIAL.muted, padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✈️</div>
                            <h3 style={{ color: SOCIAL.text, fontWeight: 700, margin: '0 0 6px' }}>Your messages</h3>
                            <p style={{ fontSize: '0.86rem', margin: '0 0 16px' }}>Pick a conversation or start a new one.</p>
                            <Link href="/agrisocial/search" style={{ padding: '10px 22px', background: SOCIAL.primary, color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Find someone to message</Link>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div style={{ padding: '12px 16px', background: SOCIAL.white, borderBottom: `1px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                                {(() => {
                                    const other = active.participants.find((p: any) => (p?._id?.toString?.() || '') !== viewerId) || active.participants[0]
                                    const name = other?.farmerName || other?.firmName || 'User'
                                    return (
                                        <>
                                            <Link href={`/agrisocial/profile/${other?._id}`}><Avatar name={name} size={40} /></Link>
                                            <div>
                                                <Link href={`/agrisocial/profile/${other?._id}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}>{name}</Link>
                                                <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0 }}>{roleLabel[other?.role || ''] || 'User'}</p>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                                {active.messages?.length === 0 && (
                                    <div style={{ textAlign: 'center', color: SOCIAL.muted, padding: 24, fontSize: '0.86rem' }}>
                                        Say hello 👋
                                    </div>
                                )}
                                {active.messages?.map((m, i) => {
                                    const senderIdStr = typeof m.senderId === 'object' ? (m.senderId as User)._id : m.senderId
                                    const isMine = senderIdStr?.toString() === viewerId
                                    const senderName = typeof m.senderId === 'object' ? (m.senderId as User).farmerName || (m.senderId as User).firmName || 'User' : 'User'
                                    const prevMsg = i > 0 ? active.messages[i - 1] : null
                                    const prevSenderStr = prevMsg ? (typeof prevMsg.senderId === 'object' ? (prevMsg.senderId as User)._id : prevMsg.senderId) : ''
                                    const prevSame = !!prevMsg && prevSenderStr?.toString() === senderIdStr?.toString()
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                                            {!isMine && !prevSame ? <Avatar name={senderName} size={28} /> : <div style={{ width: 28 }} />}
                                            <div onDoubleClick={() => {
                                                setMessageReactions(prev => ({ ...prev, [m._id]: prev[m._id] === '❤️' ? '' : '❤️' }))
                                            }} style={{ position: 'relative', maxWidth: '70%', background: isMine ? SOCIAL.gradient : SOCIAL.white, color: isMine ? '#fff' : SOCIAL.text, padding: '8px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMine ? 'none' : `1px solid ${SOCIAL.border}`, fontSize: '0.86rem', boxShadow: SHARED.shadow, cursor: 'pointer' }}>
                                                {m.mediaUrl && m.mediaType === 'image' && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={m.mediaUrl} alt="msg" style={{ width: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0 }} />
                                                )}
                                                {(() => {
                                                    // Detect a shared-post URL in the text and render it
                                                    // as a rich preview card (Instagram Direct style) so
                                                    // shared clips/posts are visible inline in the chat.
                                                    // Wrapped in try/catch so a bad API response can NEVER
                                                    // crash the whole DM page.
                                                    if (!m.text) return null
                                                    try {
                                                        const sharedId = extractSharedPostId(m.text)
                                                        if (sharedId) {
                                                            return <SharedPostCard postId={sharedId} isMine={isMine} />
                                                        }
                                                    } catch { /* silent — fall through to plain text */ }
                                                    return <p style={{ margin: 0, lineHeight: 1.4 }}>{m.text}</p>
                                                })()}
                                                {/* Read receipt for my messages */}
                                                {isMine && m.readBy && m.readBy.length > 1 && (
                                                    <span style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: 2, display: 'block', textAlign: 'right' }}>Seen</span>
                                                )}
                                                {/* Reaction badge */}
                                                {messageReactions[m._id] && (
                                                    <span style={{ position: 'absolute', bottom: -8, right: isMine ? 8 : 'auto', left: isMine ? 'auto' : 8, background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 100, padding: '1px 6px', fontSize: '0.75rem', boxShadow: SHARED.shadow }}>
                                                        {messageReactions[m._id]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                                {/* Typing indicator */}
                                {otherTyping && (
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                        <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '18px 18px 18px 4px', padding: '8px 14px', fontSize: '0.86rem', color: SOCIAL.muted, display: 'flex', gap: 3 }}>
                                            <span style={{ animation: 'typing 1.4s infinite', display: 'inline-block' }}>●</span>
                                            <span style={{ animation: 'typing 1.4s infinite 0.2s', display: 'inline-block' }}>●</span>
                                            <span style={{ animation: 'typing 1.4s infinite 0.4s', display: 'inline-block' }}>●</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Composer */}
                            <div style={{ padding: '12px 16px', background: SOCIAL.white, borderTop: `1px solid ${SOCIAL.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
                                {/* Photo attach button */}
                                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: SOCIAL.primaryLight, flexShrink: 0, transition: 'background 0.2s' }} title="Send photo">
                                    <span style={{ fontSize: '1.1rem' }}>📷</span>
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file || !activeId) return
                                        try {
                                            const img = new Image()
                                            const url = URL.createObjectURL(file)
                                            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
                                            URL.revokeObjectURL(url)
                                            let w = img.width, h = img.height
                                            if (w > 800) { h = Math.round(h * 800 / w); w = 800 }
                                            const canvas = document.createElement('canvas')
                                            canvas.width = w; canvas.height = h
                                            const ctx = canvas.getContext('2d')!
                                            ctx.drawImage(img, 0, 0, w, h)
                                            const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void)
                                            const sigRes = await authFetch('/api/social/upload-signature?kind=image')
                                            const sig = await sigRes.json()
                                            if (!sig.available) return
                                            const fd = new FormData()
                                            fd.append('file', blob)
                                            fd.append('api_key', sig.apiKey)
                                            fd.append('timestamp', sig.timestamp.toString())
                                            fd.append('signature', sig.signature)
                                            fd.append('folder', sig.folder)
                                            // SECURITY: forward signed params — Cloudinary rejects uploads that omit signed params.
                                            fd.append('resource_type', sig.resourceType)
                                            fd.append('allowed_formats', sig.allowedFormats)
                                            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
                                            const cld = await cldRes.json()
                                            if (cldRes.ok && cld.secure_url) {
                                                await authFetch('/api/social/dm/messages', {
                                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ conversationId: activeId, text: '', mediaUrl: cld.secure_url, mediaType: 'image' }),
                                                })
                                                fetchActive(activeId)
                                                fetchConversations()
                                            }
                                        } catch {}
                                        e.target.value = '' // reset input
                                    }} />
                                </label>
                                <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                    placeholder="Message…"
                                    style={{ flex: 1, padding: '10px 14px', background: SOCIAL.bg, border: `1px solid ${SOCIAL.border}`, borderRadius: '100px', fontSize: '0.88rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }} />
                                <button onClick={handleSend} disabled={!text.trim() || sending}
                                    style={{ background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: '100px', padding: '0 18px', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', opacity: !text.trim() || sending ? 0.5 : 1 }}>
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Instagram-style bottom nav */}
            <AgriSocialBottomNav active="send" />
        </div>
    )
}
