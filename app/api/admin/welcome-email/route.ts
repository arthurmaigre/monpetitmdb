import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function fmt(n: number) { return Math.round(n).toLocaleString('fr-FR') }

function getPhoto(b: any): string {
  if (b.moteurimmo_data) {
    try {
      const raw = b.moteurimmo_data
      const md = typeof raw === 'string' ? JSON.parse(typeof JSON.parse(raw) === 'string' ? JSON.parse(raw) : raw) : raw
      if (md?.pictureUrls?.length > 0) return md.pictureUrls[0]
    } catch { /* fallback */ }
  }
  return b.photo_url || ''
}

function buildWelcomeHtml(biens: any[]): string {
  const origin = 'https://www.monpetitmdb.fr'

  const cardsHtml = biens.slice(0, 3).map(b => {
    const photo = getPhoto(b)
    const prix = b.prix_fai ? `${fmt(b.prix_fai)} €` : 'Prix NC'
    const surface = b.surface ? `${b.surface} m²` : ''
    const rendement = b.rendement_brut ? `${(b.rendement_brut * 100).toFixed(1)} %` : ''
    const ville = b.ville || b.metropole || ''
    const strategie = b.strategie_mdb || 'Bien immobilier'
    const lien = `${origin}/biens/${b.id}`

    return `
      <tr>
        <td style="padding: 0 0 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1.5px solid #e8e0d8; border-radius: 12px; overflow: hidden; font-family: 'DM Sans', Arial, sans-serif;">
            <tr>
              ${photo ? `<td width="100" valign="top" style="padding: 0;">
                <img src="${photo}" width="100" height="80" style="display: block; object-fit: cover; border-radius: 10px 0 0 10px;" alt="${ville}" />
              </td>` : ''}
              <td style="padding: 12px 16px;">
                <div style="font-size: 11px; font-weight: 600; color: #c0392b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;">${strategie}</div>
                <div style="font-size: 15px; font-weight: 700; color: #1a1210; margin-bottom: 6px;">${prix}${surface ? ` · ${surface}` : ''} · ${ville}</div>
                ${rendement ? `<span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background: #d4f5e0; color: #1a7a40; font-size: 12px; font-weight: 600; margin-bottom: 8px;">Rendement ${rendement}</span>` : ''}
                <br/>
                <a href="${lien}" style="display: inline-block; padding: 7px 16px; border-radius: 8px; background: #1a1210; color: #fff; font-size: 12px; font-weight: 600; text-decoration: none;">Analyser ce bien →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f5ede2; font-family: 'DM Sans', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f5ede2;">
    <tr><td align="center" style="padding: 32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background: #1a1210; padding: 28px 32px; text-align: center;">
            <div style="font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 800; color: #f5ede2; letter-spacing: -0.02em;">Mon Petit MDB</div>
            <div style="font-size: 13px; color: #a39a8c; margin-top: 4px;">L'analyse immobilière à la portée de tous</div>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding: 32px 32px 24px;">
            <h1 style="font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 700; color: #1a1210; margin: 0 0 12px; line-height: 1.25;">Bienvenue sur Mon Petit MDB</h1>
            <p style="font-size: 15px; color: #5a4a40; line-height: 1.6; margin: 0 0 8px;">
              Votre compte est activé. Vous pouvez maintenant analyser des biens immobiliers avec la méthode des marchands de biens&nbsp;: rendement réel, fiscalité sur 7&nbsp;régimes, et estimation marché DVF.
            </p>
            <p style="font-size: 15px; color: #5a4a40; line-height: 1.6; margin: 0;">
              Voici 3&nbsp;biens qui viennent d'arriver et qui méritent un coup d'œil&nbsp;:
            </p>
          </td>
        </tr>

        <!-- Biens cards -->
        <tr>
          <td style="padding: 0 32px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              ${cardsHtml}
            </table>
          </td>
        </tr>

        <!-- CTA principal -->
        <tr>
          <td style="padding: 8px 32px 28px; text-align: center;">
            <a href="${origin}/biens" style="display: inline-block; padding: 14px 36px; border-radius: 10px; background: #c0392b; color: #fff; font-size: 15px; font-weight: 700; text-decoration: none; font-family: 'DM Sans', Arial, sans-serif;">
              Voir tous les biens →
            </a>
          </td>
        </tr>

        <!-- EARLYBIRD rappel -->
        <tr>
          <td style="padding: 0 32px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="background: #fff8e1; border: 1.5px solid #f0d090; border-radius: 10px; padding: 14px 18px; text-align: center;">
                  <div style="font-size: 14px; font-weight: 700; color: #1a1210; margin-bottom: 4px;">Offre Early Bird — Code EARLYBIRD</div>
                  <div style="font-size: 13px; color: #7a4f00; margin-bottom: 10px;">Passez Pro ou Expert avec <strong>-30&nbsp;% à vie</strong> — offre limitée aux 100 premiers membres.</div>
                  <a href="${origin}/mon-profil" style="display: inline-block; padding: 9px 22px; border-radius: 8px; background: #c0392b; color: #fff; font-size: 13px; font-weight: 600; text-decoration: none;">Découvrir les offres Pro et Expert</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f5ede2; padding: 20px 32px; text-align: center; border-top: 1px solid #e8e0d8;">
            <p style="font-size: 12px; color: #9a8a82; margin: 0 0 4px;">Mon Petit MDB · 100% indépendant · Fait avec ♥ en France</p>
            <p style="font-size: 11px; color: #b8a89a; margin: 0;">
              Vous recevez cet email car vous venez de créer votre compte sur <a href="${origin}" style="color: #b8a89a;">monpetitmdb.fr</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env['BREVO_API_KEY']
  const senderEmail = process.env['BREVO_SENDER_EMAIL'] || 'arthur@monpetitmdb.fr'
  if (!apiKey) return { ok: false, error: 'BREVO_API_KEY manquante' }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

// POST — déclenché par un webhook Supabase sur auth.users (INSERT ou email_confirmed_at non null)
// Header requis : Authorization: Bearer <CRON_SECRET>
// Body : { user_id: string, email: string }
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: { user_id?: string; email?: string; record?: { id?: string; email?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  // Supabase webhook peut envoyer { record: { id, email } } ou { user_id, email } direct
  const userId = body.user_id || body.record?.id
  const email = body.email || body.record?.email
  if (!email) return NextResponse.json({ error: 'Email manquant' }, { status: 400 })

  // Récupérer 3 biens récents avec bon rendement
  const { data: biens } = await supabaseAdmin
    .from('biens')
    .select('id, type_bien, ville, metropole, prix_fai, surface, rendement_brut, strategie_mdb, photo_url, moteurimmo_data')
    .eq('regex_statut', 'valide')
    .not('prix_fai', 'is', null)
    .not('rendement_brut', 'is', null)
    .gte('rendement_brut', 0.07)
    .in('statut', ['disponible', 'a_negocier'])
    .order('created_at', { ascending: false })
    .limit(3)

  const html = buildWelcomeHtml(biens || [])
  const result = await sendEmail(email, 'Bienvenue sur Mon Petit MDB — vos premiers biens vous attendent', html)

  if (!result.ok) {
    console.error('[welcome-email] Brevo error:', result.error, 'to:', email)
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  console.log('[welcome-email] Sent to:', email, userId ? `(user: ${userId})` : '')
  return NextResponse.json({ ok: true })
}
