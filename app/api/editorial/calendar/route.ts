import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Recuperer le calendrier
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('editorial_calendar')
    .select('*, article:articles(id, title, status)')
    .order('week_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calendar: data })
}

// POST - Generer le calendrier 52 semaines via Claude
export async function POST(request: NextRequest) {
  const body = await request.json()
  const startDate = body.startDate || new Date().toISOString().slice(0, 10)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non definie' }, { status: 500 })

  const systemPrompt = `Tu es le directeur editorial de "Mon Petit MDB", une plateforme francaise d'investissement immobilier pour investisseurs amateurs appliquant la methode marchand de biens (MDB).

Tu dois planifier une ligne editoriale coherente sur 52 semaines, avec exactement 1 article par semaine.

Contraintes de diversite :
- Repartition equilibree entre : Fiscalite (15 articles), Strategie d'investissement (12 articles), Travaux & renovation (8 articles), Financement (7 articles), Marche immobilier (6 articles), Guide debutant (4 articles)
- Pas deux sujets similaires consecutifs
- Alterner les tons : pedagogique, expert, cas-pratique, alerte
- Progression logique : commencer par les bases en debut d'annee, monter en expertise progressivement
- Inclure des thematiques saisonnieres si pertinent

Reponds UNIQUEMENT en JSON valide, sans backticks, sans explication. Format exact :
{"articles":[{"week":1,"category":"Fiscalite","title":"...","keyword":"...","tone":"pedagogique","angle":"...en 1 phrase"},{"week":2,...},...]}

52 objets dans le tableau, semaines 1 a 52. tone parmi : pedagogique, expert, cas-pratique, alerte.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genere le planning editorial complet de 52 semaines pour Mon Petit MDB. Reponds uniquement en JSON.' }],
      }),
    })

    const data = await res.json()
    let raw = data.content?.[0]?.text || '{}'
    raw = raw.replace(/```json|```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ error: 'JSON parse failed' }, { status: 500 }) }

    const articles = parsed.articles || []

    // Supprimer l'ancien calendrier
    await supabaseAdmin.from('editorial_calendar').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Calculer les dates de chaque semaine
    const start = getMonday(new Date(startDate))
    const rows = articles.map((a: any, i: number) => {
      const weekStart = new Date(start)
      weekStart.setDate(weekStart.getDate() + i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      return {
        week_number: a.week || i + 1,
        week_start: weekStart.toISOString().slice(0, 10),
        week_end: weekEnd.toISOString().slice(0, 10),
        category: a.category,
        title: a.title,
        keyword: a.keyword,
        tone: a.tone,
        angle: a.angle,
        status: 'planned',
      }
    })

    const { error: insertError } = await supabaseAdmin.from('editorial_calendar').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, count: rows.length })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}
