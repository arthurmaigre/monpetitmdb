'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

const faqs = [
  {
    question: "Qu’est-ce que Mon Petit MDB ?",
    answer: "Mon Petit MDB est une plateforme de sourcing et d’analyse immobilière destinée aux marchands de biens et investisseurs. Elle applique la méthodologie marchand de biens pour analyser plus de 90 000 biens issus de 60+ plateformes, avec 4 stratégies (locataire en place, travaux lourds, immeuble de rapport, enchères) et 5 régimes fiscaux."
  },
  {
    question: "Quels sont les tarifs ?",
    answer: "Mon Petit MDB propose 3 formules : Free (gratuit, 10 biens en watchlist), Pro à 19 €/mois (50 biens, 1 stratégie, 2 régimes fiscaux) et Expert à 49 €/mois (illimité, toutes stratégies, tous régimes). Deux analyses complètes sont offertes aux utilisateurs Free."
  },
  {
    question: "Quelles sont les 4 stratégies MDB ?",
    answer: "Les 4 stratégies sont : Locataire en place (bien déjà loué, rendement immédiat), Travaux lourds (achat sous le marché + rénovation), Immeuble de rapport (achat d’un immeuble entier, revente ou location lot par lot) et Enchères (acquisition en vente judiciaire ou notariale). Chaque stratégie a ses propres critères de filtrage et d’analyse."
  },
  {
    question: "Comment fonctionne l’estimation DVF ?",
    answer: "L’estimation s’appuie sur les Demandes de Valeurs Foncières (DVF), c’est-à-dire les transactions notariales réelles publiées par le Cerema. Nous comparons chaque bien avec des ventes similaires (même type, surface, localisation) puis appliquons des correcteurs qualitatifs (DPE, étage, extérieur, parking…). Un indice de confiance de A à D indique la fiabilité de l’estimation."
  },
  {
    question: "D’où proviennent les annonces ?",
    answer: "Les annonces sont agrégées via Moteur Immo, un agrégateur qui collecte les offres de plus de 60 plateformes immobilières en France. Les biens sont ensuite filtrés, validés et enrichis par notre pipeline IA (extraction de données, scoring travaux, vérification de statut)."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui. Nous utilisons Supabase (infrastructure européenne, West EU) pour l’hébergement des données et l’authentification. Les paiements sont gérés par Stripe, certifié PCI-DSS. Nous ne stockons jamais vos informations bancaires. Vous pouvez demander la suppression de vos données à tout moment conformément au RGPD."
  },
  {
    question: "Puis-je annuler mon abonnement ?",
    answer: "Oui, à tout moment depuis votre profil (Mon Profil > Facturation). L’annulation prend effet à la fin de la période en cours. Vous conservez l’accès aux fonctionnalités payantes jusqu’à cette date."
  },
  {
    question: "Comment contacter le support ?",
    answer: "Vous pouvez nous écrire via la page Contact accessible depuis le footer du site ou poser vos questions directement à Memo, notre assistant IA intégré, disponible sur chaque page."
  },
  {
    question: "Comment fonctionne l’analyse fiscale ?",
    answer: "MonPetitMDB simule votre situation sur 5 régimes fiscaux (Nu micro-foncier, Nu réel, LMNP micro-BIC, LMNP réel, SCI à l’IS, Marchand de biens). Chaque régime calcule votre cashflow net d’impôt et votre bilan de revente selon votre TMI et votre durée de détention."
  },
  {
    question: "Qu’est-ce que la stratégie Enchères ?",
    answer: "Les ventes aux enchères judiciaires permettent d’acquérir des biens avec une décote de 10 à 40 % sur le prix du marché. MonPetitMDB agrège les annonces de 3 tribunaux (Licitor, Avoventes, Vench) et calcule automatiquement votre prix cible maximum pour viser 20 % de plus-value brute."
  },
  {
    question: "Comment est calculée l’estimation DVF ?",
    answer: "L’estimation est basée sur les transactions notariales réelles (données DVF Cerema), filtrées par type de bien, surface et localisation. Des correcteurs qualitatifs sont appliqués (DPE, étage, extérieur, parking). C’est le prix de revente « en bon état », pas un prix d’achat décoté."
  },
  {
    question: "Puis-je annuler mon abonnement ?",
    answer: "Oui, à tout moment depuis votre espace Mon Profil → Facturation → Gérer mon abonnement. L’annulation prend effet à la fin de la période en cours. Vos données sont conservées en plan Free."
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  useEffect(() => { document.title = 'Questions fréquentes | Mon Petit MDB' }, [])

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }

  return (
    <Layout>
      <style>{`
        .faq-wrap { min-height: 70vh; display: flex; align-items: flex-start; justify-content: center; padding: 64px 24px; }
        .faq-box { width: 100%; max-width: 680px; }
        .faq-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; color: #1a1210; }
        .faq-sub { font-size: 14px; color: #7a6a60; margin-bottom: 40px; }
        .faq-item { border-bottom: 1px solid #e8e2d8; }
        .faq-question {
          width: 100%; background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0; font-family: 'DM Sans', sans-serif; font-size: 15px;
          font-weight: 600; color: #1a1210; text-align: left; gap: 16px;
        }
        .faq-question:hover { color: #c0392b; }
        .faq-chevron {
          flex-shrink: 0; width: 20px; height: 20px;
          transition: transform 200ms ease;
        }
        .faq-chevron.open { transform: rotate(180deg); }
        .faq-answer {
          overflow: hidden; max-height: 0; transition: max-height 300ms ease, padding 300ms ease;
          font-size: 14px; line-height: 1.7; color: #5a4a40; padding: 0 0 0 0;
        }
        .faq-answer.open { max-height: 400px; padding: 0 0 20px 0; }
        @media (max-width: 640px) {
          .faq-wrap { padding: 40px 16px; }
          .faq-title { font-size: 26px; }
        }
      `}</style>

      <div className="faq-wrap">
        <div className="faq-box">
          <h1 className="faq-title">Questions fr{'é'}quentes</h1>
          <p className="faq-sub">Tout ce que vous devez savoir sur Mon Petit MDB</p>

          {faqs.map((faq, i) => (
            <div key={i} className="faq-item">
              <button
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                <span>{faq.question}</span>
                <svg className={`faq-chevron${openIndex === i ? ' open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div className={`faq-answer${openIndex === i ? ' open' : ''}`}>
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </Layout>
  )
}
