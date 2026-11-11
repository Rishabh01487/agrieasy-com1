/**
 * Cloudflare R2 — presigned URL generator for direct-to-storage browser uploads.
 *
 * R2 is S3-compatible, so we use the AWS SDK with a custom endpoint pointing
 * at Cloudflare's R2 API. The flow:
 *
 *   1. Server generates a presigned PUT URL for a specific object key.
 *   2. Client PUTs the raw file bytes directly to that URL (bypasses our
 *      server entirely — no bandwidth, no CPU cost on the Next.js process).
 *   3. Client constructs the public serving URL from R2_PUBLIC_URL + key.
 *
 * Why presigned PUT instead of POST-with-form-data: PUT is simpler (one
 * request, no multipart form parsing), faster (no 302 redirect like
 * Cloudinary), and works with any HTTP client including fetch().
 *
 * Env vars (all required for R2 to be "available"):
 *   R2_ACCOUNT_ID          — Cloudflare account ID (dashboard right sidebar)
 *   R2_ACCESS_KEY_ID       — from R2 → Manage R2 API Tokens → Create
 *   R2_SECRET_ACCESS_KEY   — paired secret
 *   R2_BUCKET_NAME         — e.g. "agrieasy-media"
 *   R2_PUBLIC_URL          — https://media.agrieasy.site (custom domain)
 *                            or https://pub-<hash>.r2.dev (free dev URL)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomBytes } from 'crypto'

export interface R2Config {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl: string  // e.g. https://media.agrieasy.site (no trailing slash)
}

export function loadR2Config(): R2Config | null {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME
    const publicUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
        return null
    }
    return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl }
}

let _client: S3Client | null = null
function getClient(cfg: R2Config): S3Client {
    if (_client) return _client
    _client = new S3Client({
        region: 'auto',
        endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: cfg.accessKeyId,
            secretAccessKey: cfg.secretAccessKey,
        },
    })
    return _client
}

/**
 * Generate a server-derived object key + presigned PUT URL.
 *
 * Security: the key is `{userId}/{timestamp}-{random}.{ext}` — the client
 * cannot choose it, so a user cannot target another user's asset for
 * overwrite (same protection as the old Cloudinary signature route).
 */
export async function generateR2UploadUrl(
    cfg: R2Config,
    userId: string,
    options: { kind: 'image' | 'video' | 'audio'; contentType?: string; fileExtension?: string },
): Promise<{ uploadUrl: string; key: string; publicUrl: string; contentType: string }> {
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const timestamp = Date.now()
    const random = randomBytes(6).toString('hex')

    // Derive file extension from kind/contentType if not provided
    let ext = options.fileExtension || 'bin'
    if (!options.fileExtension) {
        if (options.contentType) {
            const map: Record<string, string> = {
                'image/jpeg': 'jpg', 'image/jpg': 'jpg',
                'image/png': 'png', 'image/webp': 'webp',
                'image/gif': 'gif', 'image/heic': 'heic',
                'video/mp4': 'mp4', 'video/webm': 'webm',
                'video/quicktime': 'mov',
                'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
                'audio/wav': 'wav', 'audio/ogg': 'ogg',
                'audio/aac': 'aac', 'audio/mp4': 'm4a',
            }
            ext = map[options.contentType] || 'bin'
        } else if (options.kind === 'image') ext = 'jpg'
        else if (options.kind === 'video') ext = 'mp4'
        else if (options.kind === 'audio') ext = 'mp3'
    }

    const key = `agrieasy/${safeUserId}/${timestamp}-${random}.${ext}`
    const contentType = options.contentType || (
        options.kind === 'image' ? 'image/jpeg' :
        options.kind === 'video' ? 'video/mp4' :
        options.kind === 'audio' ? 'audio/mpeg' :
        'application/octet-stream'
    )

    const command = new PutObjectCommand({
        Bucket: cfg.bucketName,
        Key: key,
        ContentType: contentType,
    })

    // Presigned URL valid for 10 minutes — enough for a large video upload
    // to complete, short enough to limit replay window.
    const uploadUrl = await getSignedUrl(getClient(cfg), command, { expiresIn: 600 })

    return {
        uploadUrl,
        key,
        publicUrl: `${cfg.publicUrl}/${key}`,
        contentType,
    }
}
