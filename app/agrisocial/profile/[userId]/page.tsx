'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = {
    bg: '#fffbf5', white: '#ffffff', orange: '#ea580c', orLight: '#fff7ed',
    orMid: '#fed7aa', orDark: '#9a3412', text: '#1c1917', muted: '#78716c', border: '#fed7aa',
}
const catColors: Record<string, string> = { farming: '#16a34a', agritrading: '#ea580c', technique: '#6366f1', equipment: '#f59e0b', weather: '#0891b2', livestock: '#a21caf', organic: '#15803d', general: '#78716c' }

interface UserInfo { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string; createdAt?: string }
interface Post { _id: string; type: string; mediaUrl?: string; mediaType?: string; caption: string; category: string; likesCount: number; commentsCount: number; createdAt: string }

export default function AgriSocialProfile({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: profileId } = use(params)
    const [data, setData] = useState<{ user: UserInfo; posts: Post[]; clips: Post[]; stats: Record<string, number>; isFollowing: boolean } | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'posts' | 'clips'>('posts')
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [following, setFollowing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const res = await fetch(`/api/social/profile?userId=${profileId}&viewerId=${viewerId}`)
            const d = await res.json()
            if (res.ok) {
                setData(d)
                setFollowing(d.isFollowing)
            }
            setLoading(false)
        }
        void load()
    }, [profileId, viewerId])

    const handleFollow = async () => {
        if (!viewerId) { router.push('/auth/login'); return }
        const newF = !following
        setFollowing(newF)
        data && setData(prev => prev ? { ...prev, stats: { ...prev.stats, followersCount: prev.stats.followersCount + (newF ? 1 : -1) } } : prev)
        await fetch('/api/social/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: viewerId, followingId: profileId }) })
    }

    if (loading) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.orange, fontWeight: 700, fontFamily: '"Inter",sans-serif' }}>🌾 Loading profile…</div>
    if (!data?.user) return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontFamily: '"Inter",sans-serif' }}>Profile not found</div>

    const { user, posts, clips, stats, isFollowing: _ } = data
    const name = user.farmerName || user.firmName || 'User'
    const displayPosts = tab === 'posts' ? posts : clips
    const isOwnProfile = viewerId === profileId

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 6px rgba(234,88,12,0.06)' }}>
                <Link href="/agrisocial" style={{ color: C.orange, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriSocial</Link>
                <span style={{ color: C.muted }}>›</span>
                <span style={{ fontWeight: 700, color: C.text }}>{name}</span>
            </nav>

            {/* Profile header */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
                {/* Banner */}
                <div style={{ height: '100px', borderRadius: '14px', background: `linear-gradient(135deg, ${C.orMid}, ${C.orange})`, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                    <span style={{ fontSize: '2rem' }}>🌾🚜🌱</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '16px', marginTop: '-40px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.8rem', border: '3px solid #fff', flexShrink: 0 }}>
                        {name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ color: C.text, fontWeight: 900, margin: '0 0 2px', fontSize: '1.2rem' }}>{name}</h2>
                        <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>{user.role === 'farmer' ? '🌾 Farmer' : user.role === 'buyer' ? '🛒 Buyer' : user.role === 'transporter' ? '🚛 Transporter' : '👤 AgriSocial Member'}</p>
                    </div>
                    {isOwnProfile ? (
                        <Link href="/agrisocial/create" style={{ padding: '8px 16px', background: C.orLight, border: `1.5px solid ${C.orMid}`, borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: C.orDark, textDecoration: 'none' }}>Edit</Link>
                    ) : (
                        <button onClick={handleFollow} style={{ padding: '8px 20px', background: following ? C.orLight : C.orange, border: `1.5px solid ${following ? C.orMid : C.orange}`, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', color: following ? C.orDark : '#fff', cursor: 'pointer' }}>
                            {following ? '✓ Following' : '+ Follow'}
                        </button>
                    )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[['Posts', stats.postsCount], ['KrishiClips', stats.clipsCount], ['Followers', stats.followersCount], ['Following', stats.followingCount], ['❤️ Likes', stats.totalLikes]].map(([l, v]) => (
                        <div key={l as string} style={{ flex: 1, textAlign: 'center', background: C.orLight, borderRadius: '10px', padding: '8px 4px', border: `1px solid ${C.border}` }}>
                            <p style={{ color: C.orDark, fontWeight: 900, fontSize: '1rem', margin: '0 0 2px' }}>{v as number}</p>
                            <p style={{ color: C.muted, fontSize: '0.6rem', fontWeight: 700, margin: 0 }}>{l as string}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ maxWidth: '700px', margin: '0 auto', background: C.white, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex' }}>
                    {[['posts', '📷 Posts'], ['clips', '🎬 KrishiClips']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k as 'posts' | 'clips')}
                            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? C.orange : 'transparent'}`, fontWeight: 700, fontSize: '0.875rem', color: tab === k ? C.orange : C.muted, cursor: 'pointer' }}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '4px' }}>
                {displayPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{tab === 'posts' ? '📷' : '🎬'}</div>
                        <p style={{ color: C.muted }}>{isOwnProfile ? 'Share your first post!' : 'No posts yet'}</p>
                        {isOwnProfile && <Link href={`/agrisocial/create?type=${tab === 'clips' ? 'krishiclip' : 'post'}`} style={{ display: 'inline-block', padding: '10px 20px', background: C.orange, color: '#fff', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', marginTop: '12px' }}>+ Create</Link>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '3px' }}>
                        {displayPosts.map(p => (
                            <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                style={{ position: 'relative', aspectRatio: '1', background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${catColors[p.category] || C.orange}cc, ${catColors[p.category] || C.orDark})`, display: 'block', borderRadius: '2px', overflow: 'hidden', textDecoration: 'none' }}>
                                {(!p.mediaUrl || p.mediaType !== 'image') && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '6px', textAlign: 'center' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{p.type === 'krishiclip' ? '🎬' : '📢'}</span>
                                        <p style={{ color: '#fff', fontSize: '0.6rem', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                    </div>
                                )}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)', padding: '5px 5px 4px', display: 'flex', gap: '6px' }}>
                                    <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>❤️ {p.likesCount}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
