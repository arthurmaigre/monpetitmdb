import Layout from '@/components/Layout'

export default function PrivacyPage() {
  return (
    <Layout>
      <style>{`
        .privacy-wrap { max-width: 780px; margin: 48px auto; padding: 0 24px; }
        .privacy-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; color: #1a1210; }
        .privacy-date { font-size: 14px; color: #9a8a80; margin-bottom: 40px; }
        .privacy-section { margin-bottom: 32px; }
        .privacy-section h2 { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin-bottom: 12px; }
        .privacy-section p, .privacy-section li { font-size: 15px; color: #555; line-height: 1.7; margin-bottom: 8px; }
        .privacy-section ul { padding-left: 20px; margin-bottom: 12px; }
        .privacy-section a { color: #c0392b; text-decoration: underline; }
        @media (max-width: 768px) { .privacy-wrap { padding: 0 16px; margin: 24px auto; } .privacy-title { font-size: 24px; } }
      `}</style>

      <div className="privacy-wrap">
        <h1 className="privacy-title">{"Politique de confidentialit\u00E9"}</h1>
        <p className="privacy-date">{"Derni\u00E8re mise \u00E0 jour : 25 mars 2026"}</p>

        <div className="privacy-section">
          <h2>{"1. Responsable du traitement"}</h2>
          <p>Mon Petit MDB est un service de sourcing immobilier pour investisseurs particuliers.</p>
          <p>{"Pour toute question relative \u00E0 vos donn\u00E9es personnelles, contactez-nous \u00E0 : "}
            <a href="mailto:contact@monpetitmdb.fr">contact@monpetitmdb.fr</a>
          </p>
        </div>

        <div className="privacy-section">
          <h2>{"2. Donn\u00E9es collect\u00E9es"}</h2>
          <p>{"Nous collectons les donn\u00E9es suivantes :"}</p>
          <ul>
            <li><strong>{"Donn\u00E9es d\u2019inscription"}</strong>{" : adresse email, nom (si fourni via Google/Facebook)"}</li>
            <li><strong>{"Donn\u00E9es de profil"}</strong>{" : param\u00E8tres fiscaux, financement, charges (renseign\u00E9s volontairement)"}</li>
            <li><strong>{"Donn\u00E9es d\u2019utilisation"}</strong>{" : biens sauvegard\u00E9s en watchlist, statut de suivi"}</li>
            <li><strong>{"Donn\u00E9es de paiement"}</strong>{" : g\u00E9r\u00E9es par Stripe (nous ne stockons pas vos coordonn\u00E9es bancaires)"}</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>{"3. Finalit\u00E9s du traitement"}</h2>
          <ul>
            <li>{"Fournir l\u2019acc\u00E8s au service de sourcing immobilier"}</li>
            <li>{"Personnaliser les simulations fiscales et les analyses de rentabilit\u00E9"}</li>
            <li>{"G\u00E9rer votre abonnement et votre facturation"}</li>
            <li>{"Am\u00E9liorer le service et corriger les bugs"}</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>{"4. Base l\u00E9gale"}</h2>
          <p>{"Le traitement de vos donn\u00E9es repose sur :"}</p>
          <ul>
            <li><strong>{"L\u2019ex\u00E9cution du contrat"}</strong>{" : fourniture du service auquel vous avez souscrit"}</li>
            <li><strong>{"Votre consentement"}</strong>{" : pour la connexion via Google ou Facebook"}</li>
            <li><strong>{"L\u2019int\u00E9r\u00EAt l\u00E9gitime"}</strong>{" : am\u00E9lioration du service"}</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>{"5. Partage des donn\u00E9es"}</h2>
          <p>{"Vos donn\u00E9es ne sont jamais vendues. Elles sont partag\u00E9es uniquement avec :"}</p>
          <ul>
            <li><strong>Supabase</strong>{" : h\u00E9bergement de la base de donn\u00E9es (West EU / Irlande)"}</li>
            <li><strong>Stripe</strong>{" : gestion des paiements"}</li>
            <li><strong>Vercel</strong>{" : h\u00E9bergement du site"}</li>
            <li><strong>Anthropic (Claude)</strong>{" : assistant IA (les conversations ne sont pas stock\u00E9es)"}</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h2>{"6. Dur\u00E9e de conservation"}</h2>
          <p>{"Vos donn\u00E9es sont conserv\u00E9es tant que votre compte est actif. En cas de suppression de compte, vos donn\u00E9es sont effac\u00E9es sous 30 jours."}</p>
        </div>

        <div className="privacy-section">
          <h2>{"7. Vos droits (RGPD)"}</h2>
          <p>{"Conform\u00E9ment au R\u00E8glement G\u00E9n\u00E9ral sur la Protection des Donn\u00E9es, vous disposez des droits suivants :"}</p>
          <ul>
            <li><strong>{"Droit d\u2019acc\u00E8s"}</strong>{" : obtenir une copie de vos donn\u00E9es"}</li>
            <li><strong>{"Droit de rectification"}</strong>{" : corriger vos donn\u00E9es inexactes"}</li>
            <li><strong>{"Droit de suppression"}</strong>{" : demander l\u2019effacement de vos donn\u00E9es"}</li>
            <li><strong>{"Droit \u00E0 la portabilit\u00E9"}</strong>{" : recevoir vos donn\u00E9es dans un format structur\u00E9"}</li>
            <li><strong>{"Droit d\u2019opposition"}</strong>{" : vous opposer au traitement de vos donn\u00E9es"}</li>
          </ul>
          <p>{"Pour exercer ces droits, envoyez un email \u00E0 "}
            <a href="mailto:contact@monpetitmdb.fr">contact@monpetitmdb.fr</a>
            {" avec l\u2019objet \u00AB Demande RGPD \u00BB."}
          </p>
        </div>

        <div className="privacy-section" id="data-deletion">
          <h2>{"8. Suppression de vos donn\u00E9es"}</h2>
          <p>{"Vous pouvez demander la suppression compl\u00E8te de votre compte et de toutes vos donn\u00E9es personnelles \u00E0 tout moment :"}</p>
          <ul>
            <li>{"Par email \u00E0 "}<a href="mailto:contact@monpetitmdb.fr">contact@monpetitmdb.fr</a>{" avec l\u2019objet \u00AB Suppression de compte \u00BB"}</li>
            <li>{"Depuis votre profil sur le site (section Mon Profil)"}</li>
          </ul>
          <p>{"La suppression sera effective sous 30 jours maximum. Les donn\u00E9es de facturation sont conserv\u00E9es conform\u00E9ment aux obligations l\u00E9gales (10 ans)."}</p>
        </div>

        <div className="privacy-section">
          <h2>{"9. Cookies"}</h2>
          <p>{"Mon Petit MDB utilise uniquement des cookies techniques n\u00E9cessaires au fonctionnement du site (authentification, session). Aucun cookie publicitaire ou de tracking n\u2019est utilis\u00E9."}</p>
        </div>

        <div className="privacy-section">
          <h2>{"10. Modifications"}</h2>
          <p>{"Cette politique peut \u00EAtre mise \u00E0 jour. En cas de modification substantielle, vous serez inform\u00E9 par email."}</p>
        </div>
      </div>
    </Layout>
  )
}
