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

const LABEL_MAP: Record<string, string> = {
  '0': 'Rez-de-chauss\u00e9e',
  '1': '1er \u00e9tage',
  '2': '2\u00e8me \u00e9tage',
  '3': '3\u00e8me \u00e9tage',
  '4': '4\u00e8me \u00e9tage',
  '5+': '5\u00e8me \u00e9tage et plus',
  '2-3': '2\u00e8me - 3\u00e8me \u00e9tage',
  '4-5': '4\u00e8me - 5\u00e8me \u00e9tage',
  '6+': '6\u00e8me \u00e9tage et plus',
  'terrasse_grande': 'Terrasse (> 10 m\u00b2)',
  'balcon': 'Balcon',
  'jardin_privatif_appartement': 'Jardin privatif (appartement)',
  'loggia': 'Loggia',
  'aucun': 'Aucun acc\u00e8s ext\u00e9rieur',
  'soigne_sud': 'Soign\u00e9, expos\u00e9 sud',
  'standard': 'Standard',
  'a_amenager': '\u00c0 am\u00e9nager',
  'friche': 'En friche',
  'soigne': 'Soign\u00e9',
  'vue_degagee': 'Vue d\u00e9gag\u00e9e',
  'exposition_sud': 'Exposition sud',
  'vis_a_vis': 'Vis-\u00e0-vis',
  'cave': 'Cave',
  'cave_sous_sol': 'Cave / Sous-sol',
  'grenier_combles': 'Grenier / Combles am\u00e9nageables',
  'gardien': 'Gardien / Concierge',
  'double_vitrage': 'Double vitrage',
  'cuisine_equipee': 'Cuisine \u00e9quip\u00e9e',
  'plain_pied': 'Plain-pied',
  'assainissement_individuel': 'Assainissement individuel',
  'individuelle': 'Maison individuelle',
  'semi_mitoyen': 'Semi-mitoyenne',
  'mitoyen': 'Mitoyenne',
  'neuf': 'Neuf / Livr\u00e9 neuf',
  'refait_recemment': 'R\u00e9nov\u00e9 r\u00e9cemment',
  'bon_etat': 'Bon \u00e9tat',
  'correct': '\u00c9tat correct',
  'a_rafraichir': '\u00c0 rafra\u00eechir',
  'a_renover': '\u00c0 r\u00e9nover',
}

