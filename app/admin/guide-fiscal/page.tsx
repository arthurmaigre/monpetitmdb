'use client'

import Layout from '@/components/Layout'

export default function GuideFiscalPage() {
  return (
    <Layout>
      <style>{`
        .gf-wrap {
          max-width: 960px;
          margin: 48px auto;
          padding: 0 48px;
          font-family: 'DM Sans', sans-serif;
          color: #1a1210;
        }
        .gf-back {
          display: inline-block;
          margin-bottom: 24px;
          font-size: 13px;
          color: #7a6a60;
          text-decoration: none;
        }
        .gf-back:hover { color: #1a1210; }
        .gf-page-title {
          font-family: 'Fraunces', serif;
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
          color: #1a1210;
        }
        .gf-page-subtitle {
          font-size: 15px;
          color: #7a6a60;
          margin-bottom: 48px;
          line-height: 1.5;
        }

        /* Sections */
        .gf-section {
          margin-bottom: 48px;
        }
        .gf-section-tag {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #7a6a60;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }
        .gf-section-title {
          font-family: 'Fraunces', serif;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #1a1210;
        }
        .gf-text {
          font-size: 14px;
          line-height: 1.7;
          color: #1a1210;
          margin-bottom: 16px;
        }
        .gf-text strong { font-weight: 600; }

        /* Tables */
        .gf-table-wrap {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          margin-bottom: 20px;
        }
        .gf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .gf-table thead tr {
          background: #1a1210;
        }
        .gf-table th {
          padding: 12px 16px;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .gf-table tbody tr {
          border-bottom: 1px solid #f0ede8;
        }
        .gf-table tbody tr:last-child {
          border-bottom: none;
        }
        .gf-table tbody tr:hover {
          background: #faf8f5;
        }
        .gf-table td {
          padding: 10px 16px;
          vertical-align: middle;
          line-height: 1.5;
        }
        .gf-table td:first-child {
          font-weight: 500;
        }

        /* Callouts */
        .gf-callout {
          border-radius: 10px;
          padding: 14px 18px;
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 16px;
          border-left: 4px solid;
        }
        .gf-callout strong { font-weight: 600; }
        .gf-callout-info {
          background: #eaf2fb;
          border-color: #2980b9;
          color: #1a3a5c;
        }
        .gf-callout-warning {
          background: #fef9e7;
          border-color: #f39c12;
          color: #5a4200;
        }
        .gf-callout-danger {
          background: #fdedec;
          border-color: #e74c3c;
          color: #5a1a1a;
        }
        .gf-callout-success {
          background: #eafaf1;
          border-color: #27ae60;
          color: #1a4a2a;
        }

        /* Lists */
        .gf-list {
          font-size: 14px;
          line-height: 1.8;
          padding-left: 20px;
          margin-bottom: 16px;
          color: #1a1210;
        }
        .gf-list li { margin-bottom: 4px; }
        .gf-list-label { font-weight: 600; }

        /* Divider */
        .gf-divider {
          border: none;
          border-top: 1px solid #e8e2d8;
          margin: 48px 0;
        }

        /* Responsive */
        @media (max-width: 767px) {
          .gf-wrap { padding: 0 16px; margin: 24px auto; }
          .gf-page-title { font-size: 24px; }
          .gf-section-title { font-size: 18px; }
          .gf-table-wrap { overflow-x: auto; }
        }
      `}</style>

      <div className="gf-wrap">
        <a href="/admin" className="gf-back">{"← Retour au dashboard"}</a>

        <h1 className="gf-page-title">{"Guide fiscal de r\u00E9f\u00E9rence"}</h1>
        <p className="gf-page-subtitle">
          {"R\u00E9f\u00E9rentiel fiscal interne Mon Petit MDB \u2014 mis \u00E0 jour mars 2026. Cadre l\u00E9gislatif post-LFI 2025."}
        </p>

        {/* ======== §0 — Hypothèses communes ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A70"}</span>
          <h2 className="gf-section-title">{"Hypoth\u00E8ses communes"}</h2>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Param\u00E8tre"}</th>
                  <th>Valeur</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{"TMI (tranche marginale d\u2019imposition)"}</td><td>30 %</td></tr>
                <tr><td>{"Pr\u00E9l\u00E8vements sociaux (PS)"}</td><td>17,2 %</td></tr>
                <tr><td>{"Cr\u00E9dit immobilier"}</td><td>{"3,5 % / 20 ans / apport 20 %"}</td></tr>
                <tr><td>{"Frais de notaire \u2014 ancien"}</td><td>7,5 %</td></tr>
                <tr><td>{"Frais de notaire \u2014 MdB"}</td><td>2,5 %</td></tr>
                <tr><td>{"IS (imp\u00F4t sur les soci\u00E9t\u00E9s)"}</td><td>{"15 % jusqu\u2019\u00E0 42 500\u00A0\u20AC, puis 25 %"}</td></tr>
                <tr><td>{"Flat tax (PFU)"}</td><td>{"30 % (12,8 % IR + 17,2 % PS)"}</td></tr>
                <tr><td>TVA</td><td>20 %</td></tr>
                <tr><td>{"TVA travaux r\u00E9novation l\u00E9g\u00E8re"}</td><td>10 %</td></tr>
                <tr><td>{"TVA travaux r\u00E9novation lourde"}</td><td>20 %</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §A — Abattements PV particuliers ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A7A"}</span>
          <h2 className="gf-section-title">{"Abattements plus-value \u2014 particuliers"}</h2>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Dur\u00E9e de d\u00E9tention"}</th>
                  <th>Abattement IR</th>
                  <th>Abattement PS</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>0 - 5 ans</td><td>0 %</td><td>0 %</td></tr>
                <tr><td>{"6\u00E8me \u00E0 21\u00E8me ann\u00E9e"}</td><td>6 % / an</td><td>1,65 % / an</td></tr>
                <tr><td>{"22\u00E8me ann\u00E9e"}</td><td>4 %</td><td>1,6 %</td></tr>
                <tr><td>{"> 22 ans"}</td><td>{"Exon\u00E9ration totale IR"}</td><td>{"Non exon\u00E9r\u00E9"}</td></tr>
                <tr><td>{"23\u00E8me \u00E0 30\u00E8me ann\u00E9e"}</td><td>{"\u2014"}</td><td>9 % / an</td></tr>
                <tr><td>{"> 30 ans"}</td><td>{"\u2014"}</td><td>{"Exon\u00E9ration totale"}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="gf-callout gf-callout-warning">
            <strong>{"Surtaxe PV > 50\u00A0000\u00A0\u20AC"}</strong>{" \u2014 Surtaxe progressive de 2 % \u00E0 6 % applicable sur les plus-values immobili\u00E8res nettes sup\u00E9rieures \u00E0 50\u00A0000\u00A0\u20AC (apr\u00E8s abattement pour dur\u00E9e de d\u00E9tention)."}
          </div>

          <div className="gf-callout gf-callout-danger">
            <strong>{"R\u00E9forme LFI 2025 \u2014 LMNP"}</strong>{" \u2014 Depuis le 1er mars 2025, les amortissements d\u00E9duits en LMNP sont r\u00E9int\u00E9gr\u00E9s dans la base de calcul de la plus-value \u00E0 la revente. Cela augmente significativement la PV imposable pour les d\u00E9tenteurs en LMNP."}
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §1 — Nu Micro-foncier ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A71"}</span>
          <h2 className="gf-section-title">Nu Micro-foncier</h2>

          <div className="gf-callout gf-callout-info">
            <strong>Conditions</strong>{" \u2014 Revenus fonciers bruts \u2264 15\u00A0000\u00A0\u20AC / an. Le bailleur ne doit pas d\u00E9tenir de parts de SCPI ou SCI soumises au r\u00E9gime r\u00E9el."}
          </div>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Param\u00E8tre"}</th>
                  <th>Valeur</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Abattement forfaitaire</td><td>30 %</td></tr>
                <tr><td>Base imposable</td><td>{"70 % des loyers bruts"}</td></tr>
                <tr><td>Imposition</td><td>{"TMI + 17,2 % PS"}</td></tr>
                <tr><td>{"Charges d\u00E9ductibles"}</td><td>{"Aucune (l\u2019abattement couvre tout)"}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §2 — Nu Réel foncier ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A72"}</span>
          <h2 className="gf-section-title">{"Nu R\u00E9el foncier"}</h2>

          <p className="gf-text">
            {"Le r\u00E9gime r\u00E9el permet de d\u00E9duire les charges r\u00E9elles des revenus fonciers. Obligatoire au-del\u00E0 de 15\u00A0000\u00A0\u20AC de revenus fonciers, ou sur option (engagement 3 ans)."}
          </p>

          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            {"Charges d\u00E9ductibles"}
          </h3>
          <ul className="gf-list">
            <li><span className="gf-list-label">{"Int\u00E9r\u00EAts d\u2019emprunt"}</span>{" \u2014 int\u00E9r\u00EAts + frais de dossier + assurance emprunteur"}</li>
            <li><span className="gf-list-label">Assurance PNO</span>{" \u2014 propri\u00E9taire non occupant"}</li>
            <li><span className="gf-list-label">{"Taxe fonci\u00E8re"}</span>{" \u2014 hors taxe d\u2019ordures m\u00E9nag\u00E8res"}</li>
            <li><span className="gf-list-label">{"Charges de copropri\u00E9t\u00E9"}</span>{" \u2014 part d\u00E9ductible (hors travaux)"}</li>
            <li><span className="gf-list-label">Gestion locative</span>{" \u2014 honoraires agence ou 20\u00A0\u20AC/an forfait"}</li>
            <li><span className="gf-list-label">{"Travaux d\u2019entretien / am\u00E9lioration"}</span>{" \u2014 remise en \u00E9tat, am\u00E9lioration du confort"}</li>
            <li><span className="gf-list-label">{"Comptabilit\u00E9 / OGA"}</span>{" \u2014 frais d\u2019adh\u00E9sion organisme de gestion agr\u00E9\u00E9"}</li>
          </ul>

          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            {"NON d\u00E9ductible"}
          </h3>
          <ul className="gf-list">
            <li>Amortissement du bien ({"r\u00E9serv\u00E9 au BIC / IS"})</li>
            <li>{"Travaux de construction / agrandissement / reconstruction"}</li>
          </ul>

          <div className="gf-callout gf-callout-success">
            <strong>{"D\u00E9ficit foncier"}</strong>{" \u2014 Jusqu\u2019\u00E0 10\u00A0700\u00A0\u20AC / an imputable sur le revenu global. L\u2019exc\u00E9dent est reportable sur les revenus fonciers des 10 ann\u00E9es suivantes. Obligation de maintien en location 3 ans apr\u00E8s imputation."}
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §3 — LMNP Micro-BIC ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A73"}</span>
          <h2 className="gf-section-title">LMNP Micro-BIC</h2>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Param\u00E8tre"}</th>
                  <th>{"Location meubl\u00E9e classique"}</th>
                  <th>{"Meubl\u00E9 tourisme non class\u00E9 (LFI 2025)"}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Abattement</td><td>50 %</td><td>30 %</td></tr>
                <tr><td>Plafond recettes</td><td>{"77\u00A0700\u00A0\u20AC"}</td><td>{"15\u00A0000\u00A0\u20AC"}</td></tr>
                <tr><td>Imposition</td><td>TMI + 17,2 % PS</td><td>TMI + 17,2 % PS</td></tr>
              </tbody>
            </table>
          </div>

          <div className="gf-callout gf-callout-warning">
            <strong>Modification LFI 2025</strong>{" \u2014 Les meubl\u00E9s de tourisme non class\u00E9s voient leur abattement r\u00E9duit de 50 % \u00E0 30 % et leur plafond abaiss\u00E9 \u00E0 15\u00A0000\u00A0\u20AC (contre 77\u00A0700\u00A0\u20AC auparavant)."}
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §4 — LMNP Réel BIC ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A74"}</span>
          <h2 className="gf-section-title">{"LMNP R\u00E9el BIC"}</h2>

          <p className="gf-text">
            {"Le r\u00E9gime r\u00E9el BIC permet d\u2019amortir le bien par composants et de d\u00E9duire l\u2019ensemble des charges r\u00E9elles. Le d\u00E9ficit BIC non professionnel n\u2019est reportable que sur les BIC non professionnels (10 ans)."}
          </p>

          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            Amortissement par composants
          </h3>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Composant</th>
                  <th>Quote-part</th>
                  <th>{"Dur\u00E9e"}</th>
                  <th>{"Amortissement / an"}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Structure / gros {"oeuvre"}</td><td>40 %</td><td>50 ans</td><td>0,80 %</td></tr>
                <tr><td>{"Fa\u00E7ades"}</td><td>10 %</td><td>30 ans</td><td>0,33 %</td></tr>
                <tr><td>Toiture</td><td>10 %</td><td>25 ans</td><td>0,40 %</td></tr>
                <tr><td>{"Second oeuvre (plomberie, \u00E9lectricit\u00E9\u2026)"}</td><td>25 %</td><td>15 ans</td><td>1,67 %</td></tr>
                <tr><td>{"\u00C9quipements (cuisine, SdB\u2026)"}</td><td>15 %</td><td>10 ans</td><td>1,50 %</td></tr>
              </tbody>
            </table>
          </div>

          <div className="gf-callout gf-callout-info">
            <strong>{"Ordre de grandeur"}</strong>{" \u2014 Environ 4\u00A0700\u00A0\u20AC / an d\u2019amortissement pour 100\u00A0000\u00A0\u20AC de valeur b\u00E2ti (hors terrain, non amortissable)."}
          </div>

          <div className="gf-callout gf-callout-danger">
            <strong>{"R\u00E9forme LFI 2025"}</strong>{" \u2014 R\u00E9int\u00E9gration des amortissements d\u00E9duits dans le calcul de la plus-value \u00E0 la revente. La PV taxable sera calcul\u00E9e sur la base de la VNC (valeur nette comptable) et non du prix d\u2019acquisition."}
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §5 — LMP Réel BIC ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A75"}</span>
          <h2 className="gf-section-title">{"LMP R\u00E9el BIC"}</h2>

          <div className="gf-callout gf-callout-info">
            <strong>{"Conditions LMP"}</strong>{" \u2014 Recettes locatives > 23\u00A0000\u00A0\u20AC / an ET sup\u00E9rieures aux autres revenus professionnels du foyer fiscal."}
          </div>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Caract\u00E9ristique"}</th>
                  <th>{"D\u00E9tail"}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{"D\u00E9ficit"}</td><td>{"Imputable sur le revenu global (sans limitation de montant)"}</td></tr>
                <tr><td>Plus-value</td><td>{"PV professionnelle (court terme / long terme)"}</td></tr>
                <tr><td>{"Exon\u00E9ration PV"}</td><td>{"Totale si recettes < 90\u00A0000\u00A0\u20AC + 5 ans d\u2019activit\u00E9 (art. 151 septies CGI)"}</td></tr>
                <tr><td>Cotisations sociales</td><td>{"SSI (ex-RSI) ~45 % sur le b\u00E9n\u00E9fice"}</td></tr>
                <tr><td>Amortissement</td><td>{"Oui, m\u00EAmes r\u00E8gles que LMNP r\u00E9el"}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §6 — SCI à l'IS ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A76"}</span>
          <h2 className="gf-section-title">{"SCI \u00E0 l\u2019IS"}</h2>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Caract\u00E9ristique"}</th>
                  <th>{"D\u00E9tail"}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>{"Imp\u00F4t sur les b\u00E9n\u00E9fices"}</td><td>{"IS : 15 % jusqu\u2019\u00E0 42\u00A0500\u00A0\u20AC, puis 25 %"}</td></tr>
                <tr><td>Amortissement</td><td>{"Oui, par composants (m\u00EAme grille que LMNP)"}</td></tr>
                <tr><td>Plus-value</td><td>{"Calcul\u00E9e sur la VNC (valeur nette comptable)"}</td></tr>
                <tr><td>{"Abattement dur\u00E9e de d\u00E9tention"}</td><td>{"Aucun (r\u00E9gime des PV professionnelles)"}</td></tr>
                <tr><td>Distribution dividendes</td><td>{"Flat tax 30 % (ou bar\u00E8me + abattement 40 % sur option)"}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="gf-callout gf-callout-warning">
            <strong>Double imposition</strong>{" \u2014 Les b\u00E9n\u00E9fices sont tax\u00E9s \u00E0 l\u2019IS au niveau de la SCI, puis les dividendes distribu\u00E9s sont tax\u00E9s \u00E0 la flat tax (30 %) au niveau de l\u2019associ\u00E9. La charge fiscale totale effective peut atteindre 47-53 %."}
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §7 — Marchand de biens IS ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A77"}</span>
          <h2 className="gf-section-title">Marchand de biens IS</h2>

          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>{"Caract\u00E9ristique"}</th>
                  <th>{"D\u00E9tail"}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Statut des biens</td><td>{"Stocks (pas d\u2019immobilisations) \u2014 pas d\u2019amortissement"}</td></tr>
                <tr><td>{"DMTO (droits de mutation)"}</td><td>{"R\u00E9duits \u00E0 0,715 % (engagement de revente sous 5 ans)"}</td></tr>
                <tr><td>TVA sur marge</td><td>{"Marge \u00D7 20/120 (TVA incluse dans le prix de vente)"}</td></tr>
                <tr><td>{"Imp\u00F4t"}</td><td>{"IS : 15 % jusqu\u2019\u00E0 42\u00A0500\u00A0\u20AC, puis 25 %"}</td></tr>
                <tr><td>Charges sociales</td><td>{"Pas de cotisations sociales sur l\u2019activit\u00E9 (SAS/SASU)"}</td></tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            {"Les 3 cas TVA"}
          </h3>
          <div className="gf-table-wrap">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Cas</th>
                  <th>Assiette TVA</th>
                  <th>{"D\u00E9tail"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{"Ancien (pas de travaux lourds)"}</td>
                  <td>TVA sur marge</td>
                  <td>{"(Prix de vente - Prix d\u2019achat) \u00D7 20/120"}</td>
                </tr>
                <tr>
                  <td>{"Neuf (< 5 ans ou VEFA)"}</td>
                  <td>TVA sur prix total</td>
                  <td>{"Prix de vente HT \u00D7 20 %"}</td>
                </tr>
                <tr>
                  <td>{"R\u00E9novation lourde (immeuble neuf fiscal)"}</td>
                  <td>TVA sur prix total</td>
                  <td>{"Travaux affectant fondations, fa\u00E7ade, planchers ou +50 % \u00E9l\u00E9ments second oeuvre"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <hr className="gf-divider" />

        {/* ======== §8 — Tableau comparatif ======== */}
        <section className="gf-section">
          <span className="gf-section-tag">{"\u00A78"}</span>
          <h2 className="gf-section-title">{"Tableau comparatif \u2014 7 r\u00E9gimes"}</h2>

          <div className="gf-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="gf-table" style={{ minWidth: '900px' }}>
              <thead>
                <tr>
                  <th>{"R\u00E9gime"}</th>
                  <th>{"Type location"}</th>
                  <th>{"D\u00E9duction charges"}</th>
                  <th>Amortissement</th>
                  <th>{"Fiscalit\u00E9 revenus"}</th>
                  <th>{"Fiscalit\u00E9 PV"}</th>
                  <th>{"Cotisations"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Micro-foncier</strong></td>
                  <td>Nu</td>
                  <td>Abattement 30 %</td>
                  <td>Non</td>
                  <td>TMI + PS</td>
                  <td>{"PV particuli\u00E8re + abattements"}</td>
                  <td>Aucune</td>
                </tr>
                <tr>
                  <td><strong>{"R\u00E9el foncier"}</strong></td>
                  <td>Nu</td>
                  <td>{"Charges r\u00E9elles"}</td>
                  <td>Non</td>
                  <td>{"TMI + PS (d\u00E9ficit 10\u00A0700\u00A0\u20AC)"}</td>
                  <td>{"PV particuli\u00E8re + abattements"}</td>
                  <td>Aucune</td>
                </tr>
                <tr>
                  <td><strong>LMNP Micro-BIC</strong></td>
                  <td>{"Meubl\u00E9"}</td>
                  <td>Abattement 50 %</td>
                  <td>Non</td>
                  <td>TMI + PS</td>
                  <td>{"PV particuli\u00E8re + abattements*"}</td>
                  <td>Aucune</td>
                </tr>
                <tr>
                  <td><strong>{"LMNP R\u00E9el"}</strong></td>
                  <td>{"Meubl\u00E9"}</td>
                  <td>{"Charges r\u00E9elles"}</td>
                  <td>Oui</td>
                  <td>TMI seul</td>
                  <td>{"PV particuli\u00E8re + r\u00E9int\u00E9gration amort.*"}</td>
                  <td>Aucune</td>
                </tr>
                <tr>
                  <td><strong>{"LMP R\u00E9el"}</strong></td>
                  <td>{"Meubl\u00E9"}</td>
                  <td>{"Charges r\u00E9elles"}</td>
                  <td>Oui</td>
                  <td>{"TMI + PS (d\u00E9ficit illimit\u00E9)"}</td>
                  <td>{"PV pro (exo possible)"}</td>
                  <td>SSI ~45 %</td>
                </tr>
                <tr>
                  <td><strong>{"SCI \u00E0 l\u2019IS"}</strong></td>
                  <td>Nu ou {"meubl\u00E9"}</td>
                  <td>{"Charges r\u00E9elles"}</td>
                  <td>Oui</td>
                  <td>IS 15/25 %</td>
                  <td>{"PV sur VNC + flat tax div."}</td>
                  <td>Aucune</td>
                </tr>
                <tr>
                  <td><strong>MdB IS</strong></td>
                  <td>Revente</td>
                  <td>{"Charges r\u00E9elles"}</td>
                  <td>{"Non (stocks)"}</td>
                  <td>IS 15/25 %</td>
                  <td>{"Stock \u2014 pas de PV immo"}</td>
                  <td>{"Aucune (SAS)"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="gf-callout gf-callout-warning">
            <strong>{"* R\u00E9forme LFI 2025"}</strong>{" \u2014 Depuis le 1er mars 2025, les amortissements d\u00E9duits en LMNP (r\u00E9el et micro-BIC) sont r\u00E9int\u00E9gr\u00E9s dans le calcul de la PV \u00E0 la revente. Ce changement affecte directement la rentabilit\u00E9 nette \u00E0 la sortie."}
          </div>

          <div className="gf-callout gf-callout-info">
            <strong>{"Sources"}</strong>{" \u2014 BOFiP, Code g\u00E9n\u00E9ral des imp\u00F4ts (CGI), Loi de finances initiale 2025, Service-Public.fr. Donn\u00E9es \u00E0 jour mars 2026."}
          </div>
        </section>
      </div>
    </Layout>
  )
}
