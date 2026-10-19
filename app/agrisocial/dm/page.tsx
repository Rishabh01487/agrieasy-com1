'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import AgriSocialBottomNav from '../components/AgriSocialBottomNav'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; profilePic?: string }
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

/* Instagram-style preview text for the conversation list.
   Replaces raw shared-post / shared-story URLs with clean copy
   ("You shared a post" / "X shared a Reel") so the list never shows
   raw links — matches Instagram Direct's "X shared a Reel" previews. */
function previewFor(text: string, senderName: string, isMine: boolean): string {
    if (!text) return '📷 Photo'
    if (/\/agrisocial\/post\//i.test(text)) return isMine ? 'You shared a post' : `${senderName.split(' ')[0]} shared a post`
    if (/\/agrisocial\/stories\//i.test(text)) return isMine ? 'You shared a story' : `${senderName.split(' ')[0]} shared a Reel`
    return text
}

/* Verified-badge heuristic — show the blue check next to "verified"
   service-provider accounts (transporters / drivers) in the agri network. */
function isVerifiedUser(u: User | null | undefined): boolean {
    if (!u) return false
    return u.role === 'transporter' || u.role === 'driver'
}

function VerifiedBadge({ size = 13 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 4, flexShrink: 0 }} aria-label="Verified">
            <path fill="#0095F6" d="M12 1.5l2.6 2.1 3.3-.3 1 3.2 2.9 1.6-.9 3.2 1.6 2.9-2.4 2.3.3 3.3-3.2 1-1.6 2.9-3.2-.9-2.9 1.6-2.3-2.4-3.3.3-1-3.2L1 14.6l.9-3.2L.3 8.5l2.4-2.3-.3-3.3 3.2-1L7.1.5l3.2.9L12 1.5z" />
            <path fill="#fff" d="M10.5 14.6L8 12.1l-1.4 1.4 3.9 3.9 7-7-1.4-1.4z" />
        </svg>
    )
}

