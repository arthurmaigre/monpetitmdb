import Layout from '@/components/Layout'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Conditions g\u00E9n\u00E9rales d'utilisation",
  description: "CGU de Mon Petit MDB \u2014 plateforme de sourcing immobilier pour investisseurs.",
  alternates: { canonical: 'https://www.monpetitmdb.fr/cgu' },
}

export default function CGUPage() {
  return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '32px', fontWeight: 800, marginBottom: '32px' }}>
          Conditions Générales d'Utilisation
        </h1>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>1. Objet</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Mon Petit MDB est une plateforme de sourcing immobilier destinée aux investisseurs particuliers.
            Elle agrège des annonces immobilières, fournit des estimations de prix et des analyses fiscales
            selon la méthodologie marchand de biens.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>2. Accès au service</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            L'accès à la plateforme nécessite la création d'un compte. Certaines fonctionnalités sont
            réservées aux abonnés payants (plans Pro et Expert). L'utilisateur s'engage à fournir
            des informations exactes lors de son inscription.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>3. Estimations et analyses</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Les estimations de prix sont basées sur les données DVF (Demandes de Valeurs Foncières) et
            des modèles statistiques. Elles sont fournies à titre indicatif et ne constituent en aucun cas
            une évaluation immobilière certifiée au sens de la loi. Les analyses fiscales sont données
            à titre informatif et ne remplacent pas les conseils d'un expert-comptable ou d'un notaire.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>4. Responsabilité</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Mon Petit MDB s'efforce de fournir des informations exactes et à jour mais ne peut garantir
            l'exhaustivité ou l'exactitude des données affichées. Les annonces proviennent de plateformes
            tierces et peuvent contenir des erreurs. L'utilisateur reste seul responsable de ses décisions
            d'investissement.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>5. Abonnements et paiement</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Les abonnements sont mensuels et sans engagement. Le paiement est effectué via Stripe.
            L'utilisateur peut résilier à tout moment depuis son profil. La résiliation prend effet
            à la fin de la période en cours.
          </p>
        </section>

        <section>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>6. Modification des CGU</h2>
          <p style={{ fontSize: '15px', color: '#4a3f3b', lineHeight: 1.7 }}>
            Mon Petit MDB se réserve le droit de modifier les présentes conditions. Les utilisateurs
            seront informés par email de tout changement significatif.
          </p>
        </section>
      </div>
    </Layout>
  )
}
