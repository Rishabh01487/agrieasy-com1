'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string }
interface Hashtag { tag: string; count: number }

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.4, flexShrink: 0 }}>{name?.[0]?.toUpperCase() || 'U'}</div>
}

export default function AgriSocialSearch() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <AgriSocialSearchInner />
        </Suspense>
    )
}

function AgriSocialSearchInner() {
    const searchParams = useSearchParams()
    const initialTag = searchParams.get('tag') || ''
    const [query, setQuery] = useState('')
    const [tab, setTab] = useState<'all' | 'users' | 'hashtags'>('all')
    const [users, setUsers] = useState<User[]>([])
    const [hashtags, setHashtags] = useState<Hashtag[]>([])
    const [loading, setLoading] = useState(false)
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [followStates, setFollowStates] = useState<Record<string, boolean>>({})

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setUsers([]); setHashtags([]); return }
        setLoading(true)
        // Save to recent searches in localStorage
        try {
            const recents = JSON.parse(localStorage.getItem('agrisocial_recents') || '[]')
            const updated = [q, ...recents.filter((r: string) => r !== q)].slice(0, 8)
            localStorage.setItem('agrisocial_recents', JSON.stringify(updated))
        } catch {}
        try {
            const res = await authFetch(`/api/social/search?q=${encodeURIComponent(q)}&kind=${tab}`)
            if (res.ok) {
                const d = await res.json()
                setUsers(d.data?.users || [])
                setHashtags(d.data?.hashtags || [])
            }
        } catch {}
        setLoading(false)
    }, [tab])

    useEffect(() => {
        if (initialTag) {
            setQuery(initialTag.replace(/^#/, ''))
            setTab('hashtags')
            runSearch(initialTag.replace(/^#/, ''))
        }
    }, [initialTag, runSearch])

    useEffect(() => {
        const t = setTimeout(() => runSearch(query), 250)
        return () => clearTimeout(t)
    }, [query, runSearch])

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

    const showUsers = tab === 'all' || tab === 'users'
    const showTags = tab === 'all' || tab === 'hashtags'

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>🔍 Search</span>
            </nav>

            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 14px 80px' }}>
                {/* Search input */}
                <div style={{ position: 'relative', marginBottom: 16 }}>
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search people, buyers, farmers, #hashtags…"
                        style={{ width: '100%', padding: '12px 16px 12px 42px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 12, fontSize: '0.92rem', color: SOCIAL.text, outline: 'none', fontFamily: SHARED.font, boxSizing: 'border-box' }}
                    />
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                    {query && (
                        <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: SOCIAL.muted }}>✕</button>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${SOCIAL.border}` }}>
                    {([['all', 'All'], ['users', 'Accounts'], ['hashtags', 'Hashtags']] as const).map(([k, label]) => (
                        <button key={k} onClick={() => setTab(k)}
                            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === k ? `2px solid ${SOCIAL.primary}` : '2px solid transparent', color: tab === k ? SOCIAL.primary : SOCIAL.muted, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                            {label}
                        </button>
                    ))}
                </div>

                {!query && !initialTag && (
                    <div>
                        {/* Recent searches */}
                        {typeof window !== 'undefined' && (() => {
                            const recents = JSON.parse(localStorage.getItem('agrisocial_recents') || '[]')
                            if (recents.length === 0) return null
                            return (
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <h3 style={{ color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent</h3>
                                        <button onClick={() => { localStorage.setItem('agrisocial_recents', '[]'); window.location.reload() }} style={{ background: 'none', border: 'none', color: SOCIAL.primary, fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}>Clear all</button>
                                    </div>
                                    {recents.map((r: string, i: number) => (
                                        <button key={i} onClick={() => setQuery(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, marginBottom: 4, cursor: 'pointer', textAlign: 'left' }}>
                                            <span style={{ fontSize: '1rem' }}>🕐</span>
                                            <span style={{ color: SOCIAL.text, fontSize: '0.86rem', fontWeight: 600 }}>{r}</span>
                                        </button>
                                    ))}
                                </div>
                            )
                        })()}

                        {/* Suggested accounts */}
                        <div>
                            <h3 style={{ color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested for you</h3>
                            <p style={{ color: SOCIAL.muted, fontSize: '0.82rem', margin: '0 0 12px' }}>Try searching for:</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['#farming', '#wheat', '#organic', '#tractor', '#harvest', '#market', '#rice', '#livestock'].map(tag => (
                                    <button key={tag} onClick={() => setQuery(tag)} style={{ padding: '6px 14px', background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, color: SOCIAL.primary, borderRadius: 100, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>{tag}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {loading && query && (
                    <div style={{ textAlign: 'center', padding: 30, color: SOCIAL.muted }}>Searching…</div>
                )}

                {/* Users */}
                {showUsers && !loading && users.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accounts</h3>
                        {users.map(u => {
                            const name = u.farmerName || u.firmName || 'User'
                            const isFollowing = !!followStates[u._id]
                            return (
                                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, marginBottom: 6 }}>
                                    <Link href={`/agrisocial/profile/${u._id}`}><Avatar name={name} size={44} /></Link>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Link href={`/agrisocial/profile/${u._id}`} style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', display: 'block' }}>{name}</Link>
                                        <p style={{ color: SOCIAL.muted, fontSize: '0.74rem', margin: 0 }}>{roleLabel[u.role || ''] || 'User'}</p>
                                    </div>
                                    {viewerId && u._id !== viewerId && (
                                        <button onClick={() => handleFollow(u._id)}
                                            style={{ background: isFollowing ? SOCIAL.bg : SOCIAL.primary, color: isFollowing ? SOCIAL.text : '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Hashtags */}
                {showTags && !loading && hashtags.length > 0 && (
                    <div>
                        <h3 style={{ color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hashtags</h3>
                        {hashtags.map(h => (
                            <Link key={h.tag} href={`/agrisocial/search?tag=${encodeURIComponent(h.tag)}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, marginBottom: 6, textDecoration: 'none' }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: SOCIAL.gradientSoft, border: `1px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>#</div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>#{h.tag}</p>
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.74rem', margin: 0 }}>{h.count} {h.count === 1 ? 'post' : 'posts'}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* No results */}
                {!loading && query && users.length === 0 && hashtags.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: SOCIAL.muted }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
                        <p style={{ fontSize: '0.86rem', margin: 0 }}>No results for &ldquo;{query}&rdquo;. Try a different search.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
