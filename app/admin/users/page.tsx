'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import Modal from '@/components/ui/Modal'

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'expert', label: 'Expert' },
]
const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]

const STRIPE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Actif', color: '#16a34a' },
  past_due: { label: 'Impaye', color: '#dc2626' },
  canceled: { label: 'Annule', color: '#7a6a60' },
  trialing: { label: 'Essai', color: '#2563eb' },
  unpaid: { label: 'Impaye', color: '#dc2626' },
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days}j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return `il y a ${Math.floor(days / 30)} mois`
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string; name: string | null } | null>(null)

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
    const res = await fetch('/api/admin/users/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ [field]: value })
    })
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u))
    } else {
      const err = await res.json()
      alert(`Erreur: ${err.error || 'Mise à jour échouée'}`)
    }
    setSaving(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    setDeleteTarget(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const res = await fetch('/api/admin/users/' + deleteTarget.id, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
    } else {
      const err = await res.json()
      alert(`Erreur: ${err.error || 'Suppression échouée'}`)
    }
    setDeleting(null)
  }

  return (
    <Layout>
      <style>{`
        .admin-wrap { max-width: 1400px; margin: 48px auto; padding: 0 48px; }
        .admin-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 24px; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .table-wrap { background: #fff; border-radius: 16px; overflow-x: auto; -webkit-overflow-scrolling: touch; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 1100px; }
        thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #7a6a60; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #faf8f5; }
        td { padding: 12px 14px; vertical-align: middle; }
        .td-select { padding: 8px 10px; border-radius: 7px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; min-height: 36px; box-sizing: border-box; }
        .saving { opacity: 0.5; }
        .stripe-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: #fff; }
        .stripe-info { font-size: 11px; color: #7a6a60; margin-top: 2px; }
        .btn-delete { padding: 6px 12px; border-radius: 7px; border: 1.5px solid #fca5a5; background: #fff; color: #dc2626; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .btn-delete:hover { background: #fef2f2; border-color: #dc2626; }
        .btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }
        .user-name { font-weight: 600; font-size: 13px; }
        .user-email { font-size: 12px; color: #7a6a60; }
        @media (max-width: 768px) {
          .admin-wrap { padding: 0 16px; margin: 24px auto; }
          .admin-title { font-size: 22px; }
          table { font-size: 11px; }
          th, td { padding: 8px 10px; }
        }
      `}</style>

      <div className="admin-wrap">
        <a href="/admin" className="back-link">Retour au dashboard</a>
        <h1 className="admin-title">Gestion des utilisateurs</h1>

        {loading ? (
          <p style={{ color: '#7a6a60', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Plan</th>
                  <th>Role</th>
                  <th>{"Strat\u00E9gie"}</th>
                  <th>Statut</th>
                  <th>Dernier paiement</th>
                  <th>{"Renouvellement"}</th>
                  <th>{"Derni\u00E8re connexion"}</th>
                  <th>Inscription</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={saving === u.id ? 'saving' : ''}>
                    <td>
                      {u.full_name && <div className="user-name">{u.full_name}</div>}
                      <div className={u.full_name ? 'user-email' : ''} style={!u.full_name ? { fontWeight: 500 } : {}}>{u.email}</div>
                    </td>
                    <td><select className="td-select" value={u.plan || 'free'} onChange={e => updateUser(u.id, 'plan', e.target.value)}>{PLANS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></td>
                    <td><select className="td-select" value={u.role || 'user'} onChange={e => updateUser(u.id, 'role', e.target.value)}>{ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></td>
                    <td style={{ fontSize: '12px', color: '#7a6a60' }}>{u.strategie_mdb || '\u2014'}</td>
                    <td>
                      {u.stripe ? (
                        <span className="stripe-badge" style={{ background: u.stripe.cancel_pending ? '#f39c12' : (STRIPE_STATUS_LABELS[u.stripe.subscription_status]?.color || '#7a6a60') }}>
                          {u.stripe.cancel_pending ? 'Annulation' : (STRIPE_STATUS_LABELS[u.stripe.subscription_status]?.label || u.stripe.subscription_status || 'Inconnu')}
                        </span>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: '12px' }}>{'\u2014'}</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: '#7a6a60' }}>
                      {u.stripe?.last_payment_date ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.stripe.last_payment_amount}{'\u20AC'}</div>
                          <div style={{ fontSize: '11px' }}>{new Date(u.stripe.last_payment_date).toLocaleDateString('fr-FR')}</div>
                        </div>
                      ) : '\u2014'}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {u.stripe?.cancel_pending && u.stripe.cancel_date ? (
                        <div style={{ color: '#f39c12', fontWeight: 500 }}>
                          Fin le {new Date(u.stripe.cancel_date).toLocaleDateString('fr-FR')}
                        </div>
                      ) : u.stripe?.current_period_end ? (
                        <div style={{ color: '#7a6a60' }}>
                          {new Date(u.stripe.current_period_end).toLocaleDateString('fr-FR')}
                        </div>
                      ) : (
                        <span style={{ color: '#bbb' }}>{'\u2014'}</span>
                      )}
                    </td>
                    <td>
                      {u.last_sign_in_at ? (
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 500 }}>{new Date(u.last_sign_in_at).toLocaleDateString('fr-FR')}</div>
                          <div style={{ fontSize: '11px', color: '#7a6a60' }}>{formatTimeAgo(u.last_sign_in_at)}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#bbb', fontSize: '12px' }}>Jamais</span>
                      )}
                    </td>
                    <td style={{ color: '#7a6a60', fontSize: '12px' }}>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                    <td>
                      <button
                        className="btn-delete"
                        disabled={deleting === u.id}
                        onClick={() => setDeleteTarget({ id: u.id, email: u.email, name: u.full_name })}
                      >
                        {deleting === u.id ? '...' : 'Supprimer'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer ce compte" width="420px">
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: '#1a1210' }}>
          <p style={{ margin: '0 0 16px', lineHeight: 1.6 }}>
            Tu es sur le point de supprimer le compte de{' '}
            <strong>{deleteTarget?.name || deleteTarget?.email}</strong>.
          </p>
          <div style={{
            background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '20px', fontSize: '13px', lineHeight: 1.6,
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px', color: '#dc2626' }}>
              Cette action est irreversible
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', color: '#7a6a60' }}>
              <li>Profil et parametres</li>
              <li>Watchlist et alertes</li>
              <li>Abonnement Stripe (si actif)</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDeleteTarget(null)}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e8e2d8',
                background: '#fff', color: '#7a6a60', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Supprimer le compte
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
