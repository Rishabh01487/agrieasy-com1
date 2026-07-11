'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

const CATEGORIES = [
    { key: 'all', label: 'All', icon: '🌐' }, { key: 'farming', label: 'Farming', icon: '🌾' },
    { key: 'technique', label: 'Technique', icon: '🔬' }, { key: 'agritrading', label: 'Trading', icon: '💰' },
    { key: 'equipment', label: 'Equipment', icon: '🚜' }, { key: 'organic', label: 'Organic', icon: '🌱' },
    { key: 'livestock', label: 'Livestock', icon: '🐄' }, { key: 'weather', label: 'Weather', icon: '🌦️' },
]

const FILTERS = [{ key: 'all', label: 'All' }, { key: 'post', label: '📷 Posts' }, { key: 'krishiclip', label: '🎬 KrishiClips' }]

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Post { _id: string; userId: User; type: string; mediaUrl?: string; mediaType?: string; caption: string; likesCount: number; commentsCount: number; createdAt: string; category: string }

export default function AgriSocialExplore() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <AgriSocialExploreInner />
        </Suspense>
    )
}

function AgriSocialExploreInner() {
    const searchParams = useSearchParams()
    const initialTag = searchParams.get('tag')

    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const pageRef = useRef(1)
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const [category, setCategory] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [tag, setTag] = useState(initialTag || '')

    const loadPage = async (pageNum: number, append: boolean) => {
        try {
            if (append) setLoadingMore(true)
            else setLoading(true)
            const params = new URLSearchParams({ category, type: typeFilter, page: String(pageNum) })
            if (tag) params.set('tag', tag)
            const res = await authFetch(`/api/social/explore?${params}`)
            if (res.ok) {
                const d = await res.json()
                const newPosts = d.data?.posts || d.posts || []
                const total = d.meta?.total || d.data?.meta?.total || 0
                setPosts(prev => append ? [...prev, ...newPosts] : newPosts)
                setHasMore(newPosts.length > 0 && (append ? (posts.length + newPosts.length < total) : (newPosts.length < total)))
                pageRef.current = pageNum
            }
        } catch {}
        setLoading(false)
        setLoadingMore(false)
    }

    useEffect(() => {
        pageRef.current = 1
        setHasMore(true)
        void loadPage(1, false)
    }, [category, typeFilter, tag])

    // Infinite scroll
    useEffect(() => {
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadPage(pageRef.current + 1, true) },
            { rootMargin: '300px' }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasMore, loadingMore])

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ color: SOCIAL.text, fontWeight: 700 }}>🧭 Explore</span>
                <Link href="/agrisocial/search" style={{ marginLeft: 'auto', color: SOCIAL.muted, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Search</Link>
            </nav>

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 16px 60px' }}>
                {/* Header */}
                <div style={{ marginBottom: 20, textAlign: 'center' }}>
                    <h1 style={{ color: SOCIAL.text, fontWeight: 900, fontSize: '1.6rem', margin: '0 0 4px' }}>🔥 Explore</h1>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.86rem', margin: 0 }}>Trending posts from farmers, buyers & agriinfluencers</p>
                </div>

                {/* Tag filter banner */}
                {tag && (
                    <div style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: SOCIAL.primary, fontWeight: 700, fontSize: '0.86rem' }}>#{tag}</span>
                        <button onClick={() => setTag('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: SOCIAL.muted, fontSize: '0.84rem' }}>✕ Clear</button>
                    </div>
                )}

                {/* Type filter */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setTypeFilter(f.key)}
                            style={{ padding: '7px 16px', borderRadius: '100px', border: `1.5px solid ${typeFilter === f.key ? SOCIAL.primary : SOCIAL.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: typeFilter === f.key ? SOCIAL.primary : SOCIAL.white, color: typeFilter === f.key ? '#fff' : SOCIAL.muted }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Category pills */}
                <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: '100px', border: `1.5px solid ${category === c.key ? SOCIAL.primary : SOCIAL.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', background: category === c.key ? SOCIAL.primary : SOCIAL.white, color: category === c.key ? '#fff' : SOCIAL.muted, whiteSpace: 'nowrap' }}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {[...Array(9)].map((_, i) => <div key={i} style={{ aspectRatio: '1', background: SOCIAL.bgSub, borderRadius: 4 }} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🌾</div>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>No posts in this category yet. Be the first!</p>
                        <Link href="/agrisocial/create" style={{ display: 'inline-block', padding: '10px 22px', background: SOCIAL.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', marginTop: 12, fontSize: '0.86rem' }}>+ Create Post</Link>
                    </div>
                ) : (
                    <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {posts.map((p, idx) => {
                            const authorName = typeof p.userId === 'object' ? (p.userId.farmerName || p.userId.firmName || 'User') : 'User'
                            const isLarge = idx % 7 === 6
                            return (
                                <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: isLarge ? '2 / 2' : '1',
                                        gridColumn: isLarge ? 'span 2' : 'span 1',
                                        gridRow: isLarge ? 'span 2' : 'span 1',
                                        background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`,
                                        display: 'block', borderRadius: 4, overflow: 'hidden', textDecoration: 'none',
                                    }}>
                                    {p.mediaUrl && p.mediaType === 'image' ? null : (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8, textAlign: 'center' }}>
                                            <span style={{ fontSize: isLarge ? '2.5rem' : '1.5rem', marginBottom: 4 }}>{p.type === 'krishiclip' ? '🎬' : '📢'}</span>
                                            <p style={{ color: '#fff', fontSize: isLarge ? '0.9rem' : '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: isLarge ? 3 : 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: '8px 6px 5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: '#fff', fontSize: isLarge ? '0.85rem' : '0.7rem', fontWeight: 700 }}>❤️ {p.likesCount || 0}</span>
                                        <span style={{ color: '#fff', fontSize: isLarge ? '0.85rem' : '0.7rem', fontWeight: 700 }}>💬 {p.commentsCount || 0}</span>
                                        {p.type === 'krishiclip' && <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 800, marginLeft: 'auto' }}>🎬</span>}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                    {/* Infinite scroll sentinel */}
                    <div ref={sentinelRef} style={{ height: 1 }} />
                    {loadingMore && <div style={{ textAlign: 'center', padding: 20, color: SOCIAL.muted, fontSize: '0.82rem' }}>Loading more…</div>}
                    {!hasMore && posts.length > 0 && <div style={{ textAlign: 'center', padding: 20, color: SOCIAL.muted, fontSize: '0.82rem' }}>You're all caught up ✨</div>}
                    </>
                )}
            </div>
        </div>
    )
}
