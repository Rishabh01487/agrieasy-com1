'use client'

import { useEffect, useState, useRef, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { useIsMobile } from '@/lib/use-is-mobile'
import { Icon } from '@/lib/icons'
import { LoadingScreen, InlineLoader } from '@/app/components/Spinner'
import { AGRIVERSE_AVATARS, detectAgriVerseAvatar } from '@/lib/agriverse'
import AgriSocialBottomNav from '../../components/AgriSocialBottomNav'

interface UserInfo { _id: string; farmerName?: string; firmName?: string; role?: string; phone?: string; address?: string; email?: string; createdAt?: string; profilePic?: string; bio?: string; upiId?: string }
interface Post { _id: string; type: string; mediaUrl?: string; mediaType?: string; caption: string; category: string; likesCount: number; commentsCount: number; createdAt: string; savedBy?: string[]; views?: number; audioUrl?: string; audioTitle?: string; audioStartTime?: number }

const roleLabel: Record<string, string> = { farmer: '🌾 Farmer', buyer: '🛒 Buyer', transporter: '🚛 Transporter', driver: '🚗 Driver' }

/* Madhubani painting palette (reference image — navy → pink → gold on cream) */
const MH = {
  navy: '#1A1A3E',
  pink: '#D45D7E',
  gold: '#D4A574',
  cream: '#FFF8F0',
  deepPink: '#B83A5C',
}

/* Gold diamond (◇) divider — like the reference image's motif between two thin lines */
function MadhubaniDiamondDivider({ width = 80 }: { width?: number }) {
  return (
    <svg width={width} height="10" viewBox="0 0 80 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', margin: '8px auto 4px' }}>
      <line x1="0" y1="5" x2="32" y2="5" stroke={MH.gold} strokeWidth="0.8" />
      <line x1="48" y1="5" x2="80" y2="5" stroke={MH.gold} strokeWidth="0.8" />
      <polygon points="40,1 45,5 40,9 35,5" fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  )
}

/* Posts empty state — Madhubani sun + 3 wheat stalks in navy + gold + pink */
function MadhubaniPostsIllustration({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', margin: '0 auto' }}>
      {/* Sun (8 triangular rays + navy center) */}
      <g fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" strokeLinejoin="round">
        <polygon points="45,4 42,12 48,12" />
        <polygon points="45,4 42,12 48,12" transform="rotate(45 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(90 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(135 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(180 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(225 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(270 45 20)" />
        <polygon points="45,4 42,12 48,12" transform="rotate(315 45 20)" />
      </g>
      <circle cx="45" cy="20" r="8" fill={MH.navy} stroke={MH.pink} strokeWidth="0.8" />
      <circle cx="45" cy="20" r="3" fill={MH.gold} />

      {/* 3 wheat stalks rising from the dotted ground */}
      <g stroke={MH.navy} strokeWidth="1" fill="none" strokeLinecap="round">
        <line x1="45" y1="32" x2="45" y2="78" />
        <line x1="30" y1="42" x2="30" y2="78" />
        <line x1="60" y1="42" x2="60" y2="78" />
      </g>
      {/* Wheat grains (pink ellipses) */}
      <g fill={MH.pink} stroke={MH.navy} strokeWidth="0.4">
        <ellipse cx="45" cy="42" rx="2" ry="3" />
        <ellipse cx="45" cy="50" rx="2" ry="3" />
        <ellipse cx="45" cy="58" rx="2" ry="3" />
        <ellipse cx="30" cy="52" rx="1.8" ry="2.5" />
        <ellipse cx="30" cy="60" rx="1.8" ry="2.5" />
        <ellipse cx="30" cy="68" rx="1.8" ry="2.5" />
        <ellipse cx="60" cy="52" rx="1.8" ry="2.5" />
        <ellipse cx="60" cy="60" rx="1.8" ry="2.5" />
        <ellipse cx="60" cy="68" rx="1.8" ry="2.5" />
      </g>
      {/* Gold leaves beside the stalks */}
      <g fill={MH.gold} stroke={MH.navy} strokeWidth="0.4">
        <ellipse cx="42" cy="46" rx="2" ry="1" transform="rotate(-30 42 46)" />
        <ellipse cx="48" cy="46" rx="2" ry="1" transform="rotate(30 48 46)" />
        <ellipse cx="27" cy="56" rx="1.8" ry="0.9" transform="rotate(-30 27 56)" />
        <ellipse cx="63" cy="56" rx="1.8" ry="0.9" transform="rotate(30 63 56)" />
      </g>
      {/* Dotted ground line (creeping-vine motif) */}
      <line x1="20" y1="82" x2="70" y2="82" stroke={MH.navy} strokeWidth="0.6" strokeDasharray="2 1.5" />
    </svg>
  )
}

/* Clips empty state — Madhubani sun-mandala with a cream play triangle */
function MadhubaniClipsIllustration({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', margin: '0 auto' }}>
      {/* Outer double-line ring (kohbar convention) */}
      <circle cx="45" cy="45" r="42" fill="none" stroke={MH.gold} strokeWidth="1" />
      <circle cx="45" cy="45" r="39" fill="none" stroke={MH.gold} strokeWidth="0.4" strokeDasharray="1.5 1.5" />

      {/* 8 sun rays */}
      <g fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" strokeLinejoin="round">
        <polygon points="45,8 41,18 49,18" />
        <polygon points="45,8 41,18 49,18" transform="rotate(45 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(90 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(135 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(180 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(225 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(270 45 45)" />
        <polygon points="45,8 41,18 49,18" transform="rotate(315 45 45)" />
      </g>

      {/* Navy center circle with pink border */}
      <circle cx="45" cy="45" r="22" fill={MH.navy} stroke={MH.pink} strokeWidth="1" />
      {/* Cream play triangle (KrishiClip video play symbol) */}
      <polygon points="38,33 38,57 58,45" fill={MH.cream} />

      {/* Gold accent dots at the 4 cardinal points */}
      <g fill={MH.gold}>
        <circle cx="45" cy="22" r="1" />
        <circle cx="45" cy="68" r="1" />
        <circle cx="22" cy="45" r="1" />
        <circle cx="68" cy="45" r="1" />
      </g>
    </svg>
  )
}

/* Saved empty state — Madhubani bookmark with a 5-petal lotus inside */
function MadhubaniSavedIllustration({ size = 90 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block', margin: '0 auto' }}>
      {/* Bookmark outline (Madhubani-styled double-line) */}
      <path d="M28 10 L62 10 L62 80 L45 67 L28 80 Z" fill={MH.cream} stroke={MH.gold} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M30 12 L60 12 L60 76 L45 64 L30 76 Z" fill="none" stroke={MH.gold} strokeWidth="0.5" strokeDasharray="1.5 1.5" />

      {/* 5-petal lotus centered on the bookmark */}
      <g transform="translate(45 42)">
        <g fill={MH.pink} stroke={MH.navy} strokeWidth="0.5">
          <ellipse cx="0" cy="-12" rx="5" ry="10" />
          <ellipse cx="0" cy="-12" rx="5" ry="10" transform="rotate(-72)" />
          <ellipse cx="0" cy="-12" rx="5" ry="10" transform="rotate(-144)" />
          <ellipse cx="0" cy="-12" rx="5" ry="10" transform="rotate(72)" />
          <ellipse cx="0" cy="-12" rx="5" ry="10" transform="rotate(144)" />
        </g>
        {/* Center pistil */}
        <circle cx="0" cy="0" r="3.5" fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" />
        <circle cx="0" cy="0" r="1.5" fill={MH.navy} />
      </g>

      {/* Gold corner dots */}
      <g fill={MH.gold}>
        <circle cx="20" cy="20" r="1" />
        <circle cx="70" cy="20" r="1" />
        <circle cx="20" cy="60" r="1" />
        <circle cx="70" cy="60" r="1" />
      </g>
    </svg>
  )
}

export default function AgriSocialProfile({ params }: { params: Promise<{ userId: string }> }) {
    const { userId: profileId } = use(params)
    const router = useRouter()
    const [data, setData] = useState<{ user: UserInfo; posts: Post[]; clips: Post[]; saved: Post[]; stats: Record<string, number>; isFollowing: boolean; isOwnProfile?: boolean } | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'posts' | 'clips' | 'saved'>('posts')
    const [viewerId] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''))
    const [following, setFollowing] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editBio, setEditBio] = useState('')
    const [editPic, setEditPic] = useState('')
    const [editUpiId, setEditUpiId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editError, setEditError] = useState('')
    const [showAgriVersePicker, setShowAgriVersePicker] = useState(false)
    const [listModal, setListModal] = useState<'followers' | 'following' | null>(null)
    const [listUsers, setListUsers] = useState<any[]>([])
    const [listLoading, setListLoading] = useState(false)
    const [showPicZoom, setShowPicZoom] = useState(false)
    const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
    const longPressFiredRef = useRef(false)
    const touchStartX = useRef(0)
    const touchStartY = useRef(0)

    // Long-press handlers for profile picture zoom (Fix: Issue 4 — Instagram-style)
    const startPress = () => {
        if (!data?.user?.profilePic) return  // no zoom for avatar fallback
        longPressFiredRef.current = false
        pressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true
            setShowPicZoom(true)
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
        }, 500)  // 500ms = Instagram-style long-press
    }
    const cancelPress = () => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current)
            pressTimerRef.current = null
        }
    }
    const handlePicClick = () => {
        if (longPressFiredRef.current) {
            longPressFiredRef.current = false  // reset, swallow the click after long-press
            return
        }
        router.push(`/agrisocial/stories/${profileId}`)
    }

    // Swipe-to-switch-tab handlers (Fix: Issue 5 — Instagram-style swipe between Posts/Clips/Saved)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }
    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current
        // Only treat as horizontal swipe if |dx| > |dy| and |dx| > 50px
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            const tabs = isOwn ? ['posts', 'clips', 'saved'] : ['posts', 'clips']
            const i = tabs.indexOf(tab)
            const next = dx < 0 ? Math.min(tabs.length - 1, i + 1) : Math.max(0, i - 1)
            setTab(tabs[next] as 'posts' | 'clips' | 'saved')
        }
    }
    const [highlights, setHighlights] = useState<any[]>([])
    const isMobile = useIsMobile()

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

    if (loading) return <LoadingScreen color={SOCIAL.primary} background={SOCIAL.bg} label="Loading profile…" />
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

            <div style={{ maxWidth: isMobile ? '100%' : '960px', margin: '0 auto', padding: isMobile ? '12px 12px 80px' : '20px 16px 80px' }}>
                {/* Header — Instagram mobile: pic+stats in row, name/bio below, buttons full width */}
                {isMobile ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                            <div className="story-ring" style={{ width: 82, height: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                                onClick={handlePicClick}
                                onTouchStart={startPress}
                                onTouchEnd={cancelPress}
                                onTouchMove={cancelPress}
                                onMouseDown={startPress}
                                onMouseUp={cancelPress}
                                onMouseLeave={cancelPress}>
                                {user.profilePic ? (
                                    <img src={user.profilePic} alt={name} className="muse-avatar-glow" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }} />
                                ) : (
                                    <div style={{ width: 76, height: 76, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '2rem', border: '3px solid #fff' }}>
                                        {name[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                                <button onClick={() => { }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <strong style={{ color: SOCIAL.text, fontSize: '1.1rem', display: 'block' }}>{s.postsCount || 0}</strong>
                                    <span style={{ color: SOCIAL.muted, fontSize: '0.78rem' }}>posts</span>
                                </button>
                                <button onClick={() => { setListUsers([]); setListModal('followers') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <strong style={{ color: SOCIAL.text, fontSize: '1.1rem', display: 'block' }}>{s.followersCount || 0}</strong>
                                    <span style={{ color: SOCIAL.muted, fontSize: '0.78rem' }}>followers</span>
                                </button>
                                <button onClick={() => { setListUsers([]); setListModal('following') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    <strong style={{ color: SOCIAL.text, fontSize: '1.1rem', display: 'block' }}>{s.followingCount || 0}</strong>
                                    <span style={{ color: SOCIAL.muted, fontSize: '0.78rem' }}>following</span>
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {name}
                                {(() => {
                                    const av = detectAgriVerseAvatar(user.profilePic)
                                    if (!av) return null
                                    return (
                                        <span title={`${av.name} — ${av.tagline}`} style={{
                                            background: SOCIAL.bgSub, color: SOCIAL.primary,
                                            border: `1px solid ${SOCIAL.border}`,
                                            borderRadius: 100, padding: '1px 8px',
                                            fontSize: '0.56rem', fontWeight: 700,
                                            letterSpacing: '0.04em', textTransform: 'uppercase',
                                        }}>
                                            🎭 {av.name}
                                        </span>
                                    )
                                })()}
                            </p>
                            <p style={{ color: SOCIAL.text, fontWeight: 600, fontSize: '0.82rem', margin: '2px 0 0' }}>{roleLabel[user.role || ''] || 'AgriSocial Member'}</p>
                            {user.bio && <p style={{ color: SOCIAL.textSecondary, fontSize: '0.82rem', margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
                            {user.address && <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>📍 {user.address}</p>}
                            <p style={{ color: SOCIAL.primary, fontSize: '0.78rem', margin: '4px 0 0', fontWeight: 600 }}>❤️ {s.totalLikes || 0} likes · 🎬 {s.clipsCount || 0} clips</p>
                        </div>
                        {isOwn ? (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                <button onClick={() => { setEditBio(user.bio || ''); setEditPic(''); setEditUpiId(user.upiId || ''); setEditError(''); setShowAgriVersePicker(false); setShowEditModal(true) }} style={{ flex: 1, padding: '8px', background: SOCIAL.bgSub, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', color: SOCIAL.text, cursor: 'pointer' }}>Edit Profile</button>
                                <Link href="/agrisocial/create" style={{ flex: 1, padding: '8px', background: SOCIAL.bgSub, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', color: SOCIAL.text, textDecoration: 'none', textAlign: 'center' }}>+ New Post</Link>
                                <Link href="/agrisocial/saved" style={{ flex: 1, padding: '8px', background: SOCIAL.bgSub, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', color: SOCIAL.text, textDecoration: 'none', textAlign: 'center' }}>🔖 Saved</Link>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                <button onClick={handleFollow} style={{ flex: 1, padding: '8px', background: following ? SOCIAL.bgSub : SOCIAL.primary, border: `1px solid ${following ? SOCIAL.border : SOCIAL.primary}`, borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', color: following ? SOCIAL.text : '#fff', cursor: 'pointer' }}>
                                    {following ? 'Following' : 'Follow'}
                                </button>
                                <button onClick={handleMessage} style={{ flex: 1, padding: '8px', background: SOCIAL.bgSub, border: `1px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', color: SOCIAL.text, cursor: 'pointer' }}>Message</button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Desktop layout — original */
                    <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
                        <div className="story-ring" style={{ width: 152, height: 152, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                            onClick={handlePicClick}
                            onTouchStart={startPress}
                            onTouchEnd={cancelPress}
                            onTouchMove={cancelPress}
                            onMouseDown={startPress}
                            onMouseUp={cancelPress}
                            onMouseLeave={cancelPress}>
                            {user.profilePic ? (
                                <img src={user.profilePic} alt={name} className="muse-avatar-glow" style={{ width: 144, height: 144, borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff' }} />
                            ) : (
                                <div style={{ width: 144, height: 144, borderRadius: '50%', background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '3.5rem', border: '4px solid #fff' }}>
                                    {name[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 280 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                                <h1 style={{ color: SOCIAL.text, fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>
                                    {name}
                                    {(() => {
                                        const av = detectAgriVerseAvatar(user.profilePic)
                                        if (!av) return null
                                        return (
                                            <span title={`${av.name} — ${av.tagline}`} style={{
                                                marginLeft: 8, verticalAlign: 'middle',
                                                background: SOCIAL.bgSub, color: SOCIAL.primary,
                                                border: `1px solid ${SOCIAL.border}`,
                                                borderRadius: 100, padding: '2px 10px',
                                                fontSize: '0.62rem', fontWeight: 700,
                                                letterSpacing: '0.04em', textTransform: 'uppercase',
                                            }}>
                                                🎭 {av.name}
                                            </span>
                                        )
                                    })()}
                                </h1>
                                {isOwn ? (
                                    <>
                                        <button onClick={() => { setEditBio(user.bio || ''); setEditPic(''); setEditUpiId(user.upiId || ''); setEditError(''); setShowAgriVersePicker(false); setShowEditModal(true) }} style={{ padding: '7px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 8, fontWeight: 700, fontSize: '0.84rem', color: SOCIAL.text, cursor: 'pointer' }}>✏️ Edit Profile</button>
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
                            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                                <div style={{ cursor: 'pointer' }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.postsCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>posts</span></div>
                                <button onClick={() => { setListUsers([]); setListModal('followers') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followersCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>followers</span></button>
                                <button onClick={() => { setListUsers([]); setListModal('following') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><strong style={{ color: SOCIAL.text, fontSize: '1.05rem' }}>{s.followingCount || 0}</strong> <span style={{ color: SOCIAL.muted, fontSize: '0.86rem' }}>following</span></button>
                            </div>
                            <div>
                                <p style={{ color: SOCIAL.text, fontWeight: 700, fontSize: '0.88rem', margin: 0 }}>{roleLabel[user.role || ''] || 'AgriSocial Member'}</p>
                                {user.bio && <p style={{ color: SOCIAL.textSecondary, fontSize: '0.86rem', margin: '4px 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
                                {user.address && <p style={{ color: SOCIAL.muted, fontSize: '0.84rem', margin: '2px 0 0' }}>📍 {user.address}</p>}
                                {user.createdAt && <p style={{ color: SOCIAL.muted, fontSize: '0.78rem', margin: '2px 0 0' }}>Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>}
                                <p style={{ color: SOCIAL.primary, fontSize: '0.84rem', margin: '4px 0 0', fontWeight: 600 }}>❤️ {s.totalLikes || 0} total likes · 🎬 {s.clipsCount || 0} KrishiClips</p>
                            </div>
                        </div>
                    </div>
                )}

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

                <div style={{ display: 'flex', borderBottom: `1px solid ${SOCIAL.border}`, marginBottom: 6 }}>
                    {([
                        ['posts', '📷', 'Posts'],
                        ['clips', '🎬', 'KrishiClips'],
                        ...(isOwn ? [['saved', 'bookmark', 'Saved'] as const] : []),
                    ] as const).map(([k, icon, label]) => (
                        <button key={k} onClick={() => setTab(k as 'posts' | 'clips' | 'saved')}
                            style={{ flex: 1, padding: '12px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === k ? SOCIAL.primary : 'transparent'}`, fontWeight: 700, fontSize: '0.82rem', color: tab === k ? SOCIAL.primary : SOCIAL.muted, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {icon === 'bookmark' ? <Icon name="bookmark" size={16} color={tab === k ? SOCIAL.primary : SOCIAL.muted} filled={tab === k} /> : <span>{icon}</span>}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Grid — with swipe-to-switch-tab (Fix: Issue 5) */}
                <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {displayPosts.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '50px 20px', margin: '8px 0', borderRadius: 12,
                        border: `1px solid ${MH.gold}`,
                        background: MH.cream,
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(26,26,62,0.04) 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, rgba(212,93,126,0.04) 0 1px, transparent 1px 10px)',
                    }}>
                        {tab === 'posts' ? <MadhubaniPostsIllustration size={90} /> : tab === 'clips' ? <MadhubaniClipsIllustration size={90} /> : <MadhubaniSavedIllustration size={90} />}
                        <MadhubaniDiamondDivider width={80} />
                        <p style={{ color: MH.navy, fontWeight: 600, margin: '8px 0 0' }}>{isOwn ? (tab === 'saved' ? 'Save posts to see them here' : 'Share your first post!') : 'No posts yet'}</p>
                        {isOwn && tab !== 'saved' && <Link href={`/agrisocial/create?type=${tab === 'clips' ? 'krishiclip' : 'post'}`} style={{ display: 'inline-block', padding: '10px 22px', background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`, color: MH.cream, border: `1px solid ${MH.gold}`, borderRadius: 10, fontWeight: 700, textDecoration: 'none', marginTop: 14, fontSize: '0.86rem' }}>+ Create</Link>}
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 2 : 4 }}>
                        {displayPosts.map(p => {
                            // Determine the thumbnail URL based on media type (Fix: Issue 2 — was only showing image type)
                            const ytId = p.mediaUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1]
                            const isVideo = p.mediaType === 'video' || p.type === 'krishiclip'
                            const isImage = p.mediaType === 'image' && p.mediaUrl
                            const isYoutube = p.mediaType === 'youtube' || ytId
                            const thumbUrl = isImage
                                ? p.mediaUrl
                                : ytId
                                    ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
                                    : null  // video / text → use <video> element or fallback gradient
                            return (
                                <Link key={p._id} href={`/agrisocial/post/${p._id}`}
                                    style={{ position: 'relative', aspectRatio: '1', background: thumbUrl ? `url(${thumbUrl}) center/cover` : `linear-gradient(135deg, ${SOCIAL.primary}cc, ${SOCIAL.textSecondary})`, display: 'block', borderRadius: 2, overflow: 'hidden', textDecoration: 'none' }}>
                                    {/* For video clips, render a <video> with preload="metadata" so the first frame shows as thumbnail */}
                                    {!thumbUrl && isVideo && p.mediaUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <video src={p.mediaUrl} preload="metadata" muted playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                                    )}
                                    {/* Overlay icon for video/youtube/text posts (only when no thumbnail image) */}
                                    {!thumbUrl && !isVideo && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 6, textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>{isYoutube ? '▶️' : '📢'}</span>
                                            <p style={{ color: '#fff', fontSize: '0.62rem', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{p.caption}</p>
                                        </div>
                                    )}
                                    {isVideo && (
                                        <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: '#D9534F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 1 }}>
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    )}
                                    {p.audioUrl && (
                                        <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', borderRadius: 100, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                                            <span style={{ fontSize: '0.6rem' }}>🎵</span>
                                            <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.audioTitle || 'Music'}</span>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', padding: '6px 6px 4px', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>❤️ {p.likesCount}</span>
                                        <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>💬 {p.commentsCount}</span>
                                        {p.type === 'krishiclip' && <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700, marginLeft: 'auto' }}>👁 {p.views || 0}</span>}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
                </div>
            </div>

            {/* Profile Picture Zoom Overlay (long-press to zoom — Instagram-style) */}
            {showPicZoom && data?.user?.profilePic && (
                <div
                    onClick={() => setShowPicZoom(false)}
                    onTouchStart={(e) => { e.stopPropagation(); setShowPicZoom(false) }}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
                        zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out', backdropFilter: 'blur(8px)', animation: 'agrieasyFadeIn 0.2s ease-out'
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={data.user.profilePic}
                        alt={data.user.farmerName || data.user.firmName || 'Profile'}
                        style={{
                            maxWidth: '90vw', maxHeight: '90vh', borderRadius: '50%',
                            objectFit: 'cover', border: '4px solid #fff',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            animation: 'agrieasyScaleIn 0.2s ease-out'
                        }}
                    />
                </div>
            )}
            <style>{`
                @keyframes agrieasyFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes agrieasyScaleIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>

            {/* Followers/Following list */}
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
                            <InlineLoader color={SOCIAL.primary} />
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

            {/* Edit Profile */}
            {showEditModal && (
                <div onClick={() => setShowEditModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: SOCIAL.white, borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: SHARED.shadowXl }}>
                        <h3 style={{ margin: '0 0 20px', color: SOCIAL.text, fontWeight: 800, fontSize: '1.2rem', textAlign: 'center' }}>Edit Profile</h3>

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
                                            const sigRes = await authFetch('/api/social/upload-signature?kind=image')
                                            const sig = await sigRes.json()
                                            if (!sig.available) { setEditError('Cloudinary not configured'); return }
                                            const fd = new FormData()
                                            fd.append('file', blob)
                                            fd.append('api_key', sig.apiKey)
                                            fd.append('timestamp', sig.timestamp.toString())
                                            fd.append('signature', sig.signature)
                                            fd.append('folder', sig.folder)
                                            // SECURITY: forward signed params — Cloudinary rejects uploads that omit signed params.
                                            fd.append('resource_type', sig.resourceType)
                                            fd.append('allowed_formats', sig.allowedFormats)
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

                        {/* AgriVerse avatar picker — or upload your own photo */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label style={{ color: SOCIAL.muted, fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AgriVerse Avatar</label>
                                <button
                                    type="button"
                                    onClick={() => setShowAgriVersePicker(v => !v)}
                                    style={{
                                        background: showAgriVersePicker ? SOCIAL.bgSub : SOCIAL.primary,
                                        color: showAgriVersePicker ? SOCIAL.text : '#fff',
                                        border: `1px solid ${SOCIAL.border}`,
                                        borderRadius: 100, padding: '4px 12px',
                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                    }}
                                >
                                    {showAgriVersePicker ? '✕ Close' : '🎭 Pick avatar'}
                                </button>
                            </div>
                            {(() => {
                                const currentAvatar = detectAgriVerseAvatar(editPic || user.profilePic)
                                return currentAvatar ? (
                                    <p style={{ color: SOCIAL.text, fontSize: '0.78rem', margin: '0 0 8px' }}>
                                        Current: <strong>{currentAvatar.name}</strong> — <span style={{ color: SOCIAL.muted, fontStyle: 'italic' }}>{currentAvatar.tagline}</span>
                                    </p>
                                ) : null
                            })()}
                            {showAgriVersePicker && (
                                <div style={{
                                    background: SOCIAL.bg, border: `1px solid ${SOCIAL.border}`,
                                    borderRadius: 12, padding: 12,
                                    maxHeight: 280, overflowY: 'auto',
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                                        gap: 10,
                                    }}>
                                        {AGRIVERSE_AVATARS.map(a => {
                                            const selected = (editPic || user.profilePic) === a.src
                                            return (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => { setEditPic(a.src); setShowAgriVersePicker(false) }}
                                                    title={`${a.name} — ${a.tagline}`}
                                                    style={{
                                                        background: 'transparent', border: 'none',
                                                        padding: 0, cursor: 'pointer',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                    }}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={a.src}
                                                        alt={a.name}
                                                        style={{
                                                            width: 56, height: 56, borderRadius: '50%',
                                                            objectFit: 'cover',
                                                            border: selected ? `3px solid ${SOCIAL.primary}` : `2px solid ${SOCIAL.border}`,
                                                            boxShadow: selected ? `0 0 0 2px ${SOCIAL.primary}40` : 'none',
                                                            transition: 'transform 0.2s ease, border-color 0.2s ease',
                                                        }}
                                                    />
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 600,
                                                        color: selected ? SOCIAL.primary : SOCIAL.muted,
                                                        textAlign: 'center', lineHeight: 1.1,
                                                        maxWidth: 72, overflow: 'hidden',
                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>{a.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p style={{ color: SOCIAL.muted, fontSize: '0.7rem', margin: '10px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
                                        Pick an AgriVerse avatar, or upload your own photo above. 📷
                                    </p>
                                </div>
                            )}
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

            {/* Instagram-style bottom nav */}
            <AgriSocialBottomNav active="profile" />
        </div>
    )
}
