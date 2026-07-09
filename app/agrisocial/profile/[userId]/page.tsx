'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

interface UserInfo { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string; address?: string; email?: string; createdAt?: string; profilePic?: string; bio?: string; upiId?: string }
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
    // Edit profile modal state
    const [showEditModal, setShowEditModal] = useState(false)
    const [editBio, setEditBio] = useState('')
    const [editPic, setEditPic] = useState('')
    const [editUpiId, setEditUpiId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState('')
    // Followers/following list modal state
    const [listModal, setListModal] = useState<'followers' | 'following' | null>(null)
    const [listUsers, setListUsers] = useState<any[]>([])
    const [listLoading, setListLoading] = useState(false)
    // Highlights state
    const [highlights, setHighlights] = useState<any[]>([])

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
            // Fetch highlights
            try {
                const hRes = await authFetch(`/api/social/highlights?userId=${profileId}`)
                if (hRes.ok) {
                    const hd = await hRes.json()
                    setHighlights(hd?.data?.highlights || [])
                }
            } catch {}
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
                        {user.profilePic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.profilePic} alt={name} style={{ width: 144, height: 144, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff' }} />
                        ) : (
                            <div style={{ width: 144, height: 144, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '3.5rem', border: '4px solid #fff' }}>
                                {name[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1, minWidth: 280 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                            <h1 style={{ color: SOCIAL.text, fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>{name}</h1>
                            {isOwn ? (
                                <>
                                    <button onClick={() => { setEditBio(user.bio || ''); setEditPic(''); setEditUpiId(user.upiId || ''); setEditError(''); setShowEditModal(true) }} style={{ padding: '7px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: SOCIAL.text, cursor: 'pointer' }}>✏️ Edit Profile</button>
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
                        {/* Stats — clickable (Instagram-style) */}
                        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                            <div style={{ cursor: 'pointer' }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.postsCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>posts</span></div>
                            <button onClick={() => { setListUsers([]); setListModal('followers') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followersCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>followers</span></button>
                            <button onClick={() => { setListUsers([]); setListModal('following') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followingCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>following</span></button>
                        </div>
                        {/* Bio */}
                        <div>
                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{roleLabel[user.role || ''] || 'AgriSocial Member'}</p>
                            {user.bio && <p style={{ color: SOCIAL.textSecondary, fontSize: '0.86rem', margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
                            {user.address && <p style={{ color: SOCIAL.muted, fontSize: '0.84rem', margin: '2px 0 0' }}>📍 {user.address}</p>}
                            {user.createdAt && <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>}
                            <p style={{ color: SOCIAL.primary, fontSize: '0.84rem', margin: '4px 0 0', fontWeight: 600 }}>❤️ {s.totalLikes || 0} total likes · 🎬 {s.clipsCount || 0} KrishiClips</p>
                        </div>
                    </div>
                </div>

                {/* Highlights (real story highlights from the API) */}
                <div style={{ display: 'flex', gap: 16, padding: '12px 0 20px', borderBottom: `1px solid ${SOCIAL.border}`, marginBottom: 4, overflowX: 'auto' }} className="no-scrollbar">
                    {highlights.length === 0 && isOwn && (
                        <Link href={`/agrisocial/stories/${viewerId}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80, textDecoration: 'none' }}>
                            <div style={{ width: 70, height: 70, borderRadius: '50%', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', color: SOCIAL.primary }}>+</div>
                            <span style={{ color: SOCIAL.muted, fontSize: '0.74rem', fontWeight: 600 }}>New</span>
                        </Link>
                    )}
                    {highlights.map((h) => (
                        <div key={h._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80, cursor: 'pointer' }} onClick={() => router.push(`/agrisocial/stories/${profileId}`)}>
                            {h.coverImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={h.coverImage} alt={h.name} style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${SOCIAL.border}` }} />
                            ) : (
                                <div style={{ width: 70, height: 70, borderRadius: '50%', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>📂</div>
                            )}
                            <span style={{ color: SOCIAL.textSecondary, fontSize: '0.74rem', fontWeight: 600, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                        </div>
                    ))}
                    {highlights.length === 0 && !isOwn && (
                        <p style={{ color: SOCIAL.muted, fontSize: '0.8rem', padding: '20px 0', width: '100%', textAlign: 'center' }}>No highlights yet</p>
                    )}
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

            {/* Followers/Following List Modal */}
            {listModal && (
                <div onClick={() => setListModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
                    <div onClick={async (e) => {
                        e.stopPropagation()
                        if (listUsers.length === 0) {
                            setListLoading(true)
                            try {
                                const res = await authFetch(`/api/social/follow?userId=${profileId}&list=${listModal}`)
                                if (res.ok) {
                                    const d = await res.json()
                                    setListUsers(d?.data?.users || [])
                                }
                            } catch {}
                            setListLoading(false)
                        }
                    }} style={{ background: SOCIAL.white, borderRadius: 16, padding: 0, maxWidth: 400, width: '100%', maxHeight: '70vh', overflowY: 'auto', boxShadow: SHARED.shadowXl }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${SOCIAL.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: SOCIAL.white, zIndex: 1 }}>
                            <h3 style={{ margin: 0, color: SOCIAL.text, fontWeight: 800, fontSize: '1.1rem', textTransform: 'capitalize' }}>{listModal}</h3>
                            <button onClick={() => setListModal(null)} style={{ background: 'none', border: 'none', color: SOCIAL.muted, cursor: 'pointer', fontSize: '1.3rem' }}>✕</button>
                        </div>
                        {listLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: SOCIAL.muted, fontSize: '0.86rem' }}>Loading…</div>
                        ) : listUsers.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: SOCIAL.muted, fontSize: '0.86rem' }}>No {listModal} yet</div>
                        ) : (
                            <div style={{ padding: '8px 0' }}>
                                {listUsers.map((u: any) => {
                                    const uname = u.farmerName || u.firmName || 'User'
                                    return (
                                        <Link key={u._id} href={`/agrisocial/profile/${u._id}`} onClick={() => setListModal(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', textDecoration: 'none' }}>
                                            {u.profilePic ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={u.profilePic} alt={uname} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>{uname[0]?.toUpperCase()}</div>
                                            )}
                                            <div>
                                                <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{uname}</p>
                                                <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: 0, textTransform: 'capitalize' }}>{u.role}</p>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div onClick={() => setShowEditModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: SOCIAL.white, borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: SHARED.shadowXl }}>
                        <h3 style={{ margin: '0 0 20px', color: SOCIAL.text, fontWeight: 800, fontSize: '1.2rem', textAlign: 'center' }}>Edit Profile</h3>

                        {/* Profile pic preview + upload */}
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {editPic || user.profilePic ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={editPic || user.profilePic} alt="profile" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${SOCIAL.border}` }} />
                                ) : (
                                    <div style={{ width: 96, height: 96, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '2.2rem', border: '3px solid #fff' }}>
                                        {name[0]?.toUpperCase()}
                                    </div>
                                )}
                                <label style={{ position: 'absolute', bottom: 0, right: 0, background: SOCIAL.primary, color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', fontSize: '0.9rem' }}>
                                    📷
                                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                                        const file = e.target.files?.[0]
                                        if (!file) return
                                        setUploading(true)
                                        setEditError('')
                                        try {
                                            // Compress image
                                            const img = new Image()
                                            const url = URL.createObjectURL(file)
                                            await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
                                            URL.revokeObjectURL(url)
                                            let w = img.width, h = img.height
                                            if (w > 400) { h = Math.round(h * 400 / w); w = 400 }
                                            const canvas = document.createElement('canvas')
                                            canvas.width = w; canvas.height = h
                                            const ctx = canvas.getContext('2d')!
                                            ctx.drawImage(img, 0, 0, w, h)
                                            const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b || file), 'image/jpeg', 0.85) as unknown as void)
                                            // Upload to Cloudinary
                                            const sigRes = await authFetch('/api/social/upload-signature')
                                            const sig = await sigRes.json()
                                            if (!sig.available) { setEditError('Cloudinary not configured'); return }
                                            const fd = new FormData()
                                            fd.append('file', blob)
                                            fd.append('api_key', sig.apiKey)
                                            fd.append('timestamp', sig.timestamp.toString())
                                            fd.append('signature', sig.signature)
                                            fd.append('folder', sig.folder)
                                            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: fd })
                                            const cld = await cldRes.json()
                                            if (cldRes.ok && cld.secure_url) {
                                                setEditPic(cld.secure_url)
                                            } else {
                                                setEditError('Upload failed: ' + (cld?.error?.message || 'Unknown error'))
                                            }
                                        } catch (err) {
                                            setEditError('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
                                        } finally {
                                            setUploading(false)
                                        }
                                    }} />
                                </label>
                            </div>
                            {uploading && <p style={{ color: SOCIAL.primary, fontSize: '0.78rem', margin: '8px 0 0' }}>Uploading…</p>}
                        </div>

                        {/* Bio textarea */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</label>
                            <textarea
                                value={editBio}
                                onChange={e => setEditBio(e.target.value)}
                                placeholder="Tell people about yourself, your farm, your business…"
                                rows={3}
                                maxLength={500}
                                style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${SOCIAL.border}`, borderRadius: 10, fontSize: '0.9rem', color: SOCIAL.text, outline: 'none', fontFamily: SHARED.font, resize: 'vertical', boxSizing: 'border-box' }}
                            />
                            <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: '4px 0 0', textAlign: 'right' }}>{editBio.length}/500</p>
                        </div>

                        {/* UPI ID input */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>UPI ID (for receiving payments)</label>
                            <input
                                value={editUpiId}
                                onChange={e => setEditUpiId(e.target.value)}
                                placeholder="e.g., yourname@paytm, yourname@oksbi"
                                style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${SOCIAL.border}`, borderRadius: 10, fontSize: '0.9rem', color: SOCIAL.text, outline: 'none', fontFamily: SHARED.font, boxSizing: 'border-box' }}
                            />
                            <p style={{ color: SOCIAL.muted, fontSize: '0.72rem', margin: '4px 0 0' }}>Set your UPI ID so others can pay you directly via UPI (0% fees)</p>
                        </div>

                        {editError && <p style={{ color: SOCIAL.red, fontSize: '0.82rem', margin: '0 0 12px', textAlign: 'center' }}>{editError}</p>}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setShowEditModal(false); setEditError(''); setEditPic('') }} style={{ flex: 1, padding: '11px', background: SOCIAL.bg, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: SOCIAL.textSecondary, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={async () => {
                                setSaving(true)
                                setEditError('')
                                try {
                                    const body: Record<string, string> = {}
                                    if (editBio !== (user.bio || '')) body.bio = editBio
                                    if (editUpiId !== (user.upiId || '')) body.upiId = editUpiId
                                    if (editPic) body.profilePic = editPic
                                    if (Object.keys(body).length === 0) { setShowEditModal(false); return }
                                    const res = await authFetch('/api/social/profile', {
                                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body),
                                    })
                                    const d = await res.json()
                                    if (res.ok && d.user) {
                                        setData(prev => prev ? { ...prev, user: { ...prev.user, bio: d.user.bio, upiId: d.user.upiId, profilePic: d.user.profilePic } } : prev)
                                        setShowEditModal(false)
                                        setEditPic('')
                                    } else {
                                        setEditError(d?.error?.message || d?.error || 'Failed to save')
                                    }
                                } catch (err) {
                                    setEditError('Network error')
                                } finally {
                                    setSaving(false)
                                }
                            }} disabled={saving || uploading} style={{ flex: 1, padding: '11px', background: SOCIAL.primary, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: '#fff', cursor: 'pointer', opacity: (saving || uploading) ? 0.6 : 1 }}>
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
