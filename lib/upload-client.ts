/**
 * Client-side media upload helper.
 *
 * One function handles both R2 (presigned PUT) and legacy Cloudinary
 * (FormData POST) flows, chosen by the `provider` field returned from
 * /api/social/upload-signature. This keeps every upload call site in
 * the app as a simple 2-liner:
 *
 *   const sig = await (await authFetch('/api/social/upload-signature?kind=image')).json()
 *   const url = await uploadFile(sig, file)
 *
 * The returned `url` is the public URL to store in the DB (Post.mediaUrl,
 * Listing.commodityPhoto, etc.) — it's already a full https URL regardless
 * of which storage backend served it.
 */

export interface UploadSignature {
    available: boolean
    provider?: 'r2' | 'cloudinary'
    // R2 fields
    uploadUrl?: string
    publicUrl?: string
    key?: string
    contentType?: string
    // Cloudinary fields (legacy)
    cloudName?: string
    apiKey?: string
    signature?: string
    timestamp?: number
    folder?: string
    resourceType?: string
    public_id?: string
    error?: string
}

/**
 * Upload a file (Blob/File) using a signature from /api/social/upload-signature.
 * Returns the public URL of the uploaded asset, or throws on failure.
 */
export async function uploadFile(sig: UploadSignature, file: Blob): Promise<string> {
    if (!sig.available) {
        throw new Error(sig.error || 'Media storage not configured')
    }

    if (sig.provider === 'r2') {
        if (!sig.uploadUrl || !sig.publicUrl) {
            throw new Error('R2 signature incomplete — missing uploadUrl or publicUrl')
        }
        // Direct-to-R2 PUT. The presigned URL already encodes the content-type
        // and expiry; we just send the raw bytes.
        const headers: Record<string, string> = {}
        if (sig.contentType) headers['Content-Type'] = sig.contentType

        const res = await fetch(sig.uploadUrl, {
            method: 'PUT',
            body: file,
            headers,
        })

        if (!res.ok) {
            const errText = await res.text().catch(() => '')
            throw new Error(`Upload failed: HTTP ${res.status} ${errText.slice(0, 200)}`)
        }

        return sig.publicUrl
    }

    // Legacy Cloudinary path
    if (!sig.apiKey || !sig.cloudName || !sig.signature) {
        throw new Error('Cloudinary signature incomplete — missing apiKey, cloudName, or signature')
    }

    const resourceType = sig.resourceType || 'image'
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', String(sig.timestamp))
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder || 'agrieasy')
    fd.append('public_id', sig.public_id || '')
    if (resourceType === 'auto') fd.append('resource_type', 'auto')

    const cldRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`,
        { method: 'POST', body: fd },
    )
    const cld = await cldRes.json()

    if (!cldRes.ok || !cld.secure_url) {
        const cldMsg = cld?.error?.message || `Cloudinary HTTP ${cldRes.status}`
        throw new Error(cldMsg)
    }

    return cld.secure_url as string
}
