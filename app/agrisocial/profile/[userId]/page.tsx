'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

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
            const res = await authFetch(`/api/social/profile?userId=${profileId}&viewerId=${viewerId}`)
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
        const prevFollowing = following
        const newF = !following
        setFollowing(newF)
        data && setData(prev => prev ? { ...prev, stats: { ...prev.stats, followersCount: (prev.stats?.followersCount || 0) + (newF ? 1 : -1) } } : prev)
        try {
            await authFetch('/api/social/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ followerId: viewerId, followingId: profileId }) })
        } catch {
            setFollowing(prevFollowing)
            data && setData(prev => prev ? { ...prev, stats: { ...prev.stats, followersCount: (prev.stats?.followersCount || 0) + (newF ? -1 : 1) } } : prev)
        }
    }

    if (loading) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>🌾 Loading profile…</div>
    if (!data?.user) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.muted, fontFamily: SHARED.font }}>Profile not found</div>

    const { user, posts, clips, stats, isFollowing: _ } = data
    const s = stats || {}
    const name = user.farmerName || user.firmName || 'User'
    const displayPosts = tab === 'posts' ? posts : clips
    const isOwnProfile = viewerId === profileId

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 50, boxShadow: SHARED.shadow, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>{name}</span>
            </nav>

            {/* Profile header */}
            <div style={{ background: SOCIAL.white, borderBottom: `1px solid ${SOCIAL.border}`, padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
                {/* Banner */}
                <div style={{ height: '100px', borderRadius: '14px', background: SOCIAL.gradient, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                    <span style={{ fontSize: '2rem' }}>🌾🚜🌱</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '16px', marginTop: '-40px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.8rem', border: '3px solid #fff', flexShrink: 0 }}>
                        {name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ color: SOCIAL.text, fontWeight: 900, margin: '0 0 2px', fontSize: '1.2rem' }}>{name}</h2>
                        <p style={{ color: SOCIAL.muted, fontSize: '0.8rem', margin: 0 }}>{user.role === 'farmer' ? '🌾 Farmer' : user.role === 'buyer' ? '🛒 Buyer' : user.role === 'transporter' ? '🚛 Transporter' : '👤 AgriSocial Member'}</p>
                    </div>
                    {isOwnProfile ? (
                        <Link href="/agrisocial/create" style={{ padding: '8px 16px', background: SOCIAL.primaryLight, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', color: SOCIAL.textSecondary, textDecoration: 'none', transition: 'all 0.2s ease' }}>Edit</Link>
                    ) : (
                        <button onClick={handleFollow} style={{ padding: '8px 20px', background: following ? SOCIAL.primaryLight : SOCIAL.primary, border: `1.5px solid ${following ? SOCIAL.border : SOCIAL.primary}`, borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', color: following ? SOCIAL.textSecondary : '#fff', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                            {following ? '✓ Following' : '+ Follow'}
                        </button>
                    )}
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[['Posts', s.postsCount], ['KrishiClips', s.clipsCount], ['Followers', s.followersCount], ['Following', s.followingCount], ['❤️ Likes', s.totalLikes]].map(([l, v]) => (
                        <div key={l as string} style={{ flex: 1, textAlign: 'center', background: SOCIAL.primaryLight, borderRadius: '10px', padding: '8px 4px', border: `1px solid ${SOCIAL.border}`, transition: 'all 0.2s ease' }}>
                            <p style={{ color: SOCIAL.textSecondary, fontWeight: 900, fontSize: '1rem', margin: '0 0 2px' }}>{v as number}</p>
                            <p style={{ color: SOCIAL.muted, fontSize: '0.6rem', fontWeight: 700, margin: 0 }}>{l as string}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ maxWidth: '700px', margin: '0 auto', background: SOCIAL.white, borderBottom: `1px solid ${SOCIAL.border}` }}>
                <div style={{ display: 'flex' }}>
                    {[['posts', '📷 Posts'], ['clips', '🎬 KrishiClips']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k as 'posts' | 'clips')}
                            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? SOCIAL.primary : 'transparent'}`, fontWeight: 700, fontSize: '0.875rem', color: tab === k ? SOCIAL.primary : SOCIAL.muted, cursor: 'pointer', transition: 'all 0.2s ease' }}>
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
                        <p style={{ color: SOCIAL.muted }}>{isOwnProfile ? 'Share your first post!' : 'No posts yet'}</p>
                        {isOwnProfile && <Link href={`/agrisocial/create?type=${tab === 'clips' ? 'krishiclip' : 'post'}`} style={{ display: 'inline-block', padding: '10px 20px', background: SOCIAL.primary, color: '#fff', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', marginTop: '12px', transition: 'all 0.2s ease' }}>+ Create</Link>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                        {displayPosts.map(p => (
                            <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                style={{ position: 'relative', aspectRatio: '1', background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'block', borderRadius: '8px', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s ease' }}>
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