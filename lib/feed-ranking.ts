import mongoose from 'mongoose'

/**
 * AgriSocial feed ranking algorithm.
 *
 * Factors (weighted):
 * 1. Recency — newer posts score higher (time decay)
 * 2. Engagement — likes, comments, views, saves, shares
 * 3. Follow-graph priority — posts from people the viewer follows get a boost
 * 4. Clip bonus — krishiclips get a small boost (they're more engaging)
 * 5. Media bonus — posts with media (image/video) rank higher than text-only
 * 6. Author engagement — authors with high total engagement get a small boost
 *
 * The score is computed in JS (not MongoDB aggregation) for flexibility.
 * Posts are fetched from MongoDB, then re-ranked in JS using this function.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export function computeRankScore(post: any, viewerFollowingIds: Set<string> = new Set()): number {
    const now = Date.now()
    const createdAt = new Date(post.createdAt || post._id?.getTimestamp?.() || now).getTime()
    const ageHours = (now - createdAt) / HOUR

    // 1. Recency — exponential time decay.
    // Fresh posts (0-1h) get full recency score.
    // Posts older than 7 days get almost 0 recency score.
    // Using a half-life of 24 hours (posts lose half their recency every 24h).
    const recencyScore = Math.pow(0.5, ageHours / 24) // 1.0 at 0h, 0.5 at 24h, 0.25 at 48h, etc.

    // 2. Engagement — weighted sum of interactions.
    // Likes are worth 1 point each, comments 2 (higher effort), views 0.1
    // (low intent), saves 3 (high intent), shares 3 (high intent).
    const likes = post.likesCount || 0
    const comments = post.commentsCount || 0
    const views = post.views || 0
    const saves = post.savedCount || 0
    const shares = post.sharedCount || 0
    const engagementScore = likes * 1 + comments * 2 + views * 0.1 + saves * 3 + shares * 3

    // Logarithmic scaling so a post with 1000 likes isn't 1000x better than
    // one with 1 like. log10(engagement + 10) keeps it in a reasonable range.
    const engagementScaled = Math.log10(engagementScore + 10) // ~1.0 for 0 engagement, ~3.0 for 100, ~4.0 for 1000

    // 3. Follow-graph priority — posts from people the viewer follows get a 2x boost.
    // This ensures that if someone you follow posts, it shows up first in your feed.
    const authorId = typeof post.userId === 'object' ? post.userId?._id?.toString() : post.userId?.toString()
    const isFollowing = authorId && viewerFollowingIds.has(authorId)
    const followBoost = isFollowing ? 2.0 : 1.0

    // 4. Clip bonus — krishiclips are more engaging (full-screen video), small boost.
    const clipBoost = post.type === 'krishiclip' ? 1.2 : 1.0

    // 5. Media bonus — posts with media rank higher than text-only.
    const hasMedia = post.mediaUrl || (post.mediaUrls && post.mediaUrls.length > 0)
    const mediaBoost = hasMedia ? 1.15 : 1.0

    // Final score: recency * engagement * boosts
    // Recency dominates for fresh posts, engagement dominates for older posts.
    // The follow boost multiplies everything so followed authors always rank higher.
    const score = (recencyScore * 0.4 + engagementScaled * 0.1) * followBoost * clipBoost * mediaBoost

    return score
}

/**
 * Rank and sort posts for the feed.
 * @param posts — array of post objects from MongoDB
 * @param viewerFollowingIds — Set of ObjectIds (as strings) that the viewer follows
 * @returns sorted array (highest score first)
 */
export function rankPosts(posts: any[], viewerFollowingIds: Set<string> = new Set()): any[] {
    return posts
        .map(p => ({ ...p, _rankScore: computeRankScore(p, viewerFollowingIds) }))
        .sort((a, b) => {
            // Primary sort: rank score (higher first)
            if (b._rankScore !== a._rankScore) return b._rankScore - a._rankScore
            // Secondary sort: createdAt (newer first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
}

/**
 * Rank clips for the clips feed.
 * Same algorithm as rankPosts, but with a higher view-count weight
 * (clips are all about views) and no follow-graph boost (clips are
 * shown to everyone, not just followers).
 */
export function rankClips(clips: any[]): any[] {
    return clips
        .map(c => {
            const now = Date.now()
            const createdAt = new Date(c.createdAt || now).getTime()
            const ageHours = (now - createdAt) / HOUR
            const recencyScore = Math.pow(0.5, ageHours / 48) // 48h half-life (clips live longer)

            const likes = c.likesCount || 0
            const comments = c.commentsCount || 0
            const views = c.views || 0
            const shares = c.sharedCount || 0
            // Views are worth more for clips (they're the primary engagement metric)
            const engagementScore = likes * 1.5 + comments * 2 + views * 0.2 + shares * 3
            const engagementScaled = Math.log10(engagementScore + 10)

            // Clips with audio get a small boost (they're more engaging)
            const audioBoost = c.audioUrl ? 1.1 : 1.0

            const score = (recencyScore * 0.4 + engagementScaled * 0.15) * audioBoost

            return { ...c, _rankScore: score }
        })
        .sort((a, b) => {
            if (b._rankScore !== a._rankScore) return b._rankScore - a._rankScore
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
}
