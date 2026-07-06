'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ADMIN, SHARED } from '@/lib/styles'

export default function AdminPosts() {
  const [posts, setPosts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    authFetch(`/api/admin/posts?page=${page}&limit=20`)
      .then(r => r.json())
      .then(d => { setPosts(d.posts || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const remove = async (postId: string) => {
    if (!confirm('Delete this post?')) return
    await authFetch(`/api/admin/posts/${postId}`, { method: 'DELETE' })
    setMsg('Post deleted')
    load()
    setTimeout(() => setMsg(''), 3000)
  }

  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 13, borderBottom: `1px solid ${ADMIN.border}`, fontFamily: SHARED.font }

  const btnBase: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    border: `1px solid ${ADMIN.border}`,
    background: ADMIN.card,
    color: ADMIN.text,
    cursor: 'pointer',
    fontFamily: SHARED.font,
    transition: 'background 0.15s, opacity 0.15s',
  }

  return (
    <div style={{ fontFamily: SHARED.font }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>Content Moderation</h1>
      {msg && <div style={{ padding: '8px 16px', background: ADMIN.green, color: '#000', borderRadius: 8, marginBottom: 16, fontSize: 13, fontFamily: SHARED.font }}>{msg}</div>}
      <div style={{ background: ADMIN.card, border: `1px solid ${ADMIN.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: ADMIN.muted }}>Loading...</div> : posts.length === 0 ? <div style={{ padding: 24, color: ADMIN.muted }}>No posts</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: ADMIN.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={cell}>Type</th>
                <th style={cell}>Author</th>
                <th style={cell}>Caption</th>
                <th style={cell}>Likes</th>
                <th style={cell}>Date</th>
                <th style={cell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p: any, i: number) => (
                <tr key={p._id} style={{ background: i % 2 === 0 ? ADMIN.card : ADMIN.bgSub, transition: 'background 0.15s' }}>
                  <td style={{ ...cell, color: ADMIN.primary, fontWeight: 600 }}>{p.type}</td>
                  <td style={cell}>{p.userId?.email || p.userId?.phone || '—'}</td>
                  <td style={{ ...cell, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.caption?.slice(0, 80) || '—'}</td>
                  <td style={cell}>{p.likesCount || 0}</td>
                  <td style={cell}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={cell}>
                    <button onClick={() => remove(p._id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: ADMIN.red, color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: SHARED.font, transition: 'opacity 0.15s' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ ...btnBase, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ padding: '6px 14px', color: ADMIN.muted, fontSize: 13 }}>Page {page} of {Math.ceil(total / 20)}</span>
        <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
          style={{ ...btnBase, cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / 20) ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}