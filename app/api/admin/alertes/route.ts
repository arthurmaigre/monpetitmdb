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

function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

const DPE_COLORS: Record<string, string> = { A: '#319834', B: '#33a357', C: '#51b74b', D: '#f0e034', E: '#f0a830', F: '#eb6a2a', G: '#e42a1e' }

function buildEmailHtml(alerte: any, biens: any[]): string {
  const cardsHtml = biens.slice(0, 10).map(b => {
    const prix = b.prix_fai ? `${fmt(b.prix_fai)}\u00A0\u20AC` : 'Prix NC'
    const prixM2 = b.prix_m2 ? `${fmt(b.prix_m2)}\u00A0\u20AC/m\u00B2` : ''
    const surface = b.surface ? `${b.surface}\u00A0m\u00B2` : ''
    const rendement = b.rendement_brut ? `${(b.rendement_brut * 100).toFixed(1)}\u00A0%` : ''
    const ville = b.ville || ''
    const cp = b.code_postal ? ` (${b.code_postal})` : ''
    const quartier = b.quartier ? ` \u2014 ${b.quartier}` : ''
    const lien = `https://www.monpetitmdb.fr/biens/${b.id}`
    const titre = `${b.type_bien || 'Bien'} ${b.nb_pieces || ''}${surface ? ` \u2014 ${surface}` : ''}`
    const loyer = b.loyer ? `${fmt(b.loyer)}\u00A0\u20AC/mois` : ''
    const dpeColor = b.dpe ? (DPE_COLORS[b.dpe] || '#7a6a60') : ''
    const estimation = b.estimation_prix_total ? fmt(b.estimation_prix_total) : ''
    const plusValue = b.estimation_prix_total && b.prix_fai ? Math.round(b.estimation_prix_total - b.prix_fai) : 0
    const pvPct = b.estimation_prix_total && b.prix_fai ? Math.round((b.estimation_prix_total - b.prix_fai) / b.prix_fai * 100) : 0
    const scoreTravaux = b.score_travaux ? `${b.score_travaux}/5` : ''

    return `
      <div style="border: 1.5px solid #e8e2d8; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
        <div style="padding: 16px 18px;">
          <div style="margin-bottom: 8px;">
            <a href="${lien}" style="font-family: 'Fraunces', Georgia, serif; font-size: 16px; font-weight: 700; color: #1a1210; text-decoration: none; display: block;">
              ${titre}
            </a>
            <div style="font-size: 12px; color: #7a6a60; margin-top: 2px;">${ville}${cp}${quartier}</div>
          </div>

          <div style="display: flex; margin-bottom: 10px;">
            <div style="font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 800; color: #1a1210;">
              ${prix}
            </div>
            ${prixM2 ? `<div style="font-size: 12px; color: #7a6a60; margin-left: 8px; align-self: flex-end;">${prixM2}</div>` : ''}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              ${rendement ? `<td style="padding: 4px 0;"><span style="color: #7a6a60;">Rendement</span><br><strong style="color: #c0392b; font-size: 13px;">${rendement}</strong></td>` : ''}
              ${loyer ? `<td style="padding: 4px 0;"><span style="color: #7a6a60;">Loyer HC</span><br><strong style="color: #1a1210; font-size: 13px;">${loyer}</strong></td>` : ''}
              ${scoreTravaux ? `<td style="padding: 4px 0;"><span style="color: #7a6a60;">Travaux</span><br><strong style="color: #f0a830; font-size: 13px;">${scoreTravaux}</strong></td>` : ''}
              ${b.dpe ? `<td style="padding: 4px 0;"><span style="color: #7a6a60;">DPE</span><br><span style="display: inline-block; width: 22px; height: 22px; border-radius: 4px; background: ${dpeColor}; color: #fff; font-weight: 700; font-size: 12px; text-align: center; line-height: 22px;">${b.dpe}</span></td>` : ''}
              ${estimation ? `<td style="padding: 4px 0;"><span style="color: #7a6a60;">Estim. DVF</span><br><strong style="color: ${pvPct >= 0 ? '#1a7a40' : '#c0392b'}; font-size: 13px;">${pvPct >= 0 ? '+' : ''}${pvPct}\u00A0%</strong></td>` : ''}
            </tr>
          </table>

          <div style="margin-top: 12px;">
            <a href="${lien}" style="display: inline-block; padding: 8px 20px; background: #1a1210; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 12px;">
              Analyser ce bien \u2192
            </a>
          </div>
        </div>
      </div>`
  }).join('')

  const filtresResume = [
    alerte.filtres?.strategie_mdb,
    alerte.filtres?.metropole,
    alerte.filtres?.ville,
    alerte.filtres?.prix_max ? `< ${fmt(alerte.filtres.prix_max)}\u00A0\u20AC` : '',
    alerte.filtres?.surface_min ? `> ${alerte.filtres.surface_min}\u00A0m\u00B2` : '',
    alerte.filtres?.rendement_min ? `> ${alerte.filtres.rendement_min}\u00A0%` : '',
  ].filter(Boolean).join(' \u00B7 ')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f2ece4; font-family: 'DM Sans', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06);">

      <div style="background: #1a1210; padding: 20px 28px; display: flex; align-items: center; justify-content: space-between;">
        <div style="font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 700; color: #fff;">Mon Petit MDB</div>
        <div style="font-size: 11px; color: #b0a898;">Alerte ${alerte.frequence === 'hebdomadaire' ? 'hebdomadaire' : 'quotidienne'}</div>
      </div>

      <div style="padding: 24px 28px;">
        <h1 style="font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 800; color: #1a1210; margin: 0 0 4px;">
          ${biens.length} nouveau${biens.length > 1 ? 'x' : ''} bien${biens.length > 1 ? 's' : ''}
        </h1>
        <p style="color: #7a6a60; font-size: 13px; margin: 0 0 6px;">
          <strong>${alerte.nom}</strong>
        </p>
        <p style="color: #b0a898; font-size: 12px; margin: 0 0 20px;">
          ${filtresResume}
        </p>

        ${cardsHtml}

        ${biens.length > 10 ? `<div style="text-align: center; padding: 12px; background: #faf8f5; border-radius: 8px; margin-bottom: 12px;"><span style="color: #7a6a60; font-size: 13px;">Et <strong>${biens.length - 10}</strong> autre${biens.length - 10 > 1 ? 's' : ''} bien${biens.length - 10 > 1 ? 's' : ''} correspondent \u00E0 vos crit\u00E8res</span></div>` : ''}

        <div style="text-align: center; margin-top: 8px;">
          <a href="https://www.monpetitmdb.fr/biens?strategie=${encodeURIComponent(alerte.filtres?.strategie_mdb || '')}" style="display: inline-block; padding: 14px 32px; background: #c0392b; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
            Voir tous les biens \u2192
          </a>
        </div>
      </div>

      <div style="padding: 16px 28px; background: #faf8f5; border-top: 1px solid #f0ede8;">
        <p style="color: #b0a898; font-size: 11px; margin: 0; text-align: center; line-height: 1.6;">
          Vous recevez cet email car vous avez configur\u00E9 l\u2019alerte \u00AB\u00A0${alerte.nom}\u00A0\u00BB sur Mon Petit MDB.<br>
          <a href="https://www.monpetitmdb.fr/parametres" style="color: #c0392b; text-decoration: underline;">G\u00E9rer mes alertes</a> \u00B7
          <a href="https://www.monpetitmdb.fr/parametres" style="color: #c0392b; text-decoration: underline;">Se d\u00E9sabonner</a>
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

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env['BREVO_API_KEY']
  const senderEmail = process.env['BREVO_SENDER_EMAIL'] || 'arthur@monpetitmdb.fr'
  if (!apiKey) {
    return { ok: false, error: 'BREVO_API_KEY manquante' }
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Mon Petit MDB', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, error: `Brevo ${res.status}: ${err}` }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: `Fetch error: ${e.message}` }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Build Supabase query from alert filters
// ──────────────────────────────────────────────────────────────────────────────

function queryBiensForAlerte(filtres: any, sinceDate: string) {
  let query = supabaseAdmin
    .from('biens')
    .select('id, type_bien, nb_pieces, surface, prix_fai, prix_m2, ville, code_postal, quartier, metropole, rendement_brut, score_travaux, dpe, annee_construction, loyer, strategie_mdb, url, photo_url, estimation_prix_total')
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
    .select('*')
    .eq('enabled', true)

  if (alertesError) return NextResponse.json({ error: alertesError.message }, { status: 500 })
  if (!alertes || alertes.length === 0) return NextResponse.json({ processed: 0, sent: 0, reason: 'Aucune alerte active' })

  let totalSent = 0
  let totalBiens = 0
  const emailErrors: any[] = []

  for (const alerte of alertes) {
    // Charger le profil de l'utilisateur
    const { data: profile } = await supabaseAdmin.from('profiles').select('plan, email:id').eq('id', alerte.user_id).single()
    // Recuperer l'email depuis auth.users
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(alerte.user_id)
    const email = authUser?.user?.email
    if (!email) continue
    if (profile?.plan !== 'expert') continue

    // Verifier la frequence : hebdomadaire = skip si dernier envoi < 7 jours
    if (alerte.frequence === 'hebdomadaire' && alerte.last_sent_at) {
      const daysSince = (Date.now() - new Date(alerte.last_sent_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) continue
    }

    // Date de reference : dernier envoi ou 30j (premier envoi) / 24h (quotidien) / 7j (hebdomadaire)
    const defaultSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sinceDate = alerte.last_sent_at || defaultSince

    // Chercher les nouveaux biens
    const { data: biens, error: biensError } = await queryBiensForAlerte(alerte.filtres || {}, sinceDate)
    if (biensError || !biens || biens.length === 0) continue

    totalBiens += biens.length

    // Envoyer l'email
    const subject = `${biens.length} nouveau${biens.length > 1 ? 'x' : ''} bien${biens.length > 1 ? 's' : ''} \u2014 ${alerte.nom}`
    const html = buildEmailHtml(alerte, biens)
    const emailResult = await sendEmail(email, subject, html)

    if (emailResult.ok) {
      totalSent++
      await supabaseAdmin.from('alertes').update({ last_sent_at: new Date().toISOString() }).eq('id', alerte.id)
    } else {
      emailErrors.push({ alerte: alerte.nom, error: emailResult.error })
    }
  }

  // Mettre a jour cron_config
  const result: any = { processed: alertes.length, sent: totalSent, biens: totalBiens }
  if (emailErrors.length > 0) result.errors = emailErrors
  await supabaseAdmin.from('cron_config').update({ last_run: new Date().toISOString(), last_result: result }).eq('id', 'alertes')

  return NextResponse.json(result)
}
