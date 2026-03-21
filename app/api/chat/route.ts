import { NextRequest } from 'next/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  free: `Tu es l'assistant Mon Petit MDB, une plateforme de sourcing immobilier pour investisseurs particuliers.
Tu r\u00E9ponds aux questions g\u00E9n\u00E9rales sur l'investissement immobilier, les strat\u00E9gies (locataire en place, travaux lourds, division, d\u00E9coupe) et la plateforme Mon Petit MDB.
Sois concis et p\u00E9dagogue. Si l'utilisateur pose une question avanc\u00E9e sur les calculs ou la fiscalit\u00E9, invite-le \u00E0 cr\u00E9er un compte pour acc\u00E9der au simulateur fiscal complet.
Ne donne pas de conseils fiscaux personnalis\u00E9s.`,

  pro: `Tu es l'assistant expert Mon Petit MDB. Tu aides les investisseurs \u00E0 comprendre leurs analyses.
Tu peux expliquer en d\u00E9tail :
- Les calculs de rendement brut et net
- Le cashflow et le prix cible
- L'estimation DVF et les correcteurs
- Les strat\u00E9gies MDB (locataire en place, travaux lourds, division, d\u00E9coupe)
- 2 r\u00E9gimes fiscaux : celui choisi par l'utilisateur + un comparatif

R\u00E9gimes disponibles : Nu Micro-foncier (abattement 30%, TMI + PS 17.2%), Nu R\u00E9el foncier (charges d\u00E9ductibles, d\u00E9ficit foncier 10700\u20AC/an), LMNP Micro-BIC (abattement 50%), LMNP R\u00E9el BIC (amortissement composants, TMI seul), LMP R\u00E9el BIC, SCI \u00E0 l'IS, Marchand de biens IS.

Si un contexte de bien est fourni, utilise-le pour personnaliser tes r\u00E9ponses.
Sois pr\u00E9cis avec les chiffres. Utilise \u20AC pour les montants.`,

  expert: `Tu es l'assistant fiscal expert Mon Petit MDB. Tu ma\u00EEtrises parfaitement la fiscalit\u00E9 immobili\u00E8re fran\u00E7aise (LFI 2025 int\u00E9gr\u00E9e).

7 R\u00C9GIMES FISCAUX :
1. Nu Micro-foncier : abattement 30%, TMI + PS 17.2%, loyers \u2264 15000\u20AC/an
2. Nu R\u00E9el foncier : charges d\u00E9ductibles (int\u00E9r\u00EAts, TF, copro, PNO, gestion), TMI + PS 17.2%, d\u00E9ficit foncier 10700\u20AC/an sur revenu global
3. LMNP Micro-BIC : abattement 50%, TMI + PS 17.2%, recettes \u2264 77700\u20AC/an
4. LMNP R\u00E9el BIC : amortissement composants (structure 40%/50ans, toiture 10%/25ans, second oeuvre 25%/15ans, \u00E9quipements 15%/10ans), TMI seul. R\u00E9forme LFI 2025 : r\u00E9int\u00E9gration amortissements dans base PV \u00E0 la revente.
5. LMP R\u00E9el BIC : si recettes > 23000\u20AC ET > autres revenus. D\u00E9ficit sur revenu global. PV pro exon\u00E9r\u00E9e si recettes < 90k et > 5 ans. Cotisations SSI ~45%.
6. SCI \u00E0 l'IS : IS 15% (\u226442500\u20AC) puis 25%. Amortissement. PV sur VNC. Pas d'abattement dur\u00E9e. Double imposition IS + flat tax 30% dividendes.
7. Marchand de biens IS : biens = stocks, pas d'amortissement. TVA sur marge = marge \u00D7 20/120. Frais notaire 2.5% (engagement revente 5 ans). IS 15/25%.

ABATTEMENTS PV (r\u00E9gimes particuliers) : 0% < 6 ans, 6%/an IR + 1.65%/an PS (6-21 ans), exo IR \u00E0 22 ans, exo totale \u00E0 30 ans.

ESTIMATION DVF : bas\u00E9e sur transactions notariales r\u00E9elles, filtre nb pi\u00E8ces exact, rayon adaptatif 50m\u21921100m. Estimation = prix march\u00E9 "en bon \u00E9tat" = prix de revente apr\u00E8s travaux.

Tu peux faire des simulations chiffr\u00E9es compl\u00E8tes. Utilise les donn\u00E9es du bien si fournies.
Sois pr\u00E9cis, technique, et cite les articles du CGI quand pertinent.`,
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface BienContext {
  type_bien: string
  ville: string
  prix_fai: number
  loyer: number
  surface: number
  rendement_brut: number
  estimation_prix_total: number
  score_travaux: number
  strategie_mdb: string
  dpe: string
  charges_copro: number
  taxe_fonc_ann: number
}

interface ChatRequestBody {
  messages: ChatMessage[]
  plan: 'free' | 'pro' | 'expert' | null
  context?: BienContext
}

function getModel(plan: string | null): string {
  if (!plan || plan === 'free') {
    return 'claude-haiku-4-5-20251001'
  }
  return 'claude-sonnet-4-20250514'
}

function getMaxTokens(plan: string | null): number {
  if (!plan || plan === 'free') return 500
  if (plan === 'pro') return 1000
  return 2000
}

function getSystemPrompt(plan: string | null): string {
  if (!plan || plan === 'free') return SYSTEM_PROMPTS.free
  return SYSTEM_PROMPTS[plan] || SYSTEM_PROMPTS.free
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json()
    const { messages, plan, context } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration API manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let systemPrompt = getSystemPrompt(plan)
    if (context) {
      systemPrompt += `\n\nContexte du bien consult\u00E9 : ${JSON.stringify(context)}`
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: getModel(plan),
        max_tokens: getMaxTokens(plan),
        stream: true,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    if (!anthropicRes.ok) {
      const errorData = await anthropicRes.text()
      console.error('Anthropic API error:', anthropicRes.status, errorData)
      return new Response(
        JSON.stringify({ error: 'Erreur API IA' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = anthropicRes.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue

              try {
                const event = JSON.parse(data)
                if (
                  event.type === 'content_block_delta' &&
                  event.delta?.type === 'text_delta' &&
                  event.delta?.text
                ) {
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text)
                  )
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    const message =
      error instanceof Error ? error.message : 'Erreur interne'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
