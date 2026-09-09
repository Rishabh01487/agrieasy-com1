import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'

/**
 * Helper: try to populate userId, but if it fails (e.g. corrupt clip
 * referencing a deleted user), fall back to returning the clip with
 * userId as null. The frontend handles this via the isDeletedUser
 * check (clip.userId is not an object → render as "Unknown User").
 */
async function safePopulate(clips: any[]): Promise<any[]> {
    try {
        const populated = await Post.populate(clips, {
            path: 'userId',
            select: 'farmerName firmName role profilePic',
        })
        return populated.map((c: any) => ({
            ...c,
            userId: c.userId && typeof c.userId === 'object' ? c.userId : null,
        }))
    } catch (e) {
        console.error('populate failed, returning raw clips:', e)
        return clips
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.CLIPS_PAGE_SIZE)
        const category = searchParams.get('category') || 'all'

        const query: Record<string, unknown> = { isActive: true, type: 'krishiclip' }
        if (category && category !== 'all') query.category = category

        // Find without populate first (avoids crash on corrupt user refs)
        const [rawClips, total] = await Promise.all([
            Post.find(query)
                .sort({ rankScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Post.countDocuments(query).catch(() => 0),
        ])

        const clips = await safePopulate(rawClips)

        return NextResponse.json({ success: true, data: { clips }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error('Failed to fetch clips:', e)
        // Return empty array instead of 500 so the clips page doesn't break
        return NextResponse.json({
            success: true,
            data: { clips: [] },
            meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        })
    }
}
