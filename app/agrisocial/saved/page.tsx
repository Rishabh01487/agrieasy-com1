'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Post { _id: string; userId: User; mediaUrl?: string; mediaType?: string; caption: string; category: string; likesCount: number; commentsCount: number; createdAt: string; type: string }

export default function AgriSocialSaved() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch('/api/social/saved?page=1&limit=60')
                if (res.ok) {
                    const d = await res.json()
                    setPosts(d.data?.posts || [])
                }
            } catch {}
            setLoading(false)
        })()
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>🔖 Saved</span>
            </nav>

            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 14px 80px' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h1 style={{ color: SOCIAL.text, fontWeight: 900, fontSize: '1.4rem', margin: '0 0 4px' }}>🔖 Saved Posts</h1>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.86rem', margin: 0 }}>Only you can see what you&apos;ve saved</p>
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {[...Array(9)].map((_, i) => <div key={i} style={{ aspectRatio: '1', background: SOCIAL.bgSub, borderRadius: 6 }} />)}
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: SOCIAL.muted }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔖</div>
                        <h3 style={{ color: SOCIAL.text, margin: '0 0 6px' }}>Nothing saved yet</h3>
                        <p style={{ fontSize: '0.86rem', margin: '0 0 16px' }}>Tap the bookmark icon on any post to save it here.</p>
                        <Link href="/agrisocial/explore" style={{ display: 'inline-block', padding: '10px 22px', background: SOCIAL.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem' }}>🔍 Explore posts</Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {posts.map(p => {
                            const authorName = typeof p.userId === 'object' ? (p.userId.farmerName || p.userId.firmName || 'User') : 'User'
                            return (
                                <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                    style={{ position: 'relative', aspectRatio: '1', background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'block', borderRadius: 6, overflow: 'hidden', textDecoration: 'none' }}>
                                    {(!p.mediaUrl || p.mediaType !== 'image') && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 6, textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{p.type === 'krishiclip' ? '🎬' : '📢'}</span>
                                            <p style={{ color: '#fff', fontSize: '0.62rem', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: '8px 6px 5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>❤️ {p.likesCount || 0}</span>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>💬 {p.commentsCount || 0}</span>
                                        {p.type === 'krishiclip' && <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 800, marginLeft: 'auto' }}>🎬</span>}
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
