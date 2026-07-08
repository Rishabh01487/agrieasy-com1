'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

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

// Helper: safely extract a string ID from a senderId that may be a populated User or a raw string.
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

    // Start a conversation with a specific user (from URL ?userId=)
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

    // Poll for new messages every 3s when chat is open (faster = more real-time feel)
    // Also track previous message count to detect new messages
    const prevMsgCountRef = useRef(0)
    useEffect(() => {
        if (!activeId) return
        const i = setInterval(async () => {
            await fetchActive(activeId)
            // Check for new messages from the other person (sound notification)
            if (active && active.messages) {
                const newCount = active.messages.length
                if (newCount > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
                    // New message arrived — play a subtle notification sound
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
                                    // If in share mode, send the shared post/story link as a message
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
                                    const other = active.participants.find((p: any) => p._id.toString() !== viewerId) || active.participants[0]
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
                                                // Double-click to react with ❤️ (Instagram-style)
                                                setMessageReactions(prev => ({ ...prev, [m._id]: prev[m._id] === '❤️' ? '' : '❤️' }))
                                            }} style={{ position: 'relative', maxWidth: '70%', background: isMine ? SOCIAL.gradient : SOCIAL.white, color: isMine ? '#fff' : SOCIAL.text, padding: '8px 14px', borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: isMine ? 'none' : `1px solid ${SOCIAL.border}`, fontSize: '0.86rem', boxShadow: SHARED.shadow, cursor: 'pointer' }}>
                                                {m.mediaUrl && m.mediaType === 'image' && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={m.mediaUrl} alt="msg" style={{ width: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0 }} />
                                                )}
                                                {m.text && <p style={{ margin: 0, lineHeight: 1.4 }}>{m.text}</p>}
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
                                        // Compress + upload to Cloudinary
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
                                            const sigRes = await authFetch('/api/social/upload-signature')
                                            const sig = await sigRes.json()
                                            if (!sig.available) return
                                            const fd = new FormData()
                                            fd.append('file', blob)
                                            fd.append('api_key', sig.apiKey)
                                            fd.append('timestamp', sig.timestamp.toString())
                                            fd.append('signature', sig.signature)
                                            fd.append('folder', sig.folder)
                                            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
                                            const cld = await cldRes.json()
                                            if (cldRes.ok && cld.secure_url) {
                                                // Send as a message with media
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
        </div>
    )
}
