'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

const STATUTS = ['Toujours disponible', 'Vendu', 'Expire', 'Masque']
const TYPE_LOYER = ['HC', 'CC']

export default function AdminBiensPage() {
  const [biens, setBiens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('Tous')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/'; return }
      const res = await fetch('/api/admin/biens', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const data = await res.json()
      setBiens(data.biens || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateBien(id: string, field: string, value: any) {
    setSaving(id)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch('/api/admin/biens/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ [field]: value })
    })
    setBiens(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b))
    setSaving(null)
  }

  const filtered = biens.filter(b => {
    if (filtreStatut !== 'Tous' && b.statut !== filtreStatut) return false
    if (search && !b.ville?.toLowerCase().includes(search.toLowerCase()) && !b.id?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Layout>
      <style>{`
        .admin-wrap { max-width: 1600px; margin: 48px auto; padding: 0 48px; }
        .admin-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
        .admin-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; }
        .admin-filters { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .admin-search { padding: 9px 14px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; width: 220px; }
        .admin-select { padding: 9px 14px; border-radius: 9px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; }
        .admin-count { font-size: 13px; color: #7a6a60; }
        .table-wrap { background: #fff; border-radius: 16px; overflow: auto; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        th { padding: 12px 14px; text-align: left; font-size: 11px; font-weight: 600; color: #7a6a60; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.1s; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover { background: #faf8f5; }
        td { padding: 10px 14px; vertical-align: middle; }
        .td-input { padding: 6px 10px; border-radius: 7px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; width: 90px; }
        .td-input:focus { border-color: #c0392b; }
        .td-select { padding: 6px 10px; border-radius: 7px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; background: #faf8f5; outline: none; }
        .saving { opacity: 0.5; }
        .back-link { display: inline-block; margin-bottom: 24px; font-size: 13px; color: #7a6a60; text-decoration: none; }
        .back-link:hover { color: #1a1210; }
        .nc { color: #c0392b; font-style: italic; font-size: 11px; }
      `}</style>

      <div className="admin-wrap">
        <a href="/admin" className="back-link">Retour au dashboard</a>

        <div className="admin-header">
          <h1 className="admin-title">Gestion des biens</h1>
          <div className="admin-filters">
            <input className="admin-search" placeholder="Rechercher ville, ID..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="admin-select" value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}>
              <option>Tous</option>
              {STATUTS.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="admin-count">{filtered.length} biens</span>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#7a6a60', padding: '40px', textAlign: 'center' }}>Chargement...</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ville</th>
                  <th>Type</th>
                  <th>Prix FAI</th>
                  <th>Loyer</th>
                  <th>Type loyer</th>
                  <th>Charges rec.</th>
                  <th>Charges copro</th>
                  <th>Taxe fonc.</th>
                  <th>Rendement</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bien => (
                  <tr key={bien.id} className={saving === bien.id ? 'saving' : ''}>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7a6a60' }}>{bien.id}</td>
                    <td style={{ fontWeight: 500 }}>{bien.ville}</td>
                    <td>{bien.type_bien} {bien.nb_pieces}</td>
                    <td style={{ fontWeight: 600 }}>{bien.prix_fai ? bien.prix_fai.toLocaleString('fr-FR') + ' \u20AC' : '-'}</td>
                    <td><input className="td-input" type="number" defaultValue={bien.loyer || ''} placeholder="NC" onBlur={e => { if (Number(e.target.value) !== bien.loyer) updateBien(bien.id, 'loyer', Number(e.target.value)) }} /></td>
                    <td>
                      <select className="td-select" value={bien.type_loyer || 'HC'} onChange={e => updateBien(bien.id, 'type_loyer', e.target.value)}>
                        {TYPE_LOYER.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td><input className="td-input" type="number" defaultValue={bien.charges_rec || ''} placeholder="NC" onBlur={e => { if (Number(e.target.value) !== bien.charges_rec) updateBien(bien.id, 'charges_rec', Number(e.target.value)) }} /></td>
                    <td><input className="td-input" type="number" defaultValue={bien.charges_copro || ''} placeholder="NC" onBlur={e => { if (Number(e.target.value) !== bien.charges_copro) updateBien(bien.id, 'charges_copro', Number(e.target.value)) }} /></td>
                    <td><input className="td-input" type="number" defaultValue={bien.taxe_fonc_ann || ''} placeholder="NC" onBlur={e => { if (Number(e.target.value) !== bien.taxe_fonc_ann) updateBien(bien.id, 'taxe_fonc_ann', Number(e.target.value)) }} /></td>
                    <td>{bien.rendement_brut ? (bien.rendement_brut * 100).toFixed(2) + ' %' : '-'}</td>
                    <td><select className="td-select" value={bien.statut || ''} onChange={e => updateBien(bien.id, 'statut', e.target.value)}>{STATUTS.map(s => <option key={s}>{s}</option>)}</select></td>
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