function Avatar({ name, size = 44, src }: { name: string; size?: number; src?: string }) {
    if (src) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: SOCIAL.bgSub }} />
        )
    }
    return <div style={{ width: size, height: size, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.4, flexShrink: 0, fontFamily: SHARED.font }}>{name?.[0]?.toUpperCase() || 'U'}</div>
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
    // Viewer profile (name + pic) for the Instagram-style top bar ("username ▾").
    const [viewerName, setViewerName] = useState<string>('')
    const [viewerPic, setViewerPic] = useState<string>('')
    const [shareMode, setShareMode] = useState<string | null>(sharePostId || shareStoryId)
    const [otherTyping, setOtherTyping] = useState(false)
    const [messageReactions, setMessageReactions] = useState<Record<string, string>>({}) // messageId → emoji
    // Mobile navigation: when true, the chat panel replaces the list on mobile.
    const [mobileChatOpen, setMobileChatOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'general' | 'requests'>('primary')
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

    // Fetch the viewer's profile (name + pic) so the top bar can show
    // "username ▾" Instagram-style instead of a generic label.
    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await authFetch('/api/social/profile')
                if (cancelled || !res.ok) return
                const d = await res.json()
                const u = d.user || d.data?.user
                if (u?.farmerName) setViewerName(u.farmerName)
                else if (u?.firmName) setViewerName(u.firmName)
                if (u?.profilePic) setViewerPic(u.profilePic)
            } catch {}
        })()
        return () => { cancelled = true }
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
                    setMobileChatOpen(true)
                    fetchConversations()
                }
            } catch {}
        })()
    }, [targetUserId, fetchConversations])

    useEffect(() => { fetchConversations() }, [fetchConversations])
    useEffect(() => { if (activeId) { fetchActive(activeId); setMobileChatOpen(true) } }, [activeId, fetchActive])

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

    const tabs: Array<{ key: typeof activeTab; label: string }> = [
        { key: 'all', label: 'All' },
        { key: 'primary', label: 'Primary' },
        { key: 'general', label: 'General' },
        { key: 'requests', label: 'Requests' },
    ]

    // Search filters the conversation list by name (Instagram-style).
    const filteredConversations = conversations.filter(c => {
        if (!searchQuery) return true
        const name = (c.other?.farmerName || c.other?.firmName || 'User').toLowerCase()
        return name.includes(searchQuery.toLowerCase())
    })

    // Notes/Stories row — first item is "Your note", others are top conversations.
    const storyItems = conversations.slice(0, 8)

    return (
        <div className="ig-dm-root" style={{ background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <style>{`
                .ig-dm-root {
                    min-height: 100vh;
                    height: 100vh;
                    height: 100dvh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                /* Mobile-first: list and chat stack — only one visible at a time */
                .ig-dm-body { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
                .ig-dm-list { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; background: ${SOCIAL.white}; }
                .ig-dm-chat { display: none; width: 100%; height: 100%; flex-direction: column; background: ${SOCIAL.bg}; }

                /* Mobile: when a chat is open, hide the list and show the chat */
                .ig-dm-body.mobile-chat-open .ig-dm-list { display: none; }
                .ig-dm-body.mobile-chat-open .ig-dm-chat { display: flex; }

                /* Desktop (≥768px): side-by-side, both panels always visible */
                @media (min-width: 768px) {
                    .ig-dm-body { flex-direction: row; max-width: 1100px; margin: 0 auto; width: 100%; }
                    .ig-dm-list { width: min(350px, 40%); flex-shrink: 0; border-right: 1px solid ${SOCIAL.border}; }
                    .ig-dm-body.mobile-chat-open .ig-dm-list { display: block; }
                    .ig-dm-chat { display: flex; flex: 1; min-width: 0; }
                    /* Hide the chat back-arrow on desktop (both panels are visible) */
                    .ig-chat-back { display: none !important; }
                }

                /* Hide scrollbars on the notes row for a cleaner Instagram look */
                .ig-notes-row::-webkit-scrollbar { display: none; }
                .ig-notes-row { -ms-overflow-style: none; scrollbar-width: none; }
                .ig-tabs-row::-webkit-scrollbar { display: none; }
                .ig-tabs-row { -ms-overflow-style: none; scrollbar-width: none; }

                /* Typing indicator animation */
                @keyframes typing {
                    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
                    30% { opacity: 1; transform: translateY(-3px); }
                }
            `}</style>

            {/* Share overlay banner — appears when sharing a post/story via DM */}
            {shareMode && (
                <div style={{ background: SOCIAL.primaryLight, borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: '1.1rem' }}>📤</span>
                    <span style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.84rem', flex: 1 }}>Sharing a {sharePostId ? 'post' : 'story'} — pick a conversation below to send it</span>
                    <button onClick={() => { setShareMode(null); window.history.replaceState({}, '', '/agrisocial/dm') }} style={{ background: 'none', border: 'none', color: SOCIAL.muted, cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
            )}

            <div className={`ig-dm-body ${mobileChatOpen ? 'mobile-chat-open' : ''}`}>
                {/* ============================ LIST PANEL ============================ */}
                <div className="ig-dm-list">
                    {/* Top bar — Instagram-style: back arrow | username ▾ | new-message icon */}
                    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${SOCIAL.borderLight}`, paddingTop: 'env(safe-area-inset-top)', flexShrink: 0 }}>
                        <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 14, padding: '0 12px' }}>
                            <Link href="/agrisocial" aria-label="Back to AgriSocial" style={{ color: SOCIAL.text, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0 }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                            </Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: SOCIAL.text, fontWeight: 800, fontSize: '1.05rem', fontFamily: SHARED.font, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{viewerName || 'Messages'}</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            <Link href="/agrisocial/search" aria-label="New message" style={{ color: SOCIAL.text, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </Link>
                        </div>
                        {/* Search bar */}
                        <div style={{ padding: '0 12px 10px' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SOCIAL.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search"
                                    style={{ width: '100%', padding: '9px 12px 9px 32px', background: SOCIAL.bgSub, border: 'none', borderRadius: 10, fontSize: '0.86rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }}
                                />
                            </div>
                        </div>
                    </header>

                    {/* Notes / Stories horizontal scroll — hidden while searching */}
                    {!searchQuery && (
                        <div className="ig-notes-row" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '14px 12px', borderBottom: `1px solid ${SOCIAL.borderLight}` }}>
                            {/* "Your note" — first item, with a "+" badge to add a note */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64, flexShrink: 0 }}>
                                <div style={{ position: 'relative', width: 56, height: 56 }}>
                                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: SOCIAL.bgSub, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${SOCIAL.border}`, overflow: 'hidden' }}>
                                        {viewerPic ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={viewerPic} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Avatar name={viewerName || 'U'} size={52} />
                                        )}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%', background: SOCIAL.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', fontWeight: 700, border: `2px solid ${SOCIAL.white}`, lineHeight: 1 }}>＋</div>
                                </div>
                                <span style={{ fontSize: '0.66rem', color: SOCIAL.muted, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>Your note</span>
                            </div>
                            {/* Friends' avatars with gradient rings (colored ring = unread) */}
                            {storyItems.map(c => {
                                const name = c.other?.farmerName || c.other?.firmName || 'User'
                                return (
                                    <button key={c._id} onClick={() => { setActiveId(c._id); setMobileChatOpen(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 64, flexShrink: 0, fontFamily: SHARED.font }}>
                                        <div style={{ width: 60, height: 60, borderRadius: '50%', padding: 2, background: c.unread ? SOCIAL.gradientRing : SOCIAL.borderLight }}>
                                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', padding: 2, background: SOCIAL.white }}>
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <Avatar name={name} size={52} src={c.other?.profilePic} />
                                                </div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '0.66rem', color: SOCIAL.text, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{name.split(' ')[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* Tabs row — All | Primary | General | Requests (visual only; "Primary" is the default) */}
                    {!searchQuery && (
                        <div className="ig-tabs-row" style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: `1px solid ${SOCIAL.borderLight}`, overflowX: 'auto' }}>
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setActiveTab(t.key)}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: activeTab === t.key ? SOCIAL.text : SOCIAL.bgSub,
                                        color: activeTab === t.key ? '#fff' : SOCIAL.muted,
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontFamily: SHARED.font,
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Conversation list (filtered by search) */}
                    {loading ? (
                        <div style={{ padding: 32, textAlign: 'center', color: SOCIAL.muted, fontSize: '0.86rem' }}>Loading…</div>
                    ) : filteredConversations.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: SOCIAL.muted }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✈️</div>
                            <p style={{ fontSize: '0.92rem', margin: 0, fontWeight: 700, color: SOCIAL.text }}>No conversations</p>
                            <p style={{ fontSize: '0.8rem', margin: '8px 0 14px' }}>{searchQuery ? 'No results for your search.' : 'Find people to message on the search page.'}</p>
                            {!searchQuery && (
                                <Link href="/agrisocial/search" style={{ display: 'inline-block', padding: '8px 18px', background: SOCIAL.primary, color: '#fff', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.84rem' }}>🔍 Search users</Link>
                            )}
                        </div>
                    ) : (
                        filteredConversations.map(c => {
                            const name = c.other?.farmerName || c.other?.firmName || 'User'
                            const preview = previewFor(c.lastMessageText, name, false)
                            const verified = isVerifiedUser(c.other)
                            return (
                                <button key={c._id} onClick={async () => {
                                    setActiveId(c._id)
                                    setMobileChatOpen(true)
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
                                    style={{ width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', borderBottom: `1px solid ${SOCIAL.borderLight}`, cursor: 'pointer', textAlign: 'left', fontFamily: SHARED.font }}>
                                    {/* Unread blue dot — Instagram style (left of avatar) */}
                                    {c.unread ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0095F6', flexShrink: 0 }} /> : <div style={{ width: 8, flexShrink: 0 }} />}
                                    <Avatar name={name} size={56} src={c.other?.profilePic} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <span style={{ color: SOCIAL.text, fontWeight: c.unread ? 800 : 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', maxWidth: 'calc(100% - 50px)' }}>
                                                {name}
                                                {verified && <VerifiedBadge size={13} />}
                                            </span>
                                            <span style={{ color: SOCIAL.muted, fontSize: '0.74rem', flexShrink: 0 }}>{timeAgo(c.lastMessageAt)}</span>
                                        </div>
                                        <p style={{ color: c.unread ? SOCIAL.text : SOCIAL.muted, fontWeight: c.unread ? 600 : 400, fontSize: '0.82rem', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {preview}
                                        </p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>

                {/* ============================ CHAT PANEL ============================ */}
                <div className="ig-dm-chat">
                    {!activeId || !active ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: SOCIAL.muted, padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✈️</div>
                            <h3 style={{ color: SOCIAL.text, fontWeight: 700, margin: '0 0 6px', fontSize: '1.1rem' }}>Your messages</h3>
                            <p style={{ fontSize: '0.86rem', margin: '0 0 16px' }}>Pick a conversation or start a new one.</p>
                            <Link href="/agrisocial/search" style={{ padding: '10px 22px', background: SOCIAL.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Find someone to message</Link>
                        </div>
                    ) : (
                        <>
                            {/* Chat header — Instagram style: back (mobile) | avatar | name | video | call | info */}
                            <div style={{ paddingTop: 'env(safe-area-inset-top)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${SOCIAL.borderLight}`, flexShrink: 0, position: 'relative', zIndex: 10 }}>
                                <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 6, padding: '0 8px' }}>
                                    {/* Back arrow — mobile only (returns to the list) */}
                                    <button onClick={() => setMobileChatOpen(false)} className="ig-chat-back" aria-label="Back to messages" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0, color: SOCIAL.text }}>
                                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                                    </button>
                                    {(() => {
                                        const other = active.participants.find((p: any) => (p?._id?.toString?.() || '') !== viewerId) || active.participants[0]
                                        const name = other?.farmerName || other?.firmName || 'User'
                                        const verified = isVerifiedUser(other)
                                        return (
                                            <>
                                                <Link href={`/agrisocial/profile/${other?._id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                                                    <Avatar name={name} size={36} src={other?.profilePic} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <span style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.92rem', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                            {name}
                                                            {verified && <VerifiedBadge size={12} />}
                                                        </span>
                                                        <p style={{ color: SOCIAL.muted, fontSize: '0.7rem', margin: 0 }}>{roleLabel[other?.role || ''] || 'AgriSocial'}</p>
                                                    </div>
                                                </Link>
                                                {/* Video / Call / Info icons (Instagram-style header actions) */}
                                                <button aria-label="Video call" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0, color: SOCIAL.text }}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                                                </button>
                                                <button aria-label="Voice call" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0, color: SOCIAL.text }}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                </button>
                                                <Link href={`/agrisocial/profile/${other?._id}`} aria-label="Profile info" style={{ color: SOCIAL.text, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, flexShrink: 0 }}>
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                                </Link>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: SOCIAL.bg, minHeight: 0 }}>
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
                            <div style={{ padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', background: SOCIAL.white, borderTop: `1px solid ${SOCIAL.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
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
                                    style={{ flex: 1, padding: '10px 16px', background: SOCIAL.bgSub, border: `1px solid ${SOCIAL.borderLight}`, borderRadius: '100px', fontSize: '0.88rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font, minWidth: 0 }} />
                                <button onClick={handleSend} disabled={!text.trim() || sending}
                                    style={{ background: 'transparent', color: SOCIAL.primary, border: 'none', borderRadius: 100, padding: '0 12px', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', opacity: !text.trim() || sending ? 0.4 : 1, fontFamily: SHARED.font, flexShrink: 0 }}>
                                    Send
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Extra safe-area spacer so the fixed bottom nav never overlaps the
                chat composer on devices with a home indicator (e.g. iPhone X+).
                AgriSocialBottomNav renders its own 56px spacer + the fixed bar,
                but that spacer doesn't account for env(safe-area-inset-bottom). */}
            <div style={{ height: 'env(safe-area-inset-bottom)', flexShrink: 0 }} aria-hidden />

            {/* Instagram-style bottom nav (renders its own 56px spacer + fixed bar) */}
            <AgriSocialBottomNav active="send" />
        </div>
    )
}