function CorrectionTable({ title, corrections, onChange, description, labelMap = true }: { title: string, corrections: Record<string, number>, onChange: (key: string, val: number) => void, description?: string, labelMap?: boolean }) {
  const entries = Object.entries(corrections).filter(([k]) => k !== 'description')
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>{title}</h3>
      {description && <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px', lineHeight: '1.5' }}>{description}</p>}
      <div style={{ background: '#faf8f5', borderRadius: '10px', padding: '12px 16px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #ede8e0' }}>
            <span style={{ fontSize: '13px', color: '#1a1210', fontWeight: 500 }}>{labelMap ? (LABEL_MAP[key] || key) : key}</span>
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

        {/* ════════ GEOLOCALISATION ════════ */}
        <Section title={"G\u00e9olocalisation du bien"} description={"La pr\u00e9cision de l'estimation d\u00e9pend directement de la pr\u00e9cision de la g\u00e9olocalisation. Plus l'adresse est pr\u00e9cise, plus le rayon de recherche DVF est pertinent."}>
          <div className="method-block">
            <div className="method-title">{"Niveau 1 \u2014 Coordonn\u00e9es Leboncoin (le plus pr\u00e9cis)"}</div>
            <div className="method-text">{"Leboncoin fournit parfois les coordonn\u00e9es GPS directement dans les donn\u00e9es de l'annonce. Ce sont les plus pr\u00e9cises car bas\u00e9es sur l'adresse exacte du bien."}</div>
          </div>
          <div className="method-block">
            <div className="method-title">{"Niveau 2 \u2014 G\u00e9ocodage par adresse (API BAN)"}</div>
            <div className="method-text">{"Si l'adresse pr\u00e9cise est disponible (rue + num\u00e9ro), elle est g\u00e9ocod\u00e9e via l'API BAN (Base Adresse Nationale). Pr\u00e9cision : \u00e0 l'immeuble pr\u00e8s. C'est le cas id\u00e9al pour une estimation de confiance A."}</div>
          </div>
          <div className="method-block">
            <div className="method-title">{"Niveau 3 \u2014 G\u00e9ocodage par ville + code postal (fallback)"}</div>
            <div className="method-text">{"Sans adresse pr\u00e9cise, le g\u00e9ocodage se fait au centre de la commune. Le rayon de recherche DVF est \u00e9largi pour compenser. Confiance C ou D maximum."}</div>
          </div>
        </Section>

        {/* ════════ PERIODES ════════ */}
        <Section title={"P\u00e9riodes d'analyse"}>
          <div className="method-block">
            <div className="method-title">{"Comment fonctionnent les p\u00e9riodes"}</div>
            <div className="method-text">
              {"Le moteur analyse les transactions DVF sur deux p\u00e9riodes compl\u00e9mentaires. La p\u00e9riode principale capture le march\u00e9 actuel. La p\u00e9riode de r\u00e9f\u00e9rence (2018-2020) sert de point de comparaison car les prix actuels sont revenus au niveau d'avant COVID, apr\u00e8s la correction de 2023-2025."}
            </div>
          </div>
          <div className="method-block">
            <div className="method-title">{"Coefficient de d\u00e9croissance temporelle (\u03bb)"}</div>
            <div className="method-text">
              {"Chaque transaction DVF re\u00e7oit un poids qui d\u00e9cro\u00eet avec son anciennet\u00e9 : poids = e^(-\u03bb \u00d7 mois). Plus \u03bb est \u00e9lev\u00e9, plus les transactions anciennes p\u00e8sent peu dans la m\u00e9diane. Ce coefficient s'applique \u00e0 toutes les transactions, quelle que soit la p\u00e9riode."}
            </div>
            <div className="method-formula">
              {"\u03bb = 0.04 → Transaction \u00e0 6 mois  = poids 0.79\n"}
              {"\u03bb = 0.04 → Transaction \u00e0 12 mois = poids 0.62\n"}
              {"\u03bb = 0.04 → Transaction \u00e0 24 mois = poids 0.38\n"}
              {"\u03bb = 0.04 → Transaction \u00e0 36 mois = poids 0.23"}
            </div>
          </div>
          <ParamRow
            label={"P\u00e9riode principale \u2014 Ann\u00e9e de d\u00e9but"}
            description={"Les transactions \u00e0 partir de cette ann\u00e9e sont analys\u00e9es en priorit\u00e9"}
            value={config?.periodes?.principale?.annee_min || 2022}
            onChange={(v: number) => updateConfig(['periodes', 'principale', 'annee_min'], v)}
            step="1"
          />
          <ParamRow
            label={"P\u00e9riode de r\u00e9f\u00e9rence \u2014 Ann\u00e9e de d\u00e9but"}
            description={"D\u00e9but de la p\u00e9riode pr\u00e9-COVID (prix de r\u00e9f\u00e9rence avant la hausse)"}
            value={config?.periodes?.reference_pre_covid?.annee_min || 2018}
            onChange={(v: number) => updateConfig(['periodes', 'reference_pre_covid', 'annee_min'], v)}
            step="1"
          />
          <ParamRow
            label={"P\u00e9riode de r\u00e9f\u00e9rence \u2014 Ann\u00e9e de fin"}
            description={"Fin de la p\u00e9riode pr\u00e9-COVID (avant la hausse de 2021)"}
            value={config?.periodes?.reference_pre_covid?.annee_max || 2020}
            onChange={(v: number) => updateConfig(['periodes', 'reference_pre_covid', 'annee_max'], v)}
            step="1"
          />
          <ParamRow
            label={"Coefficient de d\u00e9croissance (\u03bb)"}
            description={"0.04 = standard. Augmenter pour donner plus de poids aux transactions r\u00e9centes. Diminuer pour lisser sur une p\u00e9riode plus longue."}
            value={config?.periodes?.decay_lambda || 0.04}
            onChange={(v: number) => updateConfig(['periodes', 'decay_lambda'], v)}
            step="0.005"
          />
        </Section>

        {/* ════════ RAYON DE RECHERCHE ════════ */}
        <Section title={"Rayon de recherche adaptatif"} description={"Le moteur commence par chercher les transactions DVF dans un petit rayon autour du bien, puis \u00e9largit progressivement jusqu'\u00e0 trouver suffisamment de comparables."}>
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

        {/* ════════ CORRECTEURS COMMUNS ════════ */}
        <Section title={"Correcteurs communs (tous types)"} description={"Multiplicateurs appliqu\u00e9s au prix DVF de r\u00e9f\u00e9rence. 1.00 = neutre. > 1 = valorise. < 1 = d\u00e9cote."}>
          <CorrectionTable
            title={"DPE (Diagnostic de Performance \u00c9nerg\u00e9tique)"}
            corrections={c.dpe || {}}
            description={c.dpe?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'dpe', k], v)}
          />
          <CorrectionTable
            title={"Score travaux"}
            corrections={c.score_travaux || {}}
            description={"1 = \u00e9tat correct (r\u00e9f\u00e9rence). 5 = r\u00e9habilitation compl\u00e8te. D\u00e9cote progressive pour co\u00fbt des travaux."}
            onChange={(k, v) => updateConfig(['correcteurs', 'score_travaux', k], v)}
            labelMap={false}
          />
          <CorrectionTable
            title={"Vue et exposition"}
            corrections={c.vue_exposition || {}}
            description={c.vue_exposition?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'vue_exposition', k], v)}
          />
        </Section>

        {/* ════════ CORRECTEURS APPARTEMENT ════════ */}
        <Section title={"Correcteurs Appartement"} description={"Correcteurs sp\u00e9cifiques aux appartements et studios."}>
          <CorrectionTable
            title={"\u00c9tage sans ascenseur"}
            corrections={c.etage_sans_ascenseur || {}}
            description={"1er \u00e9tage = r\u00e9f\u00e9rence. La p\u00e9nibilit\u00e9 augmente avec les \u00e9tages sans ascenseur."}
            onChange={(k, v) => updateConfig(['correcteurs', 'etage_sans_ascenseur', k], v)}
          />
          <CorrectionTable
            title={"\u00c9tage avec ascenseur"}
            corrections={c.etage_avec_ascenseur || {}}
            description={"2-3\u00e8me = r\u00e9f\u00e9rence. Les \u00e9tages \u00e9lev\u00e9s sont valoris\u00e9s (vue, calme, luminosit\u00e9)."}
            onChange={(k, v) => updateConfig(['correcteurs', 'etage_avec_ascenseur', k], v)}
          />
          <CorrectionTable
            title={"Espaces ext\u00e9rieurs"}
            corrections={c.exterieur || {}}
            description={c.exterieur?.description}
            onChange={(k, v) => updateConfig(['correcteurs', 'exterieur', k], v)}
          />
          <CorrectionTable
            title={"Annexes et \u00e9quipements"}
            corrections={c.annexes_appartement || { cave: 1.02, grenier_combles: 1.03, gardien: 1.02, double_vitrage: 1.02, cuisine_equipee: 1.015 }}
            description={"D\u00e9tect\u00e9s par NLP sur la description de l'annonce."}
            onChange={(k, v) => updateConfig(['correcteurs', 'annexes_appartement', k], v)}
          />
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>Parking</h3>
            <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px' }}>{"Valeurs par d\u00e9faut. Les prix r\u00e9els par ville sont calcul\u00e9s automatiquement via DVF (table ref_prix_parking)."}</p>
            <ParamRow
              label={"Box ferm\u00e9"} description={"Valeur absolue par d\u00e9faut si pas de donn\u00e9es DVF locales"} suffix={"\u20AC"}
              value={c.parking?.box_ferme?.valeur_defaut || 18000}
              onChange={(v: number) => updateConfig(['correcteurs', 'parking', 'box_ferme', 'valeur_defaut'], v)}
              step="1000"
            />
            <ParamRow
              label={"Parking ouvert"} description={"D\u00e9cote ~45% par rapport au box ferm\u00e9"} suffix={"\u20AC"}
              value={c.parking?.parking_ouvert?.valeur_defaut || 10000}
              onChange={(v: number) => updateConfig(['correcteurs', 'parking', 'parking_ouvert', 'valeur_defaut'], v)}
              step="1000"
            />
          </div>
        </Section>

        {/* ════════ CORRECTEURS MAISON ════════ */}
        <Section title={"Correcteurs Maison"} description={"Correcteurs sp\u00e9cifiques aux maisons individuelles. Les correcteurs communs (DPE, travaux, vue, exposition) s'appliquent \u00e9galement."}>
          <CorrectionTable
            title={"\u00c9tat du jardin"}
            corrections={c.jardin_etat || {}}
            description={"D\u00e9tect\u00e9 par analyse de la description et des photos."}
            onChange={(k, v) => updateConfig(['correcteurs', 'jardin_etat', k], v)}
          />
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>Garage attenant</h3>
            <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px' }}>{"Valeur absolue ajout\u00e9e. Le garage attenant \u00e0 une maison est valoris\u00e9 diff\u00e9remment d'un box en copropri\u00e9t\u00e9. Prix par d\u00e9faut si pas de donn\u00e9es DVF locales."}</p>
            <ParamRow
              label={"Garage attenant"} description={"Valeur absolue par d\u00e9faut"} suffix={"\u20AC"}
              value={c.parking?.garage_attenant?.valeur_defaut || 15000}
              onChange={(v: number) => updateConfig(['correcteurs', 'parking', 'garage_attenant', 'valeur_defaut'], v)}
              step="1000"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1210', marginBottom: '4px' }}>Piscine</h3>
            <p style={{ fontSize: '11px', color: '#b0a898', marginBottom: '10px' }}>{"Valeur absolue ajout\u00e9e. Varie fortement selon la r\u00e9gion. Appliquer 60-70% en cas de doute."}</p>
            <ParamRow
              label={"Grande ville (Paris, Lyon, Marseille...)"} suffix={"\u20AC"}
              value={c.piscine?.grande_ville || 30000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'grande_ville'], v)}
              step="1000"
            />
            <ParamRow
              label={"Ville moyenne (Nantes, Rennes, Toulouse...)"} suffix={"\u20AC"}
              value={c.piscine?.ville_moyenne || 18000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'ville_moyenne'], v)}
              step="1000"
            />
            <ParamRow
              label={"Zone rurale / p\u00e9riurbaine"} suffix={"\u20AC"}
              value={c.piscine?.zone_rurale || 8000}
              onChange={(v: number) => updateConfig(['correcteurs', 'piscine', 'zone_rurale'], v)}
              step="1000"
            />
          </div>
          <CorrectionTable
            title={"Annexes et configuration"}
            corrections={c.annexes_maison || { cave_sous_sol: 1.03, grenier_combles: 1.04, plain_pied: 1.04, assainissement_individuel: 0.96 }}
            description={"D\u00e9tect\u00e9s par NLP sur la description."}
            onChange={(k, v) => updateConfig(['correcteurs', 'annexes_maison', k], v)}
          />
          <CorrectionTable
            title={"Mitoyennet\u00e9"}
            corrections={c.mitoyennete || { individuelle: 1.05, semi_mitoyen: 0.98, mitoyen: 0.93 }}
            description={"Impact fort sur le prix. Maison individuelle = premium. Mitoyenne = d\u00e9cote (bruit, intimit\u00e9)."}
            onChange={(k, v) => updateConfig(['correcteurs', 'mitoyennete', k], v)}
          />
          <div className="method-block">
            <div className="method-title">{"Terrain"}</div>
            <div className="method-text">{"La valorisation du terrain est calcul\u00e9e automatiquement via une r\u00e9gression logarithmique sur les transactions DVF de maisons dans la zone. Les premiers m\u00b2 valent plus que les suivants (valeur marginale d\u00e9croissante)."}</div>
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
