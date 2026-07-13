'use client'

export async function shareContent(url: string, title?: string, text?: string): Promise<'shared' | 'copied' | 'failed'> {
  const shareData: ShareData = {
    title: title || 'AgriEasy',
    text: text || 'Check this out on AgriEasy',
    url,
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData)
      return 'shared'
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'failed'
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(url)
      return 'copied'
    } catch {}
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = url
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (ok) return 'copied'
  } catch {}

  return 'failed'
}
