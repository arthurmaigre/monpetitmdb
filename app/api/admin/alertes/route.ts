import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper
// ──────────────────────────────────────────────────────────────────────────────

async function checkAdminOrCron(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true
  return false
}

// ──────────────────────────────────────────────────────────────────────────────
// Email template
// ──────────────────────────────────────────────────────────────────────────────

function buildEmailHtml(alerte: any, biens: any[]): string {
  const biensHtml = biens.slice(0, 20).map(b => {
    const prix = b.prix_fai ? `${Math.round(b.prix_fai).toLocaleString('fr-FR')}\u00A0\u20AC` : 'Prix NC'
    const surface = b.surface ? `${b.surface}\u00A0m\u00B2` : ''
    const rendement = b.rendement_brut ? `${(b.rendement_brut * 100).toFixed(1)}%` : ''
    const ville = b.ville || ''
    const cp = b.code_postal ? ` (${b.code_postal})` : ''
    const lien = `https://www.monpetitmdb.fr/biens/${b.id}`
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f0ede8;">
          <a href="${lien}" style="color: #1a1210; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${b.type_bien || 'Bien'} ${b.nb_pieces || ''} ${surface ? `\u2014 ${surface}` : ''}
          </a>
          <div style="color: #7a6a60; font-size: 12px; margin-top: 2px;">${ville}${cp}</div>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f0ede8; text-align: right; white-space: nowrap;">
          <div style="font-weight: 700; color: #1a1210; font-size: 14px;">${prix}</div>
          ${rendement ? `<div style="color: #c0392b; font-size: 12px; font-weight: 600;">${rendement}</div>` : ''}
        </td>
      </tr>`
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f2ece4; font-family: 'DM Sans', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06);">

      <div style="background: #1a1210; padding: 24px 28px;">
        <div style="font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 700; color: #fff;">Mon Petit MDB</div>
      </div>

      <div style="padding: 28px;">
        <h1 style="font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 700; color: #1a1210; margin: 0 0 8px;">
          ${biens.length} nouveau${biens.length > 1 ? 'x' : ''} bien${biens.length > 1 ? 's' : ''}
        </h1>
        <p style="color: #7a6a60; font-size: 14px; margin: 0 0 20px;">
          Alerte <strong>\u00AB\u00A0${alerte.nom}\u00A0\u00BB</strong> \u2014 ${alerte.filtres?.strategie_mdb || ''}
          ${alerte.filtres?.metropole ? ` \u2014 ${alerte.filtres.metropole}` : ''}
          ${alerte.filtres?.ville ? ` \u2014 ${alerte.filtres.ville}` : ''}
        </p>

        <table style="width: 100%; border-collapse: collapse; border: 1px solid #f0ede8; border-radius: 10px; overflow: hidden;">
          <thead>
            <tr style="background: #faf8f5;">
              <th style="padding: 10px 16px; text-align: left; font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em;">Bien</th>
              <th style="padding: 10px 16px; text-align: right; font-size: 11px; font-weight: 600; color: #7a6a60; text-transform: uppercase; letter-spacing: 0.06em;">Prix</th>
            </tr>
          </thead>
          <tbody>${biensHtml}</tbody>
        </table>

        ${biens.length > 20 ? `<p style="color: #7a6a60; font-size: 13px; margin-top: 12px; text-align: center;">Et ${biens.length - 20} autre${biens.length - 20 > 1 ? 's' : ''} bien${biens.length - 20 > 1 ? 's' : ''}\u2026</p>` : ''}

        <div style="text-align: center; margin-top: 24px;">
          <a href="https://www.monpetitmdb.fr/biens" style="display: inline-block; padding: 12px 28px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Voir tous les biens \u2192
          </a>
        </div>
      </div>

      <div style="padding: 16px 28px; background: #faf8f5; border-top: 1px solid #f0ede8;">
        <p style="color: #b0a898; font-size: 11px; margin: 0; text-align: center;">
          Vous recevez cet email car vous avez configur\u00E9 une alerte sur Mon Petit MDB.
          <a href="https://www.monpetitmdb.fr/parametres" style="color: #c0392b;">G\u00E9rer mes alertes</a>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`
}

// ──────────────────────────────────────────────────────────────────────────────
// Send email via Brevo API
// ──────────────────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) { console.error('BREVO_API_KEY manquante'); return false }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Mon Petit MDB', email: process.env.BREVO_SENDER_EMAIL || 'alertes@monpetitmdb.fr' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Brevo error:', res.status, err)
      return false
    }
    return true
  } catch (e) {
    console.error('Brevo fetch error:', e)
    return false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Build Supabase query from alert filters
// ──────────────────────────────────────────────────────────────────────────────

function queryBiensForAlerte(filtres: any, sinceDate: string) {
  let query = supabaseAdmin
    .from('biens')
    .select('id, type_bien, nb_pieces, surface, prix_fai, prix_m2, ville, code_postal, metropole, rendement_brut, score_travaux, strategie_mdb, url')
    .eq('statut', 'Toujours disponible')
    .gt('created_at', sinceDate)

  if (filtres.strategie_mdb) query = query.eq('strategie_mdb', filtres.strategie_mdb)
  if (filtres.metropole) query = query.eq('metropole', filtres.metropole)
  if (filtres.ville) query = query.ilike('ville', `${filtres.ville}%`)
  if (filtres.code_postal) query = query.eq('code_postal', filtres.code_postal)
  if (filtres.prix_min) query = query.gte('prix_fai', filtres.prix_min)
  if (filtres.prix_max) query = query.lte('prix_fai', filtres.prix_max)
  if (filtres.surface_min) query = query.gte('surface', filtres.surface_min)
  if (filtres.surface_max) query = query.lte('surface', filtres.surface_max)
  if (filtres.rendement_min) query = query.gte('rendement_brut', filtres.rendement_min / 100)
  if (filtres.score_travaux_min) query = query.gte('score_travaux', filtres.score_travaux_min)

  return query.order('created_at', { ascending: false }).limit(50)
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/alertes — Cron entry point
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const isAuthorized = await checkAdminOrCron(req)
  if (!isAuthorized) return NextResponse.json({ error: 'Non autoris\u00E9' }, { status: 401 })

  // Charger toutes les alertes actives
  const { data: alertes, error: alertesError } = await supabaseAdmin
    .from('alertes')
    .select('*, profiles!inner(email, plan)')
    .eq('enabled', true)

  if (alertesError) return NextResponse.json({ error: alertesError.message }, { status: 500 })
  if (!alertes || alertes.length === 0) return NextResponse.json({ processed: 0, sent: 0, reason: 'Aucune alerte active' })

  let totalSent = 0
  let totalBiens = 0

  for (const alerte of alertes) {
    // Verifier que l'utilisateur est Expert
    const profile = (alerte as any).profiles
    if (profile?.plan !== 'expert') continue

    // Verifier la frequence : hebdomadaire = skip si dernier envoi < 7 jours
    if (alerte.frequence === 'hebdomadaire' && alerte.last_sent_at) {
      const daysSince = (Date.now() - new Date(alerte.last_sent_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) continue
    }

    // Date de reference : dernier envoi ou 24h (quotidien) / 7j (hebdomadaire)
    const defaultSince = alerte.frequence === 'hebdomadaire'
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const sinceDate = alerte.last_sent_at || defaultSince

    // Chercher les nouveaux biens
    const { data: biens, error: biensError } = await queryBiensForAlerte(alerte.filtres || {}, sinceDate)
    if (biensError || !biens || biens.length === 0) continue

    totalBiens += biens.length

    // Envoyer l'email
    const subject = `${biens.length} nouveau${biens.length > 1 ? 'x' : ''} bien${biens.length > 1 ? 's' : ''} \u2014 ${alerte.nom}`
    const html = buildEmailHtml(alerte, biens)
    const sent = await sendEmail(profile.email, subject, html)

    if (sent) {
      totalSent++
      // Mettre a jour last_sent_at
      await supabaseAdmin.from('alertes').update({ last_sent_at: new Date().toISOString() }).eq('id', alerte.id)
    }
  }

  // Mettre a jour cron_config
  const result = { processed: alertes.length, sent: totalSent, biens: totalBiens }
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: result }).eq('id', 'alertes')

  return NextResponse.json(result)
}
