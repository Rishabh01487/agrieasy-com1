'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface User { _id: string; farmerName?: string; firmName?: string; role?: string }
interface Post { _id: string; userId: User; mediaUrl?: string; mediaType?: string; caption: string; category: string; likesCount: number; commentsCount: number; createdAt: string; type: string }
interface Collection { _id: string; name: string; postCount: number; coverPost?: { mediaUrl?: string; mediaType?: string } }

export default function AgriSocialSaved() {
    const [posts, setPosts] = useState<Post[]>([])
    const [collections, setCollections] = useState<Collection[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'all' | 'collections'>('all')
    const [showNewCollection, setShowNewCollection] = useState(false)
    const [newCollectionName, setNewCollectionName] = useState('')
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))

    useEffect(() => {
        (async () => {
            try {
                const [savedRes, collRes] = await Promise.all([
                    authFetch('/api/social/saved?page=1&limit=60'),
                    authFetch('/api/social/collections'),
                ])
                if (savedRes.ok) {
                    const d = await savedRes.json()
                    setPosts(d?.data?.posts || d?.posts || [])
                }
                if (collRes.ok) {
                    const d = await collRes.json()
                    setCollections(d?.data?.collections || [])
                }
            } catch {}
            setLoading(false)
        })()
    }, [])

    const createCollection = async () => {
        if (!newCollectionName.trim()) return
        try {
            const res = await authFetch('/api/social/collections', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newCollectionName }),
            })
            if (res.ok) {
                const d = await res.json()
                setCollections(prev => [{ ...d.collection, postCount: 0, coverPost: null }, ...prev])
                setNewCollectionName('')
                setShowNewCollection(false)
            }
        } catch {}
    }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>🔖 Saved</span>
            </nav>

            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 14px 80px' }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <h1 style={{ color: SOCIAL.text, fontWeight: 900, fontSize: '1.4rem', margin: '0 0 4px' }}>🔖 Saved</h1>
                    <p style={{ color: SOCIAL.muted, fontSize: '0.86rem', margin: 0 }}>Only you can see what you&apos;ve saved</p>
                </div>

                {/* Tabs: All Posts / Collections */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: `1px solid ${SOCIAL.border}` }}>
                    <button onClick={() => setTab('all')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === 'all' ? `2px solid ${SOCIAL.primary}` : '2px solid transparent', color: tab === 'all' ? SOCIAL.primary : SOCIAL.muted, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>All Posts</button>
                    <button onClick={() => setTab('collections')} style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: tab === 'collections' ? `2px solid ${SOCIAL.primary}` : '2px solid transparent', color: tab === 'collections' ? SOCIAL.primary : SOCIAL.muted, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>Collections ({collections.length})</button>
                    {tab === 'collections' && (
                        <button onClick={() => setShowNewCollection(true)} style={{ marginLeft: 'auto', padding: '6px 14px', background: SOCIAL.primaryLight, color: SOCIAL.primary, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>+ New</button>
                    )}
                </div>

                {/* New collection input */}
                {showNewCollection && (
                    <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', gap: 8 }}>
                        <input value={newCollectionName} onChange={e => setNewCollectionName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createCollection()} placeholder="Collection name (e.g., Tractor Tips)" style={{ flex: 1, padding: '8px 12px', border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontSize: '0.86rem', outline: 'none', color: SOCIAL.text, fontFamily: SHARED.font }} autoFocus />
                        <button onClick={createCollection} style={{ background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Create</button>
                        <button onClick={() => setShowNewCollection(false)} style={{ background: SOCIAL.bg, color: SOCIAL.muted, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>✕</button>
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {[...Array(9)].map((_, i) => <div key={i} style={{ aspectRatio: '1', background: SOCIAL.bgSub, borderRadius: 6 }} />)}
                    </div>
                ) : tab === 'collections' ? (
                    collections.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: SOCIAL.muted }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📁</div>
                            <h3 style={{ color: SOCIAL.text, margin: '0 0 6px' }}>No collections yet</h3>
                            <p style={{ fontSize: '0.86rem', margin: '0 0 16px' }}>Create collections to organize your saved posts by topic.</p>
                            <button onClick={() => setShowNewCollection(true)} style={{ padding: '10px 22px', background: SOCIAL.primary, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>+ New Collection</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                            {collections.map(c => (
                                <div key={c._id} style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: SHARED.shadow }}>
                                    <div style={{ height: 120, background: c.coverPost?.mediaUrl && c.coverPost.mediaType === 'image' ? `url(${c.coverPost.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {!c.coverPost?.mediaUrl && <span style={{ fontSize: '2rem' }}>📁</span>}
                                    </div>
                                    <div style={{ padding: '10px 12px' }}>
                                        <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{c.name}</p>
                                        <p style={{ color: SOCIAL.muted, fontSize: '0.74rem', margin: '2px 0 0' }}>{c.postCount} {c.postCount === 1 ? 'post' : 'posts'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
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
