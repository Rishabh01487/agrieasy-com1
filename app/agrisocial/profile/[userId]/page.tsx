'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface UserInfo { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string; address?: string; email?: string; createdAt?: string }
interface Post { _id: string; type: string; mediaUrl?: string; mediaType?: string; caption: string; category: string; likesCount: number; commentsCount: number; createdAt: string; savedBy?: string[] }

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }

export default function AgriSocialProfile({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: profileId } = use(params)
    const router = useRouter()
    const [data, setData] = useState<{ user: UserInfo; posts: Post[]; clips: Post[]; saved: Post[]; stats: Record<string, number>; isFollowing: boolean; isOwnProfile?: boolean } | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'posts' | 'clips' | 'saved'>('posts')
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [following, setFollowing] = useState(false)

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

    const handleMessage = async () => {
        if (!viewerId) { router.push('/auth/login'); return }
        router.push(`/agrisocial/dm?userId=${profileId}`)
    }

    if (loading) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading profile…</div>
    if (!data?.user) return <div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.muted, fontFamily: SHARED.font }}>Profile not found</div>

    const { user, posts, clips, saved, stats, isOwnProfile } = data
    const s = stats || {}
    const name = user.farmerName || user.firmName || 'User'
    const displayPosts = tab === 'posts' ? posts : tab === 'clips' ? clips : saved || []
    const isOwn = isOwnProfile ?? (viewerId === profileId)

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            <nav style={{ background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <Link href="/agrisocial" style={{ color: SOCIAL.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>← AgriSocial</Link>
                <span style={{ color: SOCIAL.muted }}>›</span>
                <span style={{ fontWeight: 700, color: SOCIAL.text }}>{name}</span>
            </nav>

            <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 16px 80px' }}>
                {/* Header */}
                <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                    <div className="story-ring" style={{ width: 152, height: 152, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 144, height: 144, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '3.5rem', border: '4px solid #fff' }}>
                            {name[0]?.toUpperCase()}
                        </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                            <h1 style={{ color: SOCIAL.text, fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>{name}</h1>
                            {isOwn ? (
                                <>
                                    <Link href="/agrisocial/create" style={{ padding: '7px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: SOCIAL.text, textDecoration: 'none' }}>+ New Post</Link>
                                    <Link href="/agrisocial/saved" style={{ padding: '7px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: SOCIAL.text, textDecoration: 'none' }}>🔖 Saved</Link>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleFollow} style={{ padding: '7px 22px', background: following ? SOCIAL.white : SOCIAL.primary, border: `1.5px solid ${following ? SOCIAL.border : SOCIAL.primary}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: following ? SOCIAL.text : '#fff', cursor: 'pointer' }}>
                                        {following ? '✓ Following' : '+ Follow'}
                                    </button>
                                    <button onClick={handleMessage} style={{ padding: '7px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: SOCIAL.text, cursor: 'pointer' }}>✈️ Message</button>
                                </>
                            )}
                        </div>
                        {/* Stats */}
                        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                            <div><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.postsCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>posts</span></div>
                            <div><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followersCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>followers</span></div>
                            <div><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followingCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>following</span></div>
                        </div>
                        {/* Bio */}
                        <div>
                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{roleLabel[user.role || ''] || 'AgriSocial Member'}</p>
                            {user.address && <p style={{ color: SOCIAL.muted, fontSize: '0.84rem', margin: '2px 0 0' }}>📍 {user.address}</p>}
                            {user.createdAt && <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>}
                            <p style={{ color: SOCIAL.primary, fontSize: '0.84rem', margin: '4px 0 0', fontWeight: 600 }}>❤️ {s.totalLikes || 0} total likes · 🎬 {s.clipsCount || 0} KrishiClips</p>
                        </div>
                    </div>
                </div>

                {/* Highlights (story highlights — empty placeholder row showing structure) */}
                <div style={{ display: 'flex', gap: 16, padding: '12px 0 20px', borderBottom: `1px solid ${SOCIAL.border}`, marginBottom: 4, overflowX: 'auto' }} className="no-scrollbar">
                    {['🌾 Farm', '🚜 Equipment', '🌱 Harvest', '💰 Prices'].map((h, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
                            <div style={{ width: 70, height: 70, borderRadius: '50%', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>{h.split(' ')[0]}</div>
                            <span style={{ color: SOCIAL.textSecondary, fontSize: '0.74rem', fontWeight: 600 }}>{h.split(' ')[1]}</span>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${SOCIAL.border}`, marginBottom: 6 }}>
                    {([['posts', `📷 Posts`], ['clips', `🎬 Clips`], ...(isOwn ? [['saved', `🔖 Saved`] as const] : [])] as const).map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k as 'posts' | 'clips' | 'saved')}
                            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? SOCIAL.primary : 'transparent'}`, fontWeight: 700, fontSize: '0.82rem', color: tab === k ? SOCIAL.primary : SOCIAL.muted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {l}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                {displayPosts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{tab === 'posts' ? '📷' : tab === 'clips' ? '🎬' : '🔖'}</div>
                        <p style={{ color: SOCIAL.muted }}>{isOwn ? (tab === 'saved' ? 'Save posts to see them here' : 'Share your first post!') : 'No posts yet'}</p>
                        {isOwn && tab !== 'saved' && <Link href={`/agrisocial/create?type=${tab === 'clips' ? 'krishiclip' : 'post'}`} style={{ display: 'inline-block', padding: '10px 22px', background: SOCIAL.primary, color: '#fff', borderRadius: 10, fontWeight: 700, textDecoration: 'none', marginTop: 12, fontSize: '0.86rem' }}>+ Create</Link>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                        {displayPosts.map(p => (
                            <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                style={{ position: 'relative', aspectRatio: '1', background: p.mediaUrl && p.mediaType === 'image' ? `url(${p.mediaUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'block', borderRadius: 6, overflow: 'hidden', textDecoration: 'none' }}>
                                {(!p.mediaUrl || p.mediaType !== 'image') && (
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 6, textAlign: 'center' }}>
                                        <span style={{ fontSize: '1.2rem' }}>{p.type === 'krishiclip' ? '🎬' : '📢'}</span>
                                        <p style={{ color: '#fff', fontSize: '0.62rem', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                    </div>
                                )}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: '6px 6px 4px', display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>❤️ {p.likesCount}</span>
                                    <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>💬 {p.commentsCount}</span>
                                    {p.type === 'krishiclip' && <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 800, marginLeft: 'auto' }}>🎬</span>}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
