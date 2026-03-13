'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const PLANS = ['Free', 'Starter', 'Pro']
const ROLES = ['User', 'Admin']

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const data = await res.json()
      setUsers(data.users || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateUser(id: string, field: string, value: any) {
    setSaving(id)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/users/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ [field]: value })
    })
    setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
    setSaving(null)
  }

  return (
    <Layout>
      <style>{`
        .admin-wrap { max-width: 1200px; margin: 48px auto; padding: 0 48px; }
        .admin-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 24px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #9a8a80; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .table-wrap { background: #fff; border-radius: 16px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #faf8f5; }
        td { padding: 12px 14px; vertical-align: middle; }
        .td-select { padding: 6px 10px; border-radius: 7px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; }
        .saving { opacity: 0.5; }
      `}</style>

      <div className="admin-wrap">
        <a href="/admin" className="back-link">Retour au dashboard</a>
        <h1 className="admin-title">Gestion des utilisateurs</h1>

        {loading ? (
          <p style={{ color: '#9a8a80', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Role</th>
                  <th>TMI</th>
                  <th>Regime</th>
                  <th>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={saving === u.id ? 'saving' : ''}>
                    <td style={{ fontWeight: 500 }}>{u.email}</td>
                    <td><select className="td-select" value={u.plan || 'free'} onChange={e => updateUser(u.id, 'plan', e.target.value)}>{PLANS.map(p => <option key={p}>{p}</option>)}</select></td>
                    <td><select className="td-select" value={u.role || 'user'} onChange={e => updateUser(u.id, 'role', e.target.value)}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
                    <td>{u.tmi} %</td>
                    <td>{u.regime}</td>
                    <td style={{ color: '#9a8a80', fontSize: '12px' }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}