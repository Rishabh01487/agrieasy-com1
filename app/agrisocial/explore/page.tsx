'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [category, setCategory] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const url = `/api/social/explore?category=${category}&type=${typeFilter}&page=1`
            const res = await authFetch(url)
            const d = await res.json()
            setPosts(d.posts || [])
            setLoading(false)
        }
        void load()
    }, [category, typeFilter])

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            {/* Nav */}
            <nav style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 24px', boxShadow: SHARED.shadow, position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ color: SOCIAL.text, fontWeight: 700 }}>🔍 Explore</span>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px 60px' }}>
                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <h1 style={{ color: SOCIAL.textSecondary, fontWeight: 900, fontSize: '1.6rem', margin: '0 0 4px' }}>🔥 Explore AgriSocial</h1>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.875rem', margin: 0 }}>Discover trending posts from farmers, buyers & agriinfluencers</p>
                </div>

                {/* Type filter */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setTypeFilter(f.key)}
                            style={{ padding: '7px 16px', borderRadius: '100px', border: `1.5px solid ${typeFilter === f.key ? SOCIAL.primary : SOCIAL.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: typeFilter === f.key ? SOCIAL.primary : SOCIAL.white, color: typeFilter === f.key ? '#fff' : SOCIAL.muted, transition: 'all 0.2s ease' }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px', scrollbarWidth: 'none', paddingBottom: '4px' }}>
                    {CATEGORIES.map(c => (
                        <button key={c.key} onClick={() => setCategory(c.key)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px', borderRadius: '100px', border: `1.5px solid ${category === c.key ? SOCIAL.primary : SOCIAL.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', background: category === c.key ? SOCIAL.primary : SOCIAL.white, color: category === c.key ? '#fff' : SOCIAL.muted, whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                        {[...Array(9)].map((_, i) => <div key={i} style={{ aspectRatio: '1', background: SOCIAL.primaryLight, borderRadius: '8px' }} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🌾</div>
                        <p style={{ color: SOCIAL.muted }}>No posts in this category yet. Be the first!</p>
                        <Link href="/agrisocial/create" style={{ display: 'inline-block', padding: '10px 20px', background: SOCIAL.primary, color: '#fff', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', marginTop: '12px', transition: 'all 0.2s ease' }}>+ Create Post</Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                        {posts.map(p => {
                            const authorName = typeof p.userId === 'object' ? (p.userId.farmerName || p.userId.firmName || 'User') : 'User'
                            return (
                                <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                    style={{ position: 'relative', aspectRatio: '1', background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'block', borderRadius: '8px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s ease' }}>

                                    {p.mediaUrl && p.mediaType === 'image' ? null : (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{p.type === 'krishiclip' ? '🎬' : '📢'}</span>
                                            <p style={{ color: '#fff', fontSize: '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                        </div>
                                    )}

                                    {/* Overlay stats */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: '8px 6px 5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>❤️ {p.likesCount || 0}</span>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>💬 {p.commentsCount || 0}</span>
                                        {p.type === 'krishiclip' && <span style={{ color: SOCIAL.border, fontSize: '0.6rem', fontWeight: 800, marginLeft: 'auto' }}>🎬</span>}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}