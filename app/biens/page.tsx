'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import BienCard from '@/components/BienCard'
import MetroBadge from '@/components/MetroBadge'
import RendementBadge from '@/components/RendementBadge'
import { Bien } from '@/lib/types'
import { TYPES_BIEN, TRIS } from '@/lib/constants'

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' €' : '—'
}

export default function BiensPage() {
  const [allBiens, setAllBiens] = useState<Bien[]>([])
  const [metropoles, setMetropoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [strategie, setStrategie] = useState('')
  const [metropole, setMetropole] = useState('Toutes')
  const [ville, setVille] = useState('Toutes')
  const [typeBien, setTypeBien] = useState('Tous')
  const [prixMin, setPrixMin] = useState('')
  const [prixMax, setPrixMax] = useState('')
  const [rendMin, setRendMin] = useState('')
  const [tri, setTri] = useState('recent')

  useEffect(() => {
    Promise.all([
      fetch('/api/biens').then(r => r.json()),
      fetch('/api/metropoles').then(r => r.json()),
    ]).then(([biensData, metroData]) => {
      setAllBiens(biensData.biens || [])
      setMetropoles(metroData.metropoles || [])
      setLoading(false)
    })
  }, [])

  const villes = metropole === 'Toutes' ? [] :
    [...new Set(allBiens.filter(b => b.metropole === metropole).map(b => b.ville))].sort()

  const strategies = [...new Set(allBiens.map(b => b.strategie_mdb).filter(Boolean))].sort()

  let filtered = allBiens.filter(b => {
    if (strategie && b.strategie_mdb !== strategie) return false
    if (metropole !== 'Toutes' && b.metropole !== metropole) return false
    if (ville !== 'Toutes' && b.ville !== ville) return false
    if (typeBien !== 'Tous' && b.type_bien !== typeBien) return false
    if (prixMin && b.prix_fai < Number(prixMin)) return false
    if (prixMax && b.prix_fai > Number(prixMax)) return false
    if (rendMin && (!b.rendement_brut || b.rendement_brut * 100 < Number(rendMin))) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    if (tri === 'rendement_desc') return (b.rendement_brut || 0) - (a.rendement_brut || 0)
    if (tri === 'rendement_asc') return (a.rendement_brut || 0) - (b.rendement_brut || 0)
    if (tri === 'prix_asc') return (a.prix_fai || 0) - (b.prix_fai || 0)
    if (tri === 'prix_desc') return (b.prix_fai || 0) - (a.prix_fai || 0)
    return 0
  })

  return (
    <Layout>
      <style>{`
        .main { max-width: 1320px; margin: 0 auto; padding: 32px 48px; }
        .filter-bar {
          background: #fff; border-radius: 16px; padding: 20px 24px;
          margin-bottom: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end;
        }
        .filter-group { display: flex; flex-direction: column; gap: 5px; }
        .filter-label { font-size: 11px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; }
        .filter-bar select, .filter-bar input {
          padding: 9px 13px; border-radius: 9px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 13px;
          background: #faf8f5; color: #1a1210; outline: none; transition: border-color 0.15s;
        }
        .filter-bar select:focus, .filter-bar input:focus { border-color: #c0392b; }
        .filter-bar select.required { border-color: #c0392b; background: #fff8f7; }
        .filter-bar input { width: 140px; }
        .filter-sep { width: 1px; height: 44px; background: #e8e2d8; align-self: flex-end; margin: 0 4px; }
        .view-toggle { margin-left: auto; display: flex; gap: 4px; align-self: flex-end; }
        .view-btn {
          padding: 9px 16px; border-radius: 9px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; background: transparent; color: #888;
        }
        .view-btn.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .results-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .results-count { font-size: 14px; color: #9a8a80; }
        .results-count strong { color: #1a1210; font-weight: 600; }
        .empty-state { text-align: center; padding: 80px 40px; color: #9a8a80; }
        .empty-state h3 { font-family: 'Fraunces', serif; font-size: 22px; color: #1a1210; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 20px; }
        .list-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .list-table thead tr { background: #f7f4f0; border-bottom: 2px solid #ede8e0; }
        .list-table thead th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #9a8a80; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
        .list-table tbody tr { border-bottom: 1px solid #f0ede8; transition: background 0.12s; }
        .list-table tbody tr:last-child { border-bottom: none; }
        .list-table tbody tr:hover { background: #faf8f5; }
        .list-table td { padding: 12px 16px; font-size: 13px; vertical-align: middle; }
        .list-thumb { width: 72px; height: 52px; border-radius: 8px; object-fit: cover; }
        .list-thumb-empty { width: 72px; height: 52px; border-radius: 8px; background: #ede8e0; display: inline-flex; align-items: center; justify-content: center; color: #ccc; font-size: 10px; }
        .td-bien-title { font-weight: 600; color: #1a1210; display: block; margin-bottom: 2px; }
        .td-bien-quartier { font-size: 11px; color: #b0a898; display: block; }
        .td-prix { font-weight: 700; font-size: 15px; letter-spacing: -0.01em; white-space: nowrap; }
        .td-loyer { color: #555; white-space: nowrap; }
        .td-loyer.nc { color: #c0b0a0; font-style: italic; }
        .td-strat { display: inline-block; font-size: 11px; font-weight: 600; color: #2a4a8a; background: #d4ddf5; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
        .td-btn { display: inline-block; padding: 7px 16px; background: #1a1210; color: #fff; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 500; white-space: nowrap; transition: opacity 0.15s; }
        .td-btn:hover { opacity: 0.75; }
      `}</style>

      <div className="main">
        <div className="filter-bar">

          <div className="filter-group">
            <label className="filter-label">Stratégie MDB ✦</label>
            <select
              value={strategie}
              onChange={e => setStrategie(e.target.value)}
              className={!strategie ? 'required' : ''}
            >
              <option value="">-- Choisir une stratégie --</option>
              {strategies.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="filter-sep" />

          <div className="filter-group">
            <label className="filter-label">Métropole</label>
            <select value={metropole} onChange={e => { setMetropole(e.target.value); setVille('Toutes') }}>
              <option>Toutes</option>
              {metropoles.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          {villes.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Ville</label>
              <select value={ville} onChange={e => setVille(e.target.value)}>
                <option>Toutes</option>
                {villes.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label className="filter-label">Type de bien</label>
            <select value={typeBien} onChange={e => setTypeBien(e.target.value)}>
              {TYPES_BIEN.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="filter-sep" />

          <div className="filter-group">
            <label className="filter-label">Prix minimum</label>
            <input type="number" placeholder="ex: 80000" value={prixMin} onChange={e => setPrixMin(e.target.value)} />
          </div>

          <div className="filter-group">
            <label className="filter-label">Prix maximum</label>
            <input type="number" placeholder="ex: 200000" value={prixMax} onChange={e => setPrixMax(e.target.value)} />
          </div>

          <div className="filter-group">
            <label className="filter-label">Rendement minimum</label>
            <input type="number" placeholder="ex: 5" value={rendMin} onChange={e => setRendMin(e.target.value)} />
          </div>

          <div className="filter-sep" />

          <div className="filter-group">
            <label className="filter-label">Trier par</label>
            <select value={tri} onChange={e => setTri(e.target.value)}>
              {TRIS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="view-toggle">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>⊞ Grille</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>☰ Liste</button>
          </div>
        </div>

        {/* Compteur ou message vide */}
        {!strategie ? (
          <div className="empty-state">
            <h3>Choisissez une stratégie pour commencer</h3>
            <p>Sélectionnez une stratégie MDB dans le filtre ci-dessus pour afficher les biens correspondants.</p>
          </div>
        ) : (
          <>
            <div className="results-bar">
              <p className="results-count">
                <strong>{filtered.length}</strong> bien{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
                {strategie && <> · {strategie}</>}
                {metropole !== 'Toutes' && <> · {metropole}</>}
                {ville !== 'Toutes' && <> · {ville}</>}
                {typeBien !== 'Tous' && <> · {typeBien}</>}
              </p>
            </div>

            {loading ? (
              <p style={{ color: '#9a8a80', textAlign: 'center', padding: '80px' }}>Chargement...</p>
            ) : view === 'grid' ? (

              <div className="grid">
                {filtered.map(bien => <BienCard key={bien.id} bien={bien} />)}
              </div>

            ) : (

              <table className="list-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}></th>
                    <th>Bien</th>
                    <th>Commune</th>
                    <th>Métropole</th>
                    <th>Stratégie</th>
                    <th>Prix FAI</th>
                    <th>Loyer</th>
                    <th>Rendement</th>
                    <th>Prix/m²</th>
                    <th>Locataire</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(bien => (
                    <tr key={bien.id}>
                      <td>
                        {bien.photo_url
                          ? <img src={bien.photo_url} alt="" className="list-thumb" />
                          : <div className="list-thumb-empty">—</div>
                        }
                      </td>
                      <td>
                        <span className="td-bien-title">{bien.type_bien} {bien.nb_pieces} · {bien.surface} m²</span>
                        {bien.quartier && <span className="td-bien-quartier">{bien.quartier}</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{bien.ville}</td>
                      <td><MetroBadge metropole={bien.metropole} /></td>
                      <td>
                        {bien.strategie_mdb && <span className="td-strat">{bien.strategie_mdb}</span>}
                      </td>
                      <td className="td-prix">{formatPrix(bien.prix_fai)}</td>
                      <td className={`td-loyer ${!bien.loyer ? 'nc' : ''}`}>
                        {bien.loyer ? `${bien.loyer} €/mois` : 'NC'}
                      </td>
                      <td><RendementBadge rendement={bien.rendement_brut} size="sm" /></td>
                      <td style={{ color: '#9a8a80' }}>{bien.prix_m2 ? `${bien.prix_m2} €/m²` : '—'}</td>
                      <td style={{ color: '#9a8a80', fontSize: '12px' }}>{bien.profil_locataire || '—'}</td>
                      <td><a href={`/biens/${bien.id}`} className="td-btn">Analyse →</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}