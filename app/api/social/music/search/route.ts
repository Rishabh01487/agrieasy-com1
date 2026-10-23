import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv } from 'crypto'

const DES_KEY = '38346591'

function decryptMediaUrl(encrypted: string): string {
  try {
    const key = Buffer.from(DES_KEY, 'utf8')
    const decipher = createDecipheriv('des-ecb', key, Buffer.alloc(0))
    decipher.setAutoPadding(true)
    const raw = Buffer.from(encrypted, 'base64')
    const decrypted = Buffer.concat([decipher.update(raw), decipher.final()])
    return decrypted.toString('utf8')
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || ''
  if (!query.trim()) {
    return NextResponse.json({ success: true, data: { songs: [] } })
  }

  try {
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(query)}&p=1&n=20`
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`)
    const searchData = await searchRes.json()
    const results = searchData.results || []

    const songIds = results.map((r: any) => r.id).filter(Boolean).slice(0, 20)
    if (songIds.length === 0) {
      return NextResponse.json({ success: true, data: { songs: [] } })
    }

    const detailsUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&_marker=0&cc=in&includeMetaTags=1&pids=${songIds.join(',')}`
    const detailsRes = await fetch(detailsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    if (!detailsRes.ok) throw new Error(`Details failed: ${detailsRes.status}`)
    const detailsData = await detailsRes.json()

    const songs = Object.values(detailsData).map((song: any) => {
      const encUrl = song.encrypted_media_url || ''
      const fullUrl = decryptMediaUrl(encUrl)
      const previewUrl = song.media_preview_url || ''
      const image = (song.image || '').replace('150x150', '500x500')
      return {
        title: (song.song || '').replace(/&amp;/g, '&'),
        artist: (song.primary_artists || song.singers || '').replace(/&amp;/g, '&'),
        album: (song.album || '').replace(/&amp;/g, '&'),
        duration: parseInt(song.duration || '0'),
        previewUrl,
        fullUrl,
        artworkUrl: image,
        genre: song.language || 'Music',
      }
    }).filter((s: any) => s.fullUrl || s.previewUrl)

    return NextResponse.json({ success: true, data: { songs } })
  } catch (e) {
    console.error('Music search error:', e)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
