'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { Icon, type IconName } from '@/lib/icons'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Post { _id: string; mediaUrl?: string; mediaType?: string; caption?: string }
interface Notification {
    _id: string
    userId: string
    actorId: User
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'comment_like' | 'story' | 'booking_request' | 'booking_status'
    postId?: Post
    commentId?: string
    conversationId?: string
    text: string
    isRead: boolean
    createdAt: string
}

function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)}m`
    if (s < 86400) return `${Math.floor(s / 3600)}h`
    if (s < 604800) return `${Math.floor(s / 86400)}d`
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const typeMeta: Record<string, { icon: IconName; color: string; verb: (n: Notification) => string }> = {
    like:        { icon: 'heart', color: '#ef4444', verb: () => 'liked your post.' },
    comment:     { icon: 'comment', color: '#2563eb', verb: () => 'commented on your post.' },
    comment_like:{ icon: 'heart', color: '#ef4444', verb: () => 'liked your comment.' },
    follow:      { icon: 'explore', color: '#10b981', verb: () => 'started following you.' },
    mention:     { icon: 'send', color: '#8b5cf6', verb: () => 'mentioned you.' },
    message:     { icon: 'dm', color: '#f59e0b', verb: () => 'sent you a message.' },
    story:       { icon: 'reels', color: '#3b82f6', verb: () => 'shared a new post.' },
}

export default function AgriSocialNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'follows' | 'mentions'>('all')
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await authFetch('/api/social/notifications?page=1&limit=50')
            if (res.ok) {
                const d = await res.json()
                setNotifications(d.data?.notifications || [])
            }
        } catch {}
        setLoading(false)
    }, [])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const unreadCount = notifications.filter(n => !n.isRead).length

    useEffect(() => {
        if (notifications.length === 0 || unreadCount === 0) return

        const markRead = async () => {
            try {
                const res = await authFetch('/api/social/notifications/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}',
                })
                if (res.ok) {
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                }
            } catch {}
        }

        const timer = setTimeout(markRead, 2000)
        return () => clearTimeout(timer)
    }, [notifications.length, unreadCount])

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        try {
            await authFetch('/api/social/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        } catch {}
    }

    const filtered = notifications.filter(n => {
        if (filter === 'follows') return n.type === 'follow'
        if (filter === 'mentions') return n.type === 'mention' || n.type === 'comment'
        return true
    })

    const groupedLikes: Record<string, { actors: Notification[]; latest: Notification }> = {}
    const standalone: Notification[] = []
    for (const n of filtered) {
        if ((n.type === 'like' || n.type === 'comment_like') && n.postId) {
            const pid = typeof n.postId === 'object' ? (n.postId as any)._id : n.postId
            if (!groupedLikes[pid]) {
                groupedLikes[pid] = { actors: [n], latest: n }
            } else {
                groupedLikes[pid].actors.push(n)
                if (new Date(n.createdAt) > new Date(groupedLikes[pid].latest.createdAt)) {
                    groupedLikes[pid].latest = n
                }
            }
        } else {
            standalone.push(n)
        }
    }
    const mergedNotifications = [
        ...Object.values(groupedLikes).map(g => ({
            ...g.latest,
            _actorCount: g.actors.length,
            _allActors: g.actors,
        })),
        ...standalone,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Group by day
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today.getTime() - 86400000)
    const week = new Date(today.getTime() - 7 * 86400000)
    const grouped: { label: string; items: any[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'This Week', items: [] },
        { label: 'Earlier', items: [] },
    ]
    for (const n of mergedNotifications) {
        const d = new Date(n.createdAt)
        if (d >= today) grouped[0].items.push(n)
        else if (d >= yesterday) grouped[1].items.push(n)
        else if (d >= week) grouped[2].items.push(n)
        else grouped[3].items.push(n)
    }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>❤️ Activity</span>
            </nav>

            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 14px 80px' }}>
                {/* Filter tabs + Mark all as read */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: `1px solid ${SOCIAL.border}`, alignItems: 'center' }}>
                    {([['all', 'All'], ['follows', 'Follows'], ['mentions', 'Mentions & Comments']] as const).map(([k, label]) => (
                        <button key={k} onClick={() => setFilter(k)}
                            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: filter === k ? `2px solid ${SOCIAL.primary}` : '2px solid transparent', color: filter === k ? SOCIAL.primary : SOCIAL.muted, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                            {label}
                        </button>
                    ))}
                    {unreadCount > 0 && (
                        <button onClick={markAllRead} style={{ marginLeft: 'auto', padding: '6px 14px', background: SOCIAL.primaryLight, color: SOCIAL.primary, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
                            Mark all as read ({unreadCount})
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60, color: SOCIAL.muted }}>Loading activity…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: SOCIAL.muted }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔔</div>
                        <h3 style={{ color: SOCIAL.text, margin: '0 0 6px' }}>No activity yet</h3>
                        <p style={{ fontSize: '0.86rem', margin: 0 }}>When people interact with you, you&apos;ll see it here.</p>
                    </div>
                ) : (
                    grouped.map(group => group.items.length === 0 ? null : (
                        <div key={group.label} style={{ marginBottom: 24 }}>
                            <h3 style={{ color: SOCIAL.muted, fontSize: '0.84rem', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{group.label}</h3>
                            {group.items.map(n => {
                                const actor = n.actorId
                                const name = actor?.farmerName || actor?.firmName || 'Someone'
                                const meta = typeMeta[n.type] || { icon: '🔔', verb: () => 'interacted with you.' }
                                const link = n.type === 'follow' ? `/agrisocial/profile/${actor?._id}`
                                    : n.type === 'message' ? `/agrisocial/dm?conversationId=${n.conversationId}`
                                    : n.postId ? `/agrisocial/post/${n.postId._id}`
                                    : '/agrisocial'
                                return (
                                    <Link key={n._id} href={link} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, marginBottom: 6, textDecoration: 'none', boxShadow: n.isRead ? 'none' : `0 0 0 2px ${SOCIAL.primaryLight}` }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
                                                {name[0]?.toUpperCase()}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${SOCIAL.border}` }}>
                                                <Icon name={meta.icon} size={13} color={meta.color} filled />
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ color: SOCIAL.text, fontSize: '0.84rem', margin: 0, lineHeight: 1.4 }}>
                                                <strong>{name}</strong>{' '}
                                                {(n as any)._actorCount > 1
                                                    ? `and ${(n as any)._actorCount - 1} other${(n as any)._actorCount - 1 === 1 ? '' : 's'} ${meta.verb(n).replace('ed ', 'ed ')}`
                                                    : meta.verb(n)}{' '}
                                                {n.text && n.type === 'comment' && <span style={{ color: SOCIAL.muted, fontStyle: 'italic' }}>"{n.text.length > 60 ? n.text.slice(0, 60) + '…' : n.text}"</span>}
                                                {n.text && n.type === 'message' && <span style={{ color: SOCIAL.muted, fontStyle: 'italic' }}>"{n.text.length > 60 ? n.text.slice(0, 60) + '…' : n.text}"</span>}
                                            </p>
                                            <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0 }}>{timeAgo(n.createdAt)}</p>
                                        </div>
                                        {n.postId?.mediaUrl && n.postId.mediaType === 'image' && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={n.postId.mediaUrl} alt="post" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                        )}
                                        {n.type === 'follow' && (
                                            <FollowButton targetId={actor?._id} viewerId={viewerId} />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function FollowButton({ targetId, viewerId }: { targetId?: string; viewerId: string }) {
    const [following, setFollowing] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!targetId || !viewerId) return
        (async () => {
            try {
                const res = await authFetch(`/api/social/follow?userId=${viewerId}&targetId=${targetId}`)
                if (res.ok) {
                    const d = await res.json()
                    setFollowing(d.following)
                }
            } catch {}
        })()
    }, [targetId, viewerId])

    const toggle = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!targetId || loading) return
        setLoading(true)
        const prev = following
        setFollowing(!prev)
        try {
            await authFetch('/api/social/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: viewerId, followingId: targetId }) })
        } catch { setFollowing(prev) }
        setLoading(false)
    }

    return (
        <button onClick={toggle} disabled={loading}
            style={{ background: following ? SOCIAL.bg : SOCIAL.primary, color: following ? SOCIAL.text : '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', flexShrink: 0 }}>
            {following ? 'Following' : 'Follow'}
        </button>
    )
}
