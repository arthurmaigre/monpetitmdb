'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'

const faqs = [
  {
    question: "Qu\u2019est-ce que Mon Petit MDB\u00A0?",
    answer: "Mon Petit MDB est une plateforme de sourcing immobilier destin\u00E9e aux investisseurs particuliers. Elle applique la m\u00E9thodologie marchand de biens pour analyser plus de 90\u00A0000 biens issus de 60+ plateformes, avec 4 strat\u00E9gies d\u2019investissement (locataire en place, travaux lourds, division, d\u00E9coupe) et 7 r\u00E9gimes fiscaux."
  },
  {
    question: "Quels sont les tarifs\u00A0?",
    answer: "Mon Petit MDB propose 3 formules\u00A0: Free (gratuit, 10 biens en watchlist), Pro \u00E0 19\u00A0\u20AC/mois (50 biens, 1 strat\u00E9gie, 2 r\u00E9gimes fiscaux) et Expert \u00E0 49\u00A0\u20AC/mois (illimit\u00E9, toutes strat\u00E9gies, tous r\u00E9gimes). Deux analyses compl\u00E8tes sont offertes aux utilisateurs Free."
  },
  {
    question: "Quelles sont les 4 strat\u00E9gies MDB\u00A0?",
    answer: "Les 4 strat\u00E9gies sont\u00A0: Locataire en place (bien d\u00E9j\u00E0 lou\u00E9, rendement imm\u00E9diat), Travaux lourds (achat sous le march\u00E9 + r\u00E9novation), Division (transformation en immeuble de rapport) et D\u00E9coupe (revente \u00E0 la d\u00E9coupe lot par lot). Chaque strat\u00E9gie a ses propres crit\u00E8res de filtrage et d\u2019analyse."
  },
  {
    question: "Comment fonctionne l\u2019estimation DVF\u00A0?",
    answer: "L\u2019estimation s\u2019appuie sur les Demandes de Valeurs Fonci\u00E8res (DVF), c\u2019est-\u00E0-dire les transactions notariales r\u00E9elles publi\u00E9es par le Cerema. Nous comparons chaque bien avec des ventes similaires (m\u00EAme type, surface, localisation) puis appliquons des correcteurs qualitatifs (DPE, \u00E9tage, ext\u00E9rieur, parking\u2026). Un indice de confiance de A \u00E0 D indique la fiabilit\u00E9 de l\u2019estimation."
  },
  {
    question: "D\u2019o\u00F9 proviennent les annonces\u00A0?",
    answer: "Les annonces sont agr\u00E9g\u00E9es via Moteur Immo, un agr\u00E9gateur qui collecte les offres de plus de 60 plateformes immobili\u00E8res en France. Les biens sont ensuite filtr\u00E9s, valid\u00E9s et enrichis par notre pipeline IA (extraction de donn\u00E9es, scoring travaux, v\u00E9rification de statut)."
  },
  {
    question: "Mes donn\u00E9es sont-elles s\u00E9curis\u00E9es\u00A0?",
    answer: "Oui. Nous utilisons Supabase (infrastructure europ\u00E9enne, West EU) pour l\u2019h\u00E9bergement des donn\u00E9es et l\u2019authentification. Les paiements sont g\u00E9r\u00E9s par Stripe, certifi\u00E9 PCI-DSS. Nous ne stockons jamais vos informations bancaires. Vous pouvez demander la suppression de vos donn\u00E9es \u00E0 tout moment conform\u00E9ment au RGPD."
  },
  {
    question: "Puis-je annuler mon abonnement\u00A0?",
    answer: "Oui, \u00E0 tout moment depuis votre profil (Mon Profil > Facturation). L\u2019annulation prend effet \u00E0 la fin de la p\u00E9riode en cours. Vous conservez l\u2019acc\u00E8s aux fonctionnalit\u00E9s payantes jusqu\u2019\u00E0 cette date."
  },
  {
    question: "Comment contacter le support\u00A0?",
    answer: "Vous pouvez nous \u00E9crire via la page Contact accessible depuis le footer du site ou poser vos questions directement \u00E0 Memo, notre assistant IA int\u00E9gr\u00E9, disponible sur chaque page."
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
          <h1 className="faq-title">Questions fr{'\u00E9'}quentes</h1>
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
    </Layout>
  )
}
