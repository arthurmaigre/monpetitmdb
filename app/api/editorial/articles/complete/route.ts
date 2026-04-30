import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { replacePhotosWithUnsplash } from '@/lib/editorial'

export const maxDuration = 60

// Webhook appelé par le VPS quand la génération est terminée
export async function POST(request: NextRequest) {
  if (request.headers.get('x-generation-secret') !== process.env.GENERATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { article_id, html, error: genError } = await request.json()
  if (!article_id) return NextResponse.json({ error: 'article_id requis' }, { status: 400 })

  if (genError || !html) {
    await supabaseAdmin
      .from('articles')
      .update({ status: 'failed', gen_error: genError || 'Erreur inconnue', updated_at: new Date().toISOString() })
      .eq('id', article_id)
    return NextResponse.json({ ok: true })
  }

  const finalHtml = await replacePhotosWithUnsplash(html)
  const wordCount = finalHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w: string) => w.length > 0).length
  const seoScore = Math.min(95, 55 + (wordCount > 800 ? 15 : 5) + Math.floor(Math.random() * 10))

  await supabaseAdmin
    .from('articles')
    .update({
      content: finalHtml,
      status: 'review',
      word_count: wordCount,
      seo_score: seoScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', article_id)

  return NextResponse.json({ ok: true })
}
