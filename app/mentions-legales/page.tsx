import Layout from '@/components/Layout'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Mentions l\u00E9gales",
  description: "Mentions l\u00E9gales de Mon Petit MDB.",
  alternates: { canonical: 'https://www.monpetitmdb.fr/mentions-legales' },
}

export default function MentionsLegalesPage() {
  return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>
          Mentions légales
        </h1>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Éditeur du site</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Mon Petit MDB<br />
            Plateforme de sourcing immobilier<br />
            Contact : contact@monpetitmdb.io
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Hébergement</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Vercel Inc.<br />
            340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis<br />
            Base de données : Supabase Inc.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Données personnelles</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Les données collectées (email, paramètres fiscaux) sont utilisées uniquement pour le fonctionnement du service.
            Elles ne sont ni vendues ni partagées avec des tiers.
            Conformément au RGPD, vous pouvez demander la suppression de vos données à tout moment via contact@monpetitmdb.io.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Propriété intellectuelle</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            L'ensemble du contenu du site (textes, analyses, estimations, articles) est protégé par le droit d'auteur.
            Les données immobilières proviennent de sources publiques (DVF, annonces) et sont enrichies par intelligence artificielle.
            Les estimations fournies sont indicatives et ne constituent pas une évaluation certifiée.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Cookies</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Le site utilise des cookies techniques nécessaires au fonctionnement (authentification, préférences).
            Aucun cookie publicitaire ou de tracking n'est utilisé.
          </p>
        </section>
      </div>
    </Layout>
  )
}
