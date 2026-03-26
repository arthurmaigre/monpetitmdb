'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'

export default function StrategiesPage() {
  const [activeSection, setActiveSection] = useState('s1')

  useEffect(() => {
    const blocks = ['s1', 's2', 's3', 's4']
    function onScroll() {
      let current = 's1'
      for (const id of blocks) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < 200) current = id
      }
      setActiveSection(current)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 130, behavior: 'smooth' })
  }

  return (
    <Layout>
      <style>{`
        /* INTRO */
        .strat-intro { max-width: 1200px; margin: 0 auto; padding: 80px 64px 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: end; }
        .strat-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #c0392b; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .strat-eyebrow::before { content: ''; width: 24px; height: 2px; background: #c0392b; }
        .strat-intro h1 { font-family: 'Fraunces', serif; font-size: 52px; font-weight: 800; line-height: 1.08; letter-spacing: -0.03em; color: #1a1210; }
        .strat-intro-right p { font-size: 17px; color: #7a6a60; line-height: 1.75; margin-bottom: 28px; }
        .strat-intro-right p strong { color: #1a1210; font-weight: 600; }
        .intro-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .intro-stat { background: #fff; border: 1px solid #e8e2d8; border-radius: 12px; padding: 16px 20px; }
        .intro-stat-n { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; color: #1a1210; }
        .intro-stat-n span { color: #c0392b; }
        .intro-stat-l { font-size: 12px; color: #7a6a60; margin-top: 2px; }

        /* NAV */
        .strat-nav { border-top: 1px solid #e8e2d8; border-bottom: 1px solid #e8e2d8; background: #fff; position: sticky; top: 64px; z-index: 90; }
        .strat-nav-inner { max-width: 1200px; margin: 0 auto; padding: 0 64px; display: flex; gap: 0; }
        .strat-nav-btn { padding: 16px 24px; font-size: 14px; font-weight: 500; color: #7a6a60; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 150ms ease; margin-bottom: -1px; white-space: nowrap; }
        .strat-nav-btn:hover { color: #1a1210; }
        .strat-nav-btn.active { color: #1a1210; font-weight: 600; border-bottom-color: #c0392b; }

        /* BLOCKS */
        .strategies-wrap { max-width: 1200px; margin: 0 auto; padding: 0 64px 100px; }
        .strategy-block { padding: 72px 0; border-bottom: 1px solid #e8e2d8; }
        .strategy-block:last-child { border-bottom: none; }

        .strategy-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; gap: 20px; flex-wrap: wrap; }
        .strategy-title { font-family: 'Fraunces', serif; font-size: 36px; font-weight: 800; letter-spacing: -0.02em; color: #1a1210; margin-bottom: 4px; }
        .strategy-subtitle { font-size: 15px; color: #7a6a60; }
        .strategy-badge { padding: 6px 16px; border-radius: 100px; font-size: 12px; font-weight: 600; white-space: nowrap; background: #f0ede8; color: #7a6a60; border: 1px solid #e8e2d8; }

        .strategy-body { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }

        .strategy-desc { font-size: 16px; color: #4a3f3b; line-height: 1.8; margin-bottom: 28px; }
        .strategy-desc strong { color: #1a1210; }

        /* METRICS */
        .metrics-row { display: flex; gap: 16px; margin-bottom: 32px; }
        .metric { background: #fff; border: 1px solid #e8e2d8; border-radius: 12px; padding: 16px 20px; flex: 1; }
        .metric-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #7a6a60; margin-bottom: 8px; }
        .metric-value { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 800; color: #1a1210; }
        .metric-value.positive { color: #1a7a40; }
        .metric-value.accent { color: #c0392b; }
        .metric-sub { font-size: 11px; color: #7a6a60; margin-top: 2px; }

        /* PROS/CONS */
        .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
        .pros, .cons { background: #fff; border: 1px solid #e8e2d8; border-radius: 14px; padding: 24px; }
        .pros-title, .cons-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
        .pros-title { color: #1a7a40; }
        .cons-title { color: #c0392b; }
        .pros ul, .cons ul { list-style: none; }
        .pros li, .cons li { display: flex; gap: 10px; font-size: 13px; color: #4a3f3b; padding: 7px 0; border-bottom: 1px solid #f0ede8; line-height: 1.5; }
        .pros li:last-child, .cons li:last-child { border-bottom: none; }
        .pro-dot, .con-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
        .pro-dot { background: #1a7a40; }
        .con-dot { background: #c0392b; }

        /* EXAMPLE */
        .example-block { background: #1a1210; border-radius: 14px; padding: 28px; color: #fff; margin-bottom: 20px; }
        .example-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .example-sub { font-size: 12px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 24px; }
        .example-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
        .example-row:last-child { border-bottom: none; }
        .example-label { color: rgba(255,255,255,0.5); }
        .example-val { font-weight: 600; color: #fff; }
        .example-val.green { color: #5dca9a; }
        .example-val.red { color: #f09595; }
        .example-val.big { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 800; }

        /* FISCAL */
        .fiscal-block { background: #fff; border: 1px solid #e8e2d8; border-radius: 14px; padding: 28px; }
        .fiscal-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; margin-bottom: 6px; }
        .fiscal-sub { font-size: 13px; color: #7a6a60; margin-bottom: 20px; }
        .fiscal-regimes { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .fiscal-regime { padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1.5px solid #e8e2d8; background: #f7f4f0; color: #4a3f3b; }
        .fiscal-regime.highlight { background: #1a1210; color: #fff; border-color: #1a1210; }
        .fiscal-note { font-size: 13px; color: #7a6a60; line-height: 1.65; padding-top: 16px; border-top: 1px solid #f0ede8; }
        .fiscal-note strong { color: #1a1210; }

        /* CHECKLIST */
        .checklist { background: #fff; border: 1px solid #e8e2d8; border-radius: 14px; padding: 28px; }
        .checklist-title { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 700; margin-bottom: 16px; }
        .checklist ul { list-style: none; }
        .checklist li { display: flex; gap: 12px; font-size: 13px; color: #4a3f3b; padding: 9px 0; border-bottom: 1px solid #f0ede8; line-height: 1.5; }
        .checklist li:last-child { border-bottom: none; }
        .check-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; background: #f0ede8; color: #7a6a60; }
        .checklist li strong { color: #1a1210; }

        /* CTA */
        .strat-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 28px; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 150ms ease; background: #1a1210; color: #fff; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .strat-cta:hover { opacity: 0.85; }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .strat-intro { grid-template-columns: 1fr; gap: 40px; padding: 60px 32px 48px; }
          .strategy-body { grid-template-columns: 1fr; }
          .metrics-row { flex-wrap: wrap; }
          .metric { min-width: calc(50% - 8px); }
          .pros-cons { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .strat-intro { padding: 40px 24px 32px; }
          .strat-intro h1 { font-size: 36px; }
          .intro-stats { grid-template-columns: 1fr; }
          .strat-nav-inner { padding: 0 24px; overflow-x: auto; }
          .strat-nav-btn { padding: 12px 16px; font-size: 13px; }
          .strategies-wrap { padding: 0 24px 64px; }
          .strategy-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .strategy-title { font-size: 28px; }
          .strategy-badge { justify-self: flex-start; }
          .metrics-row { flex-direction: column; }
          .metric { min-width: 100%; }
        }
      `}</style>

      {/* INTRO */}
      <div className="strat-intro">
        <div>
          <div className="strat-eyebrow">{"M\u00E9thodologie MDB"}</div>
          <h1>{"4 fa\u00E7ons d\u2019investir comme un marchand de biens"}</h1>
        </div>
        <div className="strat-intro-right">
          <p>
            {"Mon Petit MDB vous d\u00E9mocratise les diff\u00E9rentes "}
            <strong>{"strat\u00E9gies marchand de biens"}</strong>
            {" et met \u00E0 votre disposition tous les outils n\u00E9cessaires \u00E0 vos analyses : estimation DVF, simulation fiscale sur 5 r\u00E9gimes, sc\u00E9nario de revente."}
          </p>
          <div className="intro-stats">
            <div className="intro-stat">
              <div className="intro-stat-n">90 000<span>+</span></div>
              <div className="intro-stat-l">{"Biens analys\u00E9s en France"}</div>
            </div>
            <div className="intro-stat">
              <div className="intro-stat-n">22</div>
              <div className="intro-stat-l">{"M\u00E9tropoles couvertes"}</div>
            </div>
            <div className="intro-stat">
              <div className="intro-stat-n">5</div>
              <div className="intro-stat-l">{"R\u00E9gimes fiscaux simul\u00E9s"}</div>
            </div>
            <div className="intro-stat">
              <div className="intro-stat-n">60<span>+</span></div>
              <div className="intro-stat-l">{"Plateformes agr\u00E9g\u00E9es"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div className="strat-nav">
        <div className="strat-nav-inner">
          <button className={`strat-nav-btn ${activeSection === 's1' ? 'active' : ''}`} onClick={() => scrollToSection('s1')}>Locataire en place</button>
          <button className={`strat-nav-btn ${activeSection === 's2' ? 'active' : ''}`} onClick={() => scrollToSection('s2')}>Travaux lourds</button>
          <button className={`strat-nav-btn ${activeSection === 's3' ? 'active' : ''}`} onClick={() => scrollToSection('s3')}>Immeuble de rapport</button>
          <button className={`strat-nav-btn ${activeSection === 's4' ? 'active' : ''}`} onClick={() => scrollToSection('s4')}>{"Revente \u00E0 la d\u00E9coupe"}</button>
        </div>
      </div>

      <div className="strategies-wrap">

        {/* STRATÉGIE 1 — LOCATAIRE EN PLACE */}
        <div className="strategy-block" id="s1">
          <div className="strategy-header">
            <div>
              <div className="strategy-title">Locataire en place</div>
              <div className="strategy-subtitle">{"Cash-flow imm\u00E9diat d\u00E8s le premier mois"}</div>
            </div>
            <span className="strategy-badge">{"Recommand\u00E9 d\u00E9butants"}</span>
          </div>

          <div className="strategy-body">
            <div>
              <p className="strategy-desc">
                {"Un bien occup\u00E9 par un locataire en cours de bail. L\u2019objectif est double : acheter \u00E0 un prix o\u00F9 le "}
                <strong>{"cashflow brut est \u00E0 l\u2019\u00E9quilibre"}</strong>
                {" et r\u00E9aliser une "}
                <strong>{"plus-value \u00E0 la revente"}</strong>
                {". La d\u00E9cote li\u00E9e \u00E0 l\u2019occupation permet souvent de n\u00E9gocier 10 \u00E0 20 % en dessous de la valeur libre."}
              </p>
              <p className="strategy-desc">
                {"Mon Petit MDB calcule le "}
                <strong>prix cible</strong>
                {" (prix d\u2019\u00E9quilibre du cashflow), analyse le profil du locataire (statut, anciennet\u00E9), la date de fin de bail, le loyer HC et compare avec l\u2019estimation march\u00E9 DVF pour d\u00E9tecter les bonnes affaires."}
              </p>

              <div className="metrics-row">
                <div className="metric">
                  <div className="metric-label">Objectif cashflow</div>
                  <div className="metric-value positive">5 %</div>
                  <div className="metric-sub">Rendement brut minimum</div>
                </div>
                <div className="metric">
                  <div className="metric-label">{"D\u00E9cote moyenne"}</div>
                  <div className="metric-value positive">-12 %</div>
                  <div className="metric-sub">{"Plus-value potentielle \u00E0 la revente"}</div>
                </div>
              </div>

              <div className="pros-cons">
                <div className="pros">
                  <div className="pros-title">Avantages</div>
                  <ul>
                    <li><span className="pro-dot" /><span>{"Revenus locatifs d\u00E8s le 1er mois"}</span></li>
                    <li><span className="pro-dot" /><span>{"D\u00E9cote 10-20 % = plus-value latente"}</span></li>
                    <li><span className="pro-dot" /><span>{"Prix cible calcul\u00E9 automatiquement"}</span></li>
                    <li><span className="pro-dot" /><span>{"Risque locatif d\u00E9j\u00E0 connu"}</span></li>
                  </ul>
                </div>
                <div className="cons">
                  <div className="cons-title">Points de vigilance</div>
                  <ul>
                    <li><span className="con-dot" /><span>{"Locataire non choisi par vous"}</span></li>
                    <li><span className="con-dot" /><span>{"Bail en cours non r\u00E9siliable"}</span></li>
                    <li><span className="con-dot" /><span>{"Loyer parfois sous le march\u00E9"}</span></li>
                    <li><span className="con-dot" /><span>{"Bien difficile \u00E0 visiter en d\u00E9tail"}</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="example-block">
                <div className="example-title">{"Cas pratique \u2014 Nantes T2"}</div>
                <div className="example-sub">Locataire CDI depuis 3 ans</div>
                <div className="example-row"><span className="example-label">Prix FAI</span><span className="example-val">177 500 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Estimation DVF</span><span className="example-val green">204 800 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Loyer mensuel</span><span className="example-val">750 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">{"Charges copro"}</span><span className="example-val red">-120 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">{"Taxe fonci\u00E8re"}</span><span className="example-val red">-85 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">{"Mensualit\u00E9 cr\u00E9dit (20 ans)"}</span><span className="example-val red">-986 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">{"Prix cible (\u00E9quilibre cashflow)"}</span><span className="example-val green">152 340 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Plus-value brute</span><span className="example-val big green">+52 460 {'\u20AC'}</span></div>
              </div>

              <div className="fiscal-block">
                <div className="fiscal-title">{"R\u00E9gimes fiscaux compatibles"}</div>
                <div className="fiscal-sub">{"5 r\u00E9gimes simul\u00E9s sur Mon Petit MDB"}</div>
                <div className="fiscal-regimes">
                  <span className="fiscal-regime highlight">Micro-foncier</span>
                  <span className="fiscal-regime">{"R\u00E9el"}</span>
                  <span className="fiscal-regime">LMNP</span>
                  <span className="fiscal-regime">SCI IS</span>
                  <span className="fiscal-regime">Marchand de biens</span>
                </div>
                <div className="fiscal-note">
                  <strong>Micro-foncier</strong>{" : abattement 30 %, simple jusqu\u2019\u00E0 15 000 \u20AC de revenus. "}
                  <strong>{"R\u00E9gime r\u00E9el"}</strong>{" : d\u00E9duction des int\u00E9r\u00EAts, charges, travaux. "}
                  <strong>LMNP</strong>{" : amortissement du bien sur 25-30 ans si meubl\u00E9. "}
                  <strong>MdB</strong>{" : IS 15/25 % + TVA sur marge, frais notaire r\u00E9duits 2,5 %."}
                </div>
              </div>
            </div>
          </div>
          <a href="/biens" className="strat-cta">{"Voir les biens Locataire en place \u2192"}</a>
        </div>

        {/* STRATÉGIE 2 — TRAVAUX LOURDS */}
        <div className="strategy-block" id="s2">
          <div className="strategy-header">
            <div>
              <div className="strategy-title">Travaux lourds</div>
              <div className="strategy-subtitle">{"D\u00E9cote maximale, valorisation apr\u00E8s r\u00E9novation"}</div>
            </div>
            <span className="strategy-badge">{"Interm\u00E9diaire"}</span>
          </div>

          <div className="strategy-body">
            <div>
              <p className="strategy-desc">
                {"Un bien d\u00E9grad\u00E9 ou \u00E0 r\u00E9nover enti\u00E8rement, vendu avec une "}
                <strong>{"forte d\u00E9cote"}</strong>
                {" par rapport au march\u00E9. L\u2019estimation DVF donne le "}
                <strong>{"prix apr\u00E8s r\u00E9novation"}</strong>
                {" (en bon \u00E9tat) \u2014 l\u2019\u00E9cart avec le prix FAI repr\u00E9sente votre marge potentielle."}
              </p>
              <p className="strategy-desc">
                {"Notre IA attribue un "}
                <strong>{"score travaux de 1 \u00E0 5"}</strong>
                {" \u00E0 chaque bien en analysant l\u2019ensemble des photos, la description de l\u2019annonce et le DPE. 1 = rafra\u00EEchissement, 5 = r\u00E9habilitation compl\u00E8te. Le budget travaux est estim\u00E9 selon notre appr\u00E9ciation du prix au m\u00B2 par score \u2014 vous pouvez l\u2019affiner selon votre grille personnalis\u00E9e dans votre profil."}
              </p>

              <div className="metrics-row">
                <div className="metric">
                  <div className="metric-label">{"Plus-value cible"}</div>
                  <div className="metric-value positive">15-30 %</div>
                  <div className="metric-sub">{"Apr\u00E8s r\u00E9novation"}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Score travaux IA</div>
                  <div className="metric-value">1 {'\u00E0'} 5</div>
                  <div className="metric-sub">{"Analys\u00E9 par Claude Haiku"}</div>
                </div>
              </div>

              <div className="checklist">
                <div className="checklist-title">{"Ce qu\u2019il faut v\u00E9rifier avant d\u2019acheter"}</div>
                <ul>
                  <li>
                    <span className="check-num">1</span>
                    <div><strong>Devis entreprises</strong>{" \u2014 Obtenir 3 devis fermes avant de signer. Les travaux sont toujours sous-estim\u00E9s de 20 \u00E0 30 %."}</div>
                  </li>
                  <li>
                    <span className="check-num">2</span>
                    <div><strong>Structure et toiture</strong>{" \u2014 Fissures portantes, charpente, humidit\u00E9. Ce sont les postes qui explosent les budgets."}</div>
                  </li>
                  <li>
                    <span className="check-num">3</span>
                    <div><strong>{"Copropri\u00E9t\u00E9"}</strong>{" \u2014 V\u00E9rifier les travaux vot\u00E9s et les appels de fonds \u00E0 venir dans le PV d\u2019AG."}</div>
                  </li>
                  <li>
                    <span className="check-num">4</span>
                    <div><strong>PLU et permis</strong>{" \u2014 V\u00E9rifier la faisabilit\u00E9 des travaux envisag\u00E9s aupr\u00E8s de la mairie."}</div>
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <div className="example-block">
                <div className="example-title">{"Cas pratique \u2014 Lyon Studio"}</div>
                <div className="example-sub">Score travaux 4/5</div>
                <div className="example-row"><span className="example-label">{"Prix FAI (d\u00E9grad\u00E9)"}</span><span className="example-val">67 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">{"Budget travaux estim\u00E9"}</span><span className="example-val red">-28 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">{"Co\u00FBt total"}</span><span className="example-val">95 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">{"Estimation DVF (bon \u00E9tat)"}</span><span className="example-val green">125 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Plus-value brute</span><span className="example-val big green">+30 000 {'\u20AC'}</span></div>
              </div>

              <div className="fiscal-block">
                <div className="fiscal-title">{"R\u00E9gimes fiscaux compatibles"}</div>
                <div className="fiscal-sub">{"D\u00E9ficit foncier ou amortissement selon le r\u00E9gime"}</div>
                <div className="fiscal-regimes">
                  <span className="fiscal-regime highlight">{"R\u00E9el (d\u00E9ficit foncier)"}</span>
                  <span className="fiscal-regime">LMNP</span>
                  <span className="fiscal-regime">SCI IS</span>
                  <span className="fiscal-regime">Marchand de biens</span>
                </div>
                <div className="fiscal-note">
                  {"Les travaux sont "}
                  <strong>{"d\u00E9ductibles du revenu foncier"}</strong>
                  {" en r\u00E9gime r\u00E9el (d\u00E9ficit foncier de 10 700 \u20AC/an imputable sur le revenu global). En "}
                  <strong>LMNP</strong>
                  {", l\u2019amortissement du bien r\u00E9nov\u00E9 peut effacer la fiscalit\u00E9 pendant 10-15 ans. En "}
                  <strong>MdB</strong>
                  {", pas d\u2019amortissement (biens = stock) mais IS 15/25 % + frais notaire r\u00E9duits."}
                </div>
              </div>
            </div>
          </div>
          <a href="/biens" className="strat-cta">{"Voir les biens Travaux lourds \u2192"}</a>
        </div>

        {/* STRATÉGIE 3 — DIVISION */}
        <div className="strategy-block" id="s3">
          <div className="strategy-header">
            <div>
              <div className="strategy-title">Immeuble de rapport</div>
              <div className="strategy-subtitle">{"Diviser pour multiplier les loyers"}</div>
            </div>
            <span className="strategy-badge">{"Avanc\u00E9"}</span>
          </div>

          <div className="strategy-body">
            <div>
              <p className="strategy-desc">
                {"Transformer un grand appartement ou une maison en "}
                <strong>{"plusieurs lots ind\u00E9pendants"}</strong>
                {" avec entr\u00E9es s\u00E9par\u00E9es. Chaque lot est lou\u00E9 s\u00E9par\u00E9ment. Un T5 divis\u00E9 en 3 studios g\u00E9n\u00E8re 2 \u00E0 3 fois le loyer initial."}
              </p>
              <p className="strategy-desc">
{"Strat\u00E9gie plus complexe : permis de construire ou d\u00E9claration pr\u00E9alable, accord copropri\u00E9t\u00E9, ma\u00EEtrise des co\u00FBts de transformation. Mon Petit MDB identifie les biens divisibles en analysant pour vous toutes les annonces disponibles sur plus de 60 plateformes immobili\u00E8res."}
              </p>

              <div className="metrics-row">
                <div className="metric">
                  <div className="metric-label">Rendement cible</div>
                  <div className="metric-value positive">7 %+</div>
                  <div className="metric-sub">Post-division</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Multiplication loyer</div>
                  <div className="metric-value">x2 {'\u00E0'} x3</div>
                  <div className="metric-sub">Vs. lot unique</div>
                </div>
              </div>

              <div className="pros-cons">
                <div className="pros">
                  <div className="pros-title">Avantages</div>
                  <ul>
                    <li><span className="pro-dot" /><span>{"Rendement locatif d\u00E9multipli\u00E9"}</span></li>
                    <li><span className="pro-dot" /><span>{"Risque locatif mutualis\u00E9"}</span></li>
                    <li><span className="pro-dot" /><span>Valorisation importante du bien</span></li>
                    <li><span className="pro-dot" /><span>{"Optimisation de l\u2019espace existant"}</span></li>
                  </ul>
                </div>
                <div className="cons">
                  <div className="cons-title">Contraintes</div>
                  <ul>
                    <li><span className="con-dot" /><span>Autorisations urbanistiques requises</span></li>
                    <li><span className="con-dot" /><span>{"Budget travaux \u00E9lev\u00E9"}</span></li>
                    <li><span className="con-dot" /><span>{"Gestion locative plus complexe"}</span></li>
                    <li><span className="con-dot" /><span>{"R\u00E8glement copropri\u00E9t\u00E9 \u00E0 v\u00E9rifier"}</span></li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="example-block">
                <div className="example-title">{"Cas pratique \u2014 Maison T5 Rennes"}</div>
                <div className="example-sub">Division en 3 studios</div>
                <div className="example-row"><span className="example-label">Prix FAI</span><span className="example-val">280 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Travaux division</span><span className="example-val red">-45 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">{"Loyer T5 d\u2019origine"}</span><span className="example-val">900 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">{"3 studios apr\u00E8s division"}</span><span className="example-val green">2 100 {'\u20AC'}/mois</span></div>
                <div className="example-row"><span className="example-label">Rendement brut</span><span className="example-val big green">7.7 %</span></div>
              </div>

              <div className="checklist">
                <div className="checklist-title">{"Les \u00E9tapes cl\u00E9s"}</div>
                <ul>
                  <li><span className="check-num">1</span><div>{"V\u00E9rifier le PLU : zone, COS, r\u00E8gles de division parcellaire"}</div></li>
                  <li><span className="check-num">2</span><div>{"Obtenir l\u2019accord de l\u2019assembl\u00E9e g\u00E9n\u00E9rale si copropri\u00E9t\u00E9"}</div></li>
                  <li><span className="check-num">3</span><div>{"D\u00E9poser la d\u00E9claration pr\u00E9alable ou permis de construire"}</div></li>
                  <li><span className="check-num">4</span><div>{"Cr\u00E9er des entr\u00E9es ind\u00E9pendantes avec compteurs s\u00E9par\u00E9s"}</div></li>
                </ul>
              </div>
            </div>
          </div>
          <a href="/biens" className="strat-cta">{"Voir les biens Immeuble de rapport \u2192"}</a>
        </div>

        {/* STRATÉGIE 4 — DÉCOUPE */}
        <div className="strategy-block" id="s4">
          <div className="strategy-header">
            <div>
              <div className="strategy-title">{"Revente \u00E0 la d\u00E9coupe"}</div>
              <div className="strategy-subtitle">{"Acheter un immeuble entier, revendre lot par lot"}</div>
            </div>
            <span className="strategy-badge" style={{ background: '#f5e6e4', color: '#96281b', borderColor: '#e8ccc8' }}>Expert MDB</span>
          </div>

          <div className="strategy-body">
            <div>
              <p className="strategy-desc">
                {"La strat\u00E9gie la plus proche du "}
                <strong>{"marchand de biens professionnel"}</strong>
                {". Acheter un immeuble entier en monopropri\u00E9t\u00E9 et revendre lot par lot. La marge vient de l\u2019\u00E9cart entre le prix global et la somme des prix de vente individuels."}
              </p>
              <p className="strategy-desc">
                {"Le marchand de biens est "}
                <strong>{"toujours \u00E0 l\u2019IS"}</strong>
                {" (jamais \u00E0 l\u2019IR). Pas d\u2019amortissement car les biens sont du stock. TVA sur marge de 20 %, frais notaire r\u00E9duits \u00E0 2,5 % avec engagement de revente sous 5 ans."}
              </p>

              <div className="metrics-row">
                <div className="metric">
                  <div className="metric-label">Marge brute cible</div>
                  <div className="metric-value positive">15-25 %</div>
                  <div className="metric-sub">{"Avant IS"}</div>
                </div>
                <div className="metric">
                  <div className="metric-label">Capital minimum</div>
                  <div className="metric-value">100 k{'\u20AC'}+</div>
                  <div className="metric-sub">{"Recommand\u00E9"}</div>
                </div>
              </div>

              <div className="fiscal-block">
                <div className="fiscal-title">{"Fiscalit\u00E9 marchand de biens"}</div>
                <div className="fiscal-sub">{"IS + TVA sur marge \u2014 Structure d\u00E9di\u00E9e"}</div>
                <div className="fiscal-regimes">
                  <span className="fiscal-regime highlight">IS 15 % / 25 %</span>
                  <span className="fiscal-regime">TVA sur marge 20 %</span>
                  <span className="fiscal-regime">{"Frais notaire r\u00E9duits 2,5 %"}</span>
                </div>
                <div className="fiscal-note">
                  {"L\u2019IS \u00E0 15 % s\u2019applique sur les premiers 42 500 \u20AC de b\u00E9n\u00E9fice, 25 % au-del\u00E0. La "}
                  <strong>TVA sur marge</strong>
                  {" = 20 % sur (prix de vente - prix d\u2019achat). Pas de charges sociales, pas d\u2019amortissement (biens = stock). Le b\u00E9n\u00E9fice reste dans la soci\u00E9t\u00E9."}
                </div>
              </div>
            </div>

            <div>
              <div className="example-block">
                <div className="example-title">{"Cas pratique \u2014 Immeuble Toulouse"}</div>
                <div className="example-sub">{"6 lots \u00B7 D\u00E9coupe compl\u00E8te"}</div>
                <div className="example-row"><span className="example-label">Prix acquisition global</span><span className="example-val">580 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Frais notaire (2,5 %)</span><span className="example-val red">-14 500 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">{"Travaux remise en \u00E9tat"}</span><span className="example-val red">-60 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Revente 6 lots</span><span className="example-val green">+780 000 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">TVA sur marge (20 %)</span><span className="example-val red">-33 333 {'\u20AC'}</span></div>
                <div className="example-row"><span className="example-label">Marge nette avant IS</span><span className="example-val big green">+92 167 {'\u20AC'}</span></div>
              </div>

              <div className="checklist">
                <div className="checklist-title">{"Conditions pour r\u00E9ussir"}</div>
                <ul>
                  <li><span className="check-num">1</span><div>{"Cr\u00E9er la copropri\u00E9t\u00E9 et le r\u00E8glement avec un g\u00E9om\u00E8tre-expert"}</div></li>
                  <li><span className="check-num">2</span><div>{"Engagement de revente notari\u00E9 pour frais r\u00E9duits (2,5 %)"}</div></li>
                  <li><span className="check-num">3</span><div>{"S\u2019entourer d\u2019un fiscaliste sp\u00E9cialis\u00E9 pour la TVA sur marge"}</div></li>
                  <li><span className="check-num">4</span><div>{"Respecter le d\u00E9lai de revente de 5 ans"}</div></li>
                </ul>
              </div>
            </div>
          </div>
          <a href="/biens" className="strat-cta">{"Voir les biens Revente \u00E0 la d\u00E9coupe \u2192"}</a>
        </div>

      </div>
    </Layout>
  )
}
