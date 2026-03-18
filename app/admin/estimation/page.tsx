'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

function Section({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 700, color: '#1a1210', marginBottom: '8px' }}>{title}</h2>
      {description && <p style={{ fontSize: '13px', color: '#9a8a80', lineHeight: '1.6', marginBottom: '20px' }}>{description}</p>}
      {children}
    </div>
  )
}

function ParamRow({ label, description, value, onChange, type = 'number', step = '0.01', suffix = '' }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 0', borderBottom: '1px solid #f0ede8' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210' }}>{label}</div>
        {description && <div style={{ fontSize: '11px', color: '#b0a898', marginTop: '2px' }}>{description}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type={type}
          step={step}
          value={value}
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          style={{ width: '90px', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', textAlign: 'right', outline: 'none', background: '#faf8f5' }}
          onFocus={e => e.target.style.borderColor = '#c0392b'}
          onBlur={e => e.target.style.borderColor = '#e8e2d8'}
        />
        {suffix && <span style={{ fontSize: '12px', color: '#9a8a80' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function CorrectionTable({ title, corrections, onChange, description }: { title: string, corrections: Record<string, number>, onChange: (key: string, val: number) => void, description?: string }) {
  const entries = Object.entries(corrections).filter(([k]) => k !== 'description')
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>{title}</h3>
      {description && <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px', lineHeight: '1.5' }}>{description}</p>}
      <div style={{ background: '#faf8f5', borderRadius: '10px', padding: '12px 16px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #ede8e0' }}>
            <span style={{ fontSize: '13px', color: '#1a1210', fontWeight: 500 }}>{key}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                step="0.01"
                value={typeof val === 'number' ? val : ''}
                onChange={e => onChange(key, Number(e.target.value))}
                style={{ width: '80px', padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '12px', textAlign: 'right', outline: 'none', background: '#fff' }}
                onFocus={e => e.target.style.borderColor = '#c0392b'}
                onBlur={e => e.target.style.borderColor = '#e8e2d8'}
              />
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', minWidth: '45px', textAlign: 'center',
                background: (typeof val === 'number' && val >= 1) ? '#d4f5e0' : '#fde8e8',
                color: (typeof val === 'number' && val >= 1) ? '#1a7a40' : '#c0392b'
              }}>
                {typeof val === 'number' ? `${val >= 1 ? '+' : ''}${Math.round((val - 1) * 100)}%` : '-'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminEstimationPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      setToken(session.access_token)
      const res = await fetch('/api/admin/estimation', { headers: { Authorization: `Bearer ${session.access_token}` } })
      if (res.status === 403) { window.location.href = '/biens'; return }
      const data = await res.json()
      setConfig(data.config)
      setLoading(false)
    }
    load()
  }, [])

  function updateConfig(path: string[], value: any) {
    setConfig((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev))
      let obj = next
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
      obj[path[path.length - 1]] = value
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSuccess(false)
    const res = await fetch('/api/admin/estimation', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ config })
    })
    if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  if (loading) return <Layout><p style={{ textAlign: 'center', padding: '80px', color: '#9a8a80' }}>Chargement...</p></Layout>

  const c = config?.correcteurs || {}

  return (
    <Layout>
      <style>{`
        .estim-wrap { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
        .estim-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .estim-sub { font-size: 14px; color: #9a8a80; margin-bottom: 32px; line-height: 1.6; }
        .save-bar { position: sticky; bottom: 0; background: rgba(242,236,228,0.96); backdrop-filter: blur(12px); border-top: 1px solid #e8e2d8; padding: 16px 0; display: flex; align-items: center; gap: 12px; justify-content: flex-end; z-index: 10; }
        .save-btn { padding: 12px 32px; border-radius: 10px; border: none; background: #c0392b; color: #fff; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .save-btn:hover { opacity: 0.85; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .method-block { background: #f7f4f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
        .method-title { font-size: 12px; font-weight: 700; color: #9a8a80; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .method-text { font-size: 13px; color: #555; line-height: 1.6; }
        .method-formula { font-family: 'SF Mono', 'Fira Code', monospace; background: #1a1210; color: #e8e2d8; padding: 12px 16px; border-radius: 8px; font-size: 12px; line-height: 1.6; margin: 10px 0; overflow-x: auto; }
      `}</style>

      <div className="estim-wrap">
        <a href="/admin" style={{ fontSize: '13px', color: '#9a8a80', textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>{"← Retour admin"}</a>
        <h1 className="estim-title">{"Moteur d'estimation DVF"}</h1>
        <p className="estim-sub">
          {"Configuration compl\u00e8te de la m\u00e9thode d'estimation immobili\u00e8re. Tous les param\u00e8tres sont modifiables et appliqu\u00e9s en temps r\u00e9el sur les nouvelles estimations."}
        </p>

        {success && <div style={{ background: '#d4f5e0', color: '#1a7a40', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{"Configuration sauvegard\u00e9e !"}</div>}

        {/* ════════ METHODE GENERALE ════════ */}
        <Section title={"M\u00e9thode g\u00e9n\u00e9rale"} description={"Architecture en 3 couches pour une estimation fiable et transparente."}>
          <div className="method-block">
            <div className="method-title">Couche 1 — Base statistique DVF</div>
            <div className="method-text">{"R\u00e9cup\u00e9ration des transactions notariales r\u00e9elles (DVF) dans un rayon adaptatif autour du bien. Calcul de la m\u00e9diane pond\u00e9r\u00e9e temporellement du prix au m\u00b2."}</div>
          </div>
          <div className="method-block">
            <div className="method-title">Couche 2 — Correcteurs qualitatifs</div>
            <div className="method-text">{"Application de multiplicateurs bas\u00e9s sur les caract\u00e9ristiques du bien : \u00e9tage, DPE, ext\u00e9rieur, \u00e9tat, etc. Chaque correcteur est document\u00e9 et ajustable."}</div>
          </div>
          <div className="method-block">
            <div className="method-title">Couche 3 — Niveau de confiance</div>
            <div className="method-text">{"Score de confiance (A \u00e0 D) bas\u00e9 sur le nombre de comparables, la pr\u00e9cision de l'adresse et les variables qualitatives disponibles."}</div>
          </div>
          <div className="method-formula">
            {"Prix_estim\u00e9 = Surface \u00d7 M\u00e9diane_DVF(€/m\u00b2) \u00d7 \u220f(Correcteurs)\n"}
            {"Fourchette  = Prix_estim\u00e9 \u00b1 Marge_confiance(%)"}
          </div>
        </Section>

        {/* ════════ PERIODES ════════ */}
        <Section title={"P\u00e9riodes d'analyse"} description={config?.periodes?.description}>
          <ParamRow
            label={"P\u00e9riode principale — Ann\u00e9e min"}
            description={"Ann\u00e9e de d\u00e9but des transactions analys\u00e9es"}
            value={config?.periodes?.principale?.annee_min || 2022}
            onChange={(v: number) => updateConfig(['periodes', 'principale', 'annee_min'], v)}
            step="1"
          />
          <ParamRow
            label={"R\u00e9f\u00e9rence pr\u00e9-COVID — Ann\u00e9e min"}
            description={"D\u00e9but de la p\u00e9riode de r\u00e9f\u00e9rence avant la hausse COVID"}
            value={config?.periodes?.reference_pre_covid?.annee_min || 2018}
            onChange={(v: number) => updateConfig(['periodes', 'reference_pre_covid', 'annee_min'], v)}
            step="1"
          />
          <ParamRow
            label={"R\u00e9f\u00e9rence pr\u00e9-COVID — Ann\u00e9e max"}
            description={"Fin de la p\u00e9riode pr\u00e9-COVID"}
            value={config?.periodes?.reference_pre_covid?.annee_max || 2020}
            onChange={(v: number) => updateConfig(['periodes', 'reference_pre_covid', 'annee_max'], v)}
            step="1"
          />
          <ParamRow
            label={"Lambda (d\u00e9croissance temporelle)"}
            description={"Plus lambda est \u00e9lev\u00e9, plus les transactions anciennes p\u00e8sent peu. 0.04 = transaction \u00e0 12 mois vaut 62% d'une transaction r\u00e9cente"}
            value={config?.periodes?.decay_lambda || 0.04}
            onChange={(v: number) => updateConfig(['periodes', 'decay_lambda'], v)}
            step="0.005"
          />
        </Section>

        {/* ════════ RAYON DE RECHERCHE ════════ */}
        <Section title={"Rayon de recherche adaptatif"} description={config?.rayons_recherche?.description}>
          <ParamRow
            label={"Seuil minimum de transactions"}
            description={"Nombre minimum de transactions comparables avant d'arr\u00eater l'\u00e9largissement"}
            value={config?.rayons_recherche?.seuil_min_transactions || 10}
            onChange={(v: number) => updateConfig(['rayons_recherche', 'seuil_min_transactions'], v)}
            step="1"
          />
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#9a8a80', marginBottom: '8px' }}>{"ÉTAPES DU RAYON"}</div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {(config?.rayons_recherche?.etapes_metres_approx || [330, 550, 770, 1100]).map((m: number, i: number) => (
                <div key={i} style={{ background: '#faf8f5', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, color: '#1a1210' }}>
                  {`\u00c9tape ${i + 1} : ~${m}m`}
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ════════ FILTRES SURFACE ════════ */}
        <Section title={"Filtres de surface"} description={"Tol\u00e9rance de surface pour filtrer les transactions comparables."}>
          <ParamRow
            label="Appartement" description={"Tol\u00e9rance en %"} suffix="%"
            value={config?.filtres_surface?.appartement?.tolerance_pct || 30}
            onChange={(v: number) => updateConfig(['filtres_surface', 'appartement', 'tolerance_pct'], v)}
            step="5"
          />
          <ParamRow
            label="Maison" description={"Plus de variabilit\u00e9 entre maisons"} suffix="%"
            value={config?.filtres_surface?.maison?.tolerance_pct || 40}
            onChange={(v: number) => updateConfig(['filtres_surface', 'maison', 'tolerance_pct'], v)}
            step="5"
          />
          <ParamRow
            label="Studio" description={"Petites surfaces, peu de comparables"} suffix="%"
            value={config?.filtres_surface?.studio?.tolerance_pct || 50}
            onChange={(v: number) => updateConfig(['filtres_surface', 'studio', 'tolerance_pct'], v)}
            step="5"
          />
        </Section>

        {/* ════════ CORRECTEURS ════════ */}
        <Section title={"Correcteurs qualitatifs"} description={"Multiplicateurs appliqu\u00e9s au prix DVF de r\u00e9f\u00e9rence. 1.00 = neutre. > 1 = valorise. < 1 = d\u00e9cote."}>

          <CorrectionTable
            title={"\u00c9tage — Sans ascenseur"}
            corrections={c.etage_sans_ascenseur || {}}
            description={c.etage_sans_ascenseur?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'etage_sans_ascenseur', k], v)}
          />

          <CorrectionTable
            title={"\u00c9tage — Avec ascenseur"}
            corrections={c.etage_avec_ascenseur || {}}
            description={c.etage_avec_ascenseur?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'etage_avec_ascenseur', k], v)}
          />

          <CorrectionTable
            title={"DPE (Diagnostic de Performance \u00c9nerg\u00e9tique)"}
            corrections={c.dpe || {}}
            description={c.dpe?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'dpe', k], v)}
          />

          <CorrectionTable
            title={"Espaces ext\u00e9rieurs"}
            corrections={c.exterieur || {}}
            description={c.exterieur?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'exterieur', k], v)}
          />

          <CorrectionTable
            title={"Score travaux"}
            corrections={c.score_travaux || {}}
            description={c.score_travaux?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'score_travaux', k], v)}
          />

          <CorrectionTable
            title={"\u00c9tat du jardin (maisons)"}
            corrections={c.jardin_etat || {}}
            description={c.jardin_etat?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'jardin_etat', k], v)}
          />

          <CorrectionTable
            title={"Vue et exposition"}
            corrections={c.vue_exposition || {}}
            description={c.vue_exposition?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'vue_exposition', k], v)}
          />

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>Parking</h3>
            <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px' }}>{c.parking?.description}</p>
            <ParamRow
              label="Box ferm\u00e9" description={"Valeur absolue ajout\u00e9e"} suffix={"\u20AC"}
              value={c.parking?.box_ferme?.valeur_defaut || 18000}
              onChange={(v: number) => updateConfig(['correcteurs', 'parking', 'box_ferme', 'valeur_defaut'], v)}
              step="1000"
            />
            <ParamRow
              label="Parking ouvert" description={"D\u00e9cote ~45% vs box"} suffix={"\u20AC"}
              value={c.parking?.parking_ouvert?.valeur_defaut || 10000}
              onChange={(v: number) => updateConfig(['correcteurs', 'parking', 'parking_ouvert', 'valeur_defaut'], v)}
              step="1000"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>Piscine</h3>
            <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px' }}>{c.piscine?.description}</p>
            <ParamRow
              label="Grande ville" suffix={"\u20AC"}
              value={c.piscine?.grande_ville || 30000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'grande_ville'], v)}
              step="1000"
            />
            <ParamRow
              label="Ville moyenne" suffix={"\u20AC"}
              value={c.piscine?.ville_moyenne || 18000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'ville_moyenne'], v)}
              step="1000"
            />
            <ParamRow
              label="Zone rurale" suffix={"\u20AC"}
              value={c.piscine?.zone_rurale || 8000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'zone_rurale'], v)}
              step="1000"
            />
          </div>
        </Section>

        {/* ════════ CONFIANCE ════════ */}
        <Section title={"Niveaux de confiance"} description={config?.confiance?.description}>
          {['A', 'B', 'C', 'D'].map(level => {
            const conf = config?.confiance?.[level] || {}
            const colors: Record<string, { bg: string, color: string }> = {
              A: { bg: '#d4f5e0', color: '#1a7a40' },
              B: { bg: '#d4ddf5', color: '#2a4a8a' },
              C: { bg: '#fff8f0', color: '#a06010' },
              D: { bg: '#fde8e8', color: '#c0392b' },
            }
            const cl = colors[level]
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: '1px solid #f0ede8' }}>
                <span style={{ padding: '4px 14px', borderRadius: '20px', fontSize: '14px', fontWeight: 700, background: cl.bg, color: cl.color, minWidth: '30px', textAlign: 'center' }}>{level}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1210' }}>{`\u00b1${conf.marge_pct || 0}%`}</div>
                  <div style={{ fontSize: '11px', color: '#b0a898' }}>{conf.conditions}</div>
                </div>
                <input
                  type="number" step="1" value={conf.marge_pct || 0}
                  onChange={e => updateConfig(['confiance', level, 'marge_pct'], Number(e.target.value))}
                  style={{ width: '60px', padding: '5px 8px', borderRadius: '6px', border: '1.5px solid #e8e2d8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', textAlign: 'right', outline: 'none', background: '#faf8f5' }}
                  onFocus={e => e.target.style.borderColor = '#c0392b'}
                  onBlur={e => e.target.style.borderColor = '#e8e2d8'}
                />
                <span style={{ fontSize: '12px', color: '#9a8a80' }}>%</span>
              </div>
            )
          })}
        </Section>

        {/* ════════ BARRE DE SAUVEGARDE ════════ */}
        <div className="save-bar">
          <span style={{ fontSize: '12px', color: '#b0a898', marginRight: 'auto' }}>
            {"Les modifications s'appliquent aux prochaines estimations. Les estimations en cache (< 30j) ne sont pas recalcul\u00e9es."}
          </span>
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
