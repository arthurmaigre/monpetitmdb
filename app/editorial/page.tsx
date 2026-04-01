'use client'

import { Fragment, useEffect, useState, useRef } from 'react'
import Layout from '@/components/Layout'

function ArticleContentWithPhotoPicker({ content, articleId, onContentUpdate }: { content: string, articleId: string, onContentUpdate: (html: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Navigation photos uniquement
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.querySelectorAll('.ed-photo-picker').forEach(figure => {
      if (figure.querySelector('.pnav')) return
      const photosStr = figure.getAttribute('data-photos')
      if (!photosStr) return
      let photos: any[]
      try { photos = JSON.parse(photosStr.replace(/&#39;/g, "'")) } catch { return }
      if (photos.length <= 1) return

      const nav = document.createElement('div')
      nav.className = 'pnav'
      nav.style.cssText = 'position:absolute;top:50%;left:0;right:0;display:flex;justify-content:space-between;padding:0 8px;transform:translateY(-50%);pointer-events:none;opacity:0;transition:opacity 0.2s'
      nav.innerHTML = `<button style="pointer-events:all;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px">&lt;</button><button style="pointer-events:all;background:rgba(0,0,0,0.6);color:#fff;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:16px">&gt;</button>`
      const fig = figure as HTMLElement
      fig.style.position = 'relative'
      fig.appendChild(nav)
      fig.onmouseenter = () => { nav.style.opacity = '1' }
      fig.onmouseleave = () => { nav.style.opacity = '0' }

      let idx = 0
      const btns = nav.querySelectorAll('button')
      btns[0].onclick = (e) => { e.preventDefault(); idx = (idx - 1 + photos.length) % photos.length; const img = fig.querySelector('img'); const cap = fig.querySelector('figcaption'); if (img) img.src = photos[idx].url; if (cap) cap.textContent = `Photo : ${photos[idx].credit} / Unsplash (${idx + 1}/${photos.length})` }
      btns[1].onclick = (e) => { e.preventDefault(); idx = (idx + 1) % photos.length; const img = fig.querySelector('img'); const cap = fig.querySelector('figcaption'); if (img) img.src = photos[idx].url; if (cap) cap.textContent = `Photo : ${photos[idx].credit} / Unsplash (${idx + 1}/${photos.length})` }
    })
  }, [articleId, content])

  return (
    <div
      ref={containerRef}
      className="ed-article-content"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

const CATEGORIES = ['Strat\u00e9gies', 'Fiscalit\u00e9', 'Travaux', 'Financement', 'March\u00e9']
const TONES = [
  { value: 'pedagogique', label: 'P\u00e9dagogique & accessible' },
  { value: 'expert', label: 'Expert & technique' },
  { value: 'cas-pratique', label: 'Cas pratique & chiffr\u00e9' },
  { value: 'alerte', label: 'Alerte / Mise en garde' },
]
const LENGTHS = [
  { value: 'court', label: 'Court (~800 mots)' },
  { value: 'moyen', label: 'Satellite (~1500 mots)' },
  { value: 'long', label: 'Long (~2500 mots)' },
  { value: 'pilier', label: 'Pilier (~3000 mots)' },
]
const AUDIENCES = ['D\u00e9butant complet', 'Investisseur amateur', 'Profil MDB actif', 'Professionnel']

// Backlog align\u00e9 avec l'audit SEO — sujets avanc\u00e9s pr\u00e9vus S43-S52
const BACKLOG = [
  { category: 'Fiscalit\u00e9', title: 'BIC vs IS pour marchand de biens : quel r\u00e9gime choisir ?', keyword: 'marchand de biens r\u00e9gime fiscal', tone: 'cas-pratique', angle: 'SATELLITE P3. Comparer BIC et IS avec un exemple chiffr\u00e9 : achat 200k\u20ac, revente 280k\u20ac. 1500 mots. Lien vers article pilier MdB.', audience: ['Profil MDB actif'] },
  { category: 'Fiscalit\u00e9', title: 'TVA sur marge marchand de biens : calcul et exemples', keyword: 'TVA marge marchand de biens', tone: 'expert', angle: 'SATELLITE P3. M\u00e9canisme TVA sur marge 20/120, conditions, 3 pi\u00e8ges fr\u00e9quents. 1500 mots. Lien vers article pilier MdB.', audience: ['Profil MDB actif'] },
  { category: 'Strat\u00e9gies', title: 'Achat revente immobilier : la strat\u00e9gie MdB d\u00e9taill\u00e9e', keyword: 'achat revente immobilier', tone: 'pedagogique', angle: 'SATELLITE P3. Crit\u00e8res de s\u00e9lection : d\u00e9cote, localisation, travaux estimables. 1500 mots. Lien vers article pilier MdB.', audience: ['Investisseur amateur'] },
  { category: 'Travaux', title: 'Score travaux : \u00e9valuer l\'\u00e9tat d\'un bien immobilier', keyword: 'score travaux immobilier', tone: 'cas-pratique', angle: 'SATELLITE P4. Score 1-5, grille IA, impact sur budget et rentabilit\u00e9. 1500 mots. Lien vers article pilier IDR.', audience: ['Investisseur amateur'] },
  { category: 'Financement', title: 'Financer un immeuble de rapport', keyword: 'financer immeuble de rapport', tone: 'pedagogique', angle: 'SATELLITE P4. Comparer cr\u00e9dit classique, crowdfunding, fonds propres. 1500 mots. Lien vers article pilier IDR.', audience: ['Investisseur amateur', 'Profil MDB actif'] },
  { category: 'Strat\u00e9gies', title: 'Division immobili\u00e8re : cr\u00e9er de la valeur', keyword: 'division immobiliere', tone: 'expert', angle: 'SATELLITE P3. R\u00e9glementation, co\u00fbts, exemple chiffr\u00e9 avant/apr\u00e8s. 1500 mots. Lien vers article pilier MdB.', audience: ['Profil MDB actif'] },
  { category: 'Strat\u00e9gies', title: 'Revente \u00e0 la d\u00e9coupe : strat\u00e9gie et fiscalit\u00e9', keyword: 'revente a la decoupe', tone: 'expert', angle: 'SATELLITE P3. Processus complet, cr\u00e9ation copro, fiscalit\u00e9 MdB. 1500 mots. Lien vers article pilier MdB.', audience: ['Profil MDB actif'] },
  { category: 'Strat\u00e9gies', title: 'Op\u00e9ration MDB de A \u00e0 Z : simulation compl\u00e8te', keyword: 'simulation marchand de biens exemple', tone: 'cas-pratique', angle: 'Contenu avanc\u00e9. Simulation compl\u00e8te : achat 180k\u20ac, travaux 45k\u20ac, revente 295k\u20ac. Tous les frais et la fiscalit\u00e9. 2500 mots.', audience: ['Profil MDB actif', 'Professionnel'] },
]

const CAL_STATUS_LABELS: Record<string, string> = { planned: 'Planifi\u00e9', writing: 'R\u00e9daction', review: 'Relecture', published: 'Publi\u00e9' }
const CAL_STATUS_COLORS: Record<string, { bg: string, color: string }> = {
  planned: { bg: '#E8E5E0', color: '#6B6560' },
  writing: { bg: '#DBEAFE', color: '#1D4ED8' },
  review: { bg: '#FFF3E0', color: '#E65100' },
  published: { bg: '#E8F5E9', color: '#2D7A4F' },
}
const TONE_LABELS: Record<string, string> = { pedagogique: 'P\u00e9dagogique', expert: 'Expert', 'cas-pratique': 'Cas pratique', alerte: 'Alerte' }

const STATUS_LABELS: Record<string, string> = { draft: 'Brouillon', generating: 'G\u00e9n\u00e9ration...', review: '\u00c0 relire', approved: 'Approuv\u00e9', published: 'Publi\u00e9' }
const STATUS_COLORS: Record<string, { bg: string, color: string }> = {
  draft: { bg: '#F0EBE3', color: '#4A3F3B' },
  generating: { bg: '#FFF3CD', color: '#B8860B' },
  review: { bg: '#FFF3E0', color: '#E65100' },
  approved: { bg: '#E8F5E9', color: '#2D7A4F' },
  published: { bg: '#1A1614', color: '#fff' },
}

export default function EditorialPage() {
  const [tab, setTab] = useState('rediger')
  const [articles, setArticles] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [currentArticle, setCurrentArticle] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState('')

  // Form state
  const [fTitle, setFTitle] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fKeyword, setFKeyword] = useState('')
  const [fTone, setFTone] = useState('pedagogique')
  const [fLength, setFLength] = useState('moyen')
  const [fAngle, setFAngle] = useState('')
  const [fAudience, setFAudience] = useState<string[]>(['Investisseur amateur'])

  useEffect(() => {
    fetch('/api/editorial/articles').then(r => r.json()).then(d => setArticles(d.articles || []))
    fetch('/api/editorial/calendar').then(r => r.json()).then(d => setCalendar(d.calendar || []))
  }, [])

  async function handleGenerate() {
    if (!fTitle.trim()) return
    setGenerating(true)
    setGenStep('Analyse du sujet...')

    const steps = ['Structuration du plan...', 'R\u00e9daction en cours...', 'Mise en forme finale...']
    let si = 0
    const interval = setInterval(() => { si = (si + 1) % steps.length; setGenStep(steps[si]) }, 2000)

    try {
      const res = await fetch('/api/editorial/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fTitle, category: fCategory, keyword: fKeyword,
          tone: fTone, length_target: fLength, angle: fAngle,
          audience: fAudience, generate: true,
        }),
      })
      const data = await res.json()
      clearInterval(interval)
      setGenerating(false)

      if (data.article) {
        setArticles(prev => [data.article, ...prev])
        setCurrentArticle(data.article)
        setTab('articles')
        setFTitle(''); setFCategory(''); setFKeyword(''); setFAngle('')
      }
    } catch {
      clearInterval(interval)
      setGenerating(false)
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm('Supprimer cet article ?')) return
    await fetch('/api/editorial/articles', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setArticles(prev => prev.filter(a => a.id !== id))
    setCurrentArticle(null)
  }

  async function updateArticleStatus(id: string, status: string) {
    const res = await fetch('/api/editorial/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    const data = await res.json()
    if (data.article) {
      setArticles(prev => prev.map(a => a.id === id ? data.article : a))
      setCurrentArticle(data.article)
    }
  }

  async function generateCalendar() {
    setGenerating(true)
    setGenStep('Claude g\u00e9n\u00e8re 52 sujets...')
    try {
      const res = await fetch('/api/editorial/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: new Date().toISOString().slice(0, 10) }),
      })
      await res.json()
      // Recharger le calendrier
      const calRes = await fetch('/api/editorial/calendar')
      const calData = await calRes.json()
      setCalendar(calData.calendar || [])
    } catch {}
    setGenerating(false)
  }

  function detectLength(angle: string): string {
    if (!angle) return 'moyen'
    const a = angle.toLowerCase()
    if (a.includes('pilier') || a.includes('3000')) return 'pilier'
    if (a.includes('2500') || a.includes('2000')) return 'long'
    if (a.includes('1500')) return 'moyen'
    if (a.includes('800') || a.includes('600')) return 'court'
    return 'moyen'
  }

  function useBacklogItem(item: typeof BACKLOG[0]) {
    setFTitle(item.title); setFCategory(item.category); setFKeyword(item.keyword)
    setFTone(item.tone); setFAngle(item.angle); setFLength(detectLength(item.angle))
    setFAudience(item.audience || ['Investisseur amateur'])
    setTab('rediger')
  }

  function detectAudience(tone: string, angle: string): string[] {
    const a = (angle || '').toLowerCase()
    // Pages villes
    if (a.includes('ville') || a.includes('investir a') || a.includes('investir à')) return ['Investisseur amateur']
    // Par ton
    switch (tone) {
      case 'pedagogique': return ['D\u00e9butant complet', 'Investisseur amateur']
      case 'expert': return ['Investisseur amateur', 'Profil MDB actif']
      case 'cas-pratique': return ['Profil MDB actif']
      case 'alerte': return ['Investisseur amateur', 'Profil MDB actif']
      default: return ['Investisseur amateur']
    }
  }

  function useCalendarItem(item: any) {
    setFTitle(item.title || ''); setFCategory(item.category || ''); setFKeyword(item.keyword || '')
    setFTone(item.tone || 'pedagogique'); setFAngle(item.angle || ''); setFLength(detectLength(item.angle || ''))
    setFAudience(detectAudience(item.tone || 'pedagogique', item.angle || ''))
    setTab('rediger')
  }

  async function updateCalendarStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/editorial/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.entry) {
        setCalendar(prev => prev.map(w => w.id === id ? data.entry : w))
      }
    } catch {}
  }

  const reviewCount = articles.filter(a => a.status === 'review').length
  const approvedCount = articles.filter(a => a.status === 'approved').length
  const publishedCount = articles.filter(a => a.status === 'published').length

  // Grouper le calendrier par mois
  const calByMonth: Record<string, any[]> = {}
  calendar.forEach(w => {
    const d = new Date(w.week_start)
    const key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    if (!calByMonth[key]) calByMonth[key] = []
    calByMonth[key].push(w)
  })

  return (
    <Layout>
      <style>{`
        .ed-wrap { display: flex; height: calc(100vh - 56px); overflow: hidden; }
        .ed-sidebar { width: 300px; border-right: 1px solid #e2d9d0; background: #fff; display: flex; flex-direction: column; flex-shrink: 0; }
        .ed-sidebar-header { padding: 20px; border-bottom: 1px solid #e2d9d0; }
        .ed-sidebar-title { font-family: 'Fraunces', serif; font-size: 14px; margin-bottom: 12px; }
        .ed-new-btn { width: 100%; background: #c0392b; color: #fff; border: none; padding: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border-radius: 4px; }
        .ed-new-btn:hover { background: #96281b; }
        .ed-list { flex: 1; overflow-y: auto; padding: 8px; }
        .ed-item { padding: 12px; border-radius: 4px; cursor: pointer; border: 1px solid transparent; margin-bottom: 4px; }
        .ed-item:hover { background: #faf7f2; border-color: #e2d9d0; }
        .ed-item.active { background: #f0ebe3; border-color: #c0392b; }
        .ed-item-title { font-size: 13px; font-weight: 500; line-height: 1.4; margin-bottom: 6px; }
        .ed-item-meta { display: flex; justify-content: space-between; align-items: center; }
        .ed-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .ed-item-date { font-size: 10px; color: #9a8f8b; }
        .ed-stats { padding: 10px 20px; border-top: 1px solid #e2d9d0; display: flex; gap: 16px; font-size: 10px; color: #9a8f8b; }
        .ed-stat { display: flex; align-items: center; gap: 4px; }
        .ed-dot { width: 6px; height: 6px; border-radius: 50%; }
        .ed-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .ed-tabs { display: flex; gap: 0; background: #1a1614; padding: 0 24px; }
        .ed-tab { background: none; border: none; color: #9a8f8b; font-size: 12px; font-weight: 500; padding: 14px 20px; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
        .ed-tab:hover { color: #fff; }
        .ed-tab.active { color: #e8503a; border-bottom-color: #e8503a; }
        .ed-tab-count { background: #c0392b; color: #fff; font-size: 9px; padding: 1px 5px; border-radius: 3px; margin-left: 6px; }
        .ed-content { flex: 1; overflow-y: auto; padding: 32px 40px; }
        .ed-heading h2 { font-family: 'Fraunces', serif; font-size: 26px; margin-bottom: 4px; }
        .ed-heading p { font-size: 13px; color: #9a8f8b; margin-bottom: 24px; }
        .ed-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .ed-form-group { display: flex; flex-direction: column; gap: 6px; }
        .ed-form-group.full { grid-column: 1 / -1; }
        .ed-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #4a3f3b; }
        .ed-input { font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 10px 14px; border: 1px solid #e2d9d0; border-radius: 4px; outline: none; }
        .ed-input:focus { border-color: #c0392b; }
        .ed-textarea { font-family: 'DM Sans', sans-serif; font-size: 14px; padding: 10px 14px; border: 1px solid #e2d9d0; border-radius: 4px; outline: none; resize: vertical; min-height: 80px; }
        .ed-textarea:focus { border-color: #c0392b; }
        .ed-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .ed-tag { padding: 6px 12px; border: 1px solid #e2d9d0; border-radius: 3px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .ed-tag:hover { border-color: #c0392b; color: #c0392b; }
        .ed-tag.selected { background: #c0392b; border-color: #c0392b; color: #fff; }
        .ed-actions { display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid #e2d9d0; }
        .ed-btn-primary { background: #c0392b; color: #fff; border: none; padding: 11px 28px; font-size: 13px; font-weight: 600; cursor: pointer; border-radius: 4px; }
        .ed-btn-primary:hover { background: #96281b; }
        .ed-btn-secondary { background: #fff; color: #4a3f3b; border: 1px solid #e2d9d0; padding: 11px 20px; font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 4px; }
        .ed-backlog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .ed-backlog-card { background: #fff; border: 1px solid #e2d9d0; border-top: 3px solid transparent; padding: 18px; border-radius: 4px; cursor: pointer; transition: all 0.15s; }
        .ed-backlog-card:hover { border-color: #c0392b; border-top-color: #c0392b; box-shadow: 0 4px 16px rgba(192,57,43,0.08); }
        .ed-backlog-cat { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #c0392b; margin-bottom: 8px; }
        .ed-backlog-title { font-family: 'Fraunces', serif; font-size: 15px; line-height: 1.4; margin-bottom: 10px; }
        .ed-backlog-kw { font-size: 10px; color: #9a8f8b; margin-bottom: 10px; }
        .ed-backlog-btn { background: #c0392b; color: #fff; border: none; padding: 5px 12px; font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 3px; }
        .ed-backlog-btn:hover { background: #96281b; }
        .ed-editor-toolbar { padding: 14px 24px; border-bottom: 1px solid #e2d9d0; background: #fff; display: flex; justify-content: space-between; align-items: center; }
        .ed-editor-body { display: flex; flex: 1; overflow: hidden; }
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
        .ed-article-content {
          flex: 1; padding: 40px 56px; overflow-y: auto;
          line-height: 1.65; font-size: 16px; color: #2c2420;
          max-width: 780px; margin: 0 auto;
          font-family: 'Lora', Georgia, serif;
          font-feature-settings: 'kern' 1, 'liga' 1;
          -webkit-font-smoothing: antialiased;
        }
        .ed-article-content h1 {
          font-family: 'Fraunces', serif; font-size: 36px; font-weight: 800;
          line-height: 1.2; margin-bottom: 20px; color: #1a1614;
          letter-spacing: -0.02em;
        }
        .ed-article-content h1 + p:first-of-type {
          font-size: 18px; line-height: 1.7; color: #4a3f3b;
          margin-bottom: 28px; padding-bottom: 28px;
          border-bottom: 1px solid #e2d9d0;
        }
        .ed-article-content h2 {
          font-family: 'Fraunces', serif; font-size: 24px; font-weight: 700;
          margin: 48px 0 16px; color: #1a1614; line-height: 1.3;
          padding-top: 32px; border-top: 1px solid #f0ebe3;
        }
        .ed-article-content h2:first-of-type { border-top: none; padding-top: 0; }
        .ed-article-content h3 {
          font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 700;
          margin: 32px 0 12px; color: #1a1614;
          text-transform: uppercase; letter-spacing: 0.06em; font-size: 13px;
        }
        .ed-article-content p { margin-bottom: 14px; color: #3d3330; }
        .ed-article-content strong { color: #c0392b; font-weight: 600; }
        .ed-article-content ul, .ed-article-content ol {
          margin: 16px 0 24px 0; padding-left: 24px;
        }
        .ed-article-content li {
          margin-bottom: 6px; padding-left: 8px;
          line-height: 1.55;
        }
        .ed-article-content li::marker { color: #c0392b; }
        .ed-article-content blockquote {
          border-left: 4px solid #c0392b;
          padding: 20px 28px;
          margin: 32px 0;
          background: linear-gradient(135deg, #faf7f2 0%, #f5f0e8 100%);
          font-style: italic;
          color: #4a3f3b;
          font-family: 'Fraunces', serif;
          font-size: 17px;
          line-height: 1.7;
          border-radius: 0 8px 8px 0;
          position: relative;
        }
        .ed-article-content blockquote::before {
          content: '\u201C'; position: absolute; top: -8px; left: 12px;
          font-size: 48px; color: #c0392b; opacity: 0.2;
          font-family: 'Fraunces', serif;
        }
        .ed-article-content table {
          width: 100%; border-collapse: collapse; margin: 32px 0;
          font-size: 14px; border-radius: 8px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .ed-article-content th {
          background: #1a1614; color: #fff; padding: 14px 18px;
          text-align: left; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .ed-article-content td {
          padding: 12px 18px; border-bottom: 1px solid #f0ebe3;
        }
        .ed-article-content tr:nth-child(even) td { background: #faf7f2; }
        .ed-article-content tr:hover td { background: #f5f0e8; }
        .ed-article-content a {
          color: #c0392b; text-decoration: none;
          border-bottom: 1px solid rgba(192,57,43,0.3);
          transition: border-color 0.15s;
        }
        .ed-article-content a:hover { border-bottom-color: #c0392b; }
        .ed-article-content figure {
          margin: 28px 0;
        }
        .ed-article-content figure img {
          width: 100%; border-radius: 10px;
          max-height: 280px; object-fit: cover;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .ed-article-content figcaption {
          font-size: 11px; color: #9a8f8b; margin-top: 10px;
          text-align: center; font-style: italic;
        }
        .ed-article-content hr {
          border: none; height: 1px; background: #e2d9d0;
          margin: 40px 0;
        }
        .ed-aside { width: 240px; border-left: 1px solid #e2d9d0; padding: 20px; overflow-y: auto; background: #faf7f2; flex-shrink: 0; }
        .ed-aside-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9a8f8b; margin-bottom: 6px; }
        .ed-aside-value { font-size: 13px; margin-bottom: 16px; }
        .ed-seo-bar { height: 4px; background: #e2d9d0; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
        .ed-seo-fill { height: 100%; background: #2d7a4f; border-radius: 2px; }
        .ed-toolbar-btn { background: #fff; border: 1px solid #e2d9d0; border-radius: 4px; padding: 4px 10px; font-size: 12px; font-family: 'DM Sans', sans-serif; cursor: pointer; color: #4a3f3b; transition: all 0.15s; }
        .ed-toolbar-btn:hover { background: #1a1614; color: #fff; border-color: #1a1614; }
        .ed-overlay { position: fixed; inset: 0; background: rgba(26,22,20,0.7); display: flex; align-items: center; justify-content: center; z-index: 999; backdrop-filter: blur(4px); }
        .ed-overlay-box { background: #fff; padding: 40px 48px; text-align: center; border-top: 3px solid #c0392b; border-radius: 4px; }
        .ed-spinner { width: 48px; height: 48px; border: 2px solid #c0392b; border-top-color: transparent; border-radius: 50%; animation: ed-spin 0.8s linear infinite; margin: 0 auto 20px; }
        @keyframes ed-spin { to { transform: rotate(360deg); } }
        .ed-cal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ed-cal-table th { background: #1a1614; color: #fff; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
        .ed-cal-table td { padding: 10px 14px; border-bottom: 1px solid #f0ebe3; vertical-align: middle; }
        .ed-cal-table tr:hover td { background: #faf7f2; }
        .ed-cal-month-row td { background: #f0ebe3 !important; font-family: 'Fraunces', serif; font-size: 15px; font-weight: 600; padding: 14px; color: #1a1614; }
        .ed-cal-week-range { font-size: 10px; color: #9a8f8b; display: block; margin-top: 2px; }
        .ed-cal-cat-badge { font-size: 10px; font-weight: 600; color: #c0392b; text-transform: uppercase; letter-spacing: 0.06em; }
        .ed-cal-title-cell { font-weight: 500; line-height: 1.4; max-width: 280px; }
        .ed-cal-kw-cell { font-size: 11px; color: #9a8f8b; }
        .ed-cal-tone-cell { font-size: 11px; color: #4a3f3b; }
        .ed-cal-status-select { font-family: 'DM Sans', sans-serif; font-size: 11px; padding: 4px 8px; border: 1px solid #e2d9d0; border-radius: 3px; cursor: pointer; background: #fff; outline: none; }
        .ed-cal-status-select:focus { border-color: #c0392b; }
        .ed-cal-status-badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
        .ed-cal-actions { display: flex; gap: 6px; align-items: center; }
        .ed-cal-btn { background: #c0392b; color: #fff; border: none; padding: 5px 12px; font-size: 10px; font-weight: 600; cursor: pointer; border-radius: 3px; white-space: nowrap; }
        .ed-cal-btn:hover { background: #96281b; }
        .ed-cal-btn-voir { background: #fff; color: #4a3f3b; border: 1px solid #e2d9d0; padding: 5px 12px; font-size: 10px; font-weight: 600; cursor: pointer; border-radius: 3px; white-space: nowrap; text-decoration: none; }
        .ed-cal-btn-voir:hover { background: #1a1614; color: #fff; border-color: #1a1614; }
        @media (max-width: 768px) {
          .ed-wrap { flex-direction: column; height: auto; }
          .ed-sidebar { width: 100%; max-height: 200px; border-right: none; border-bottom: 1px solid #e2d9d0; }
          .ed-aside { width: 100%; border-left: none; border-top: 1px solid #e2d9d0; }
          .ed-main { min-height: 60vh; }
          .ed-overlay-box { padding: 24px 20px; }
          .ed-cal-table { font-size: 11px; }
          .ed-cal-table th, .ed-cal-table td { padding: 8px 10px; }
          .ed-cal-title-cell { max-width: 180px; }
        }
      `}</style>

      <div className="ed-wrap">
        {/* SIDEBAR */}
        <div className="ed-sidebar">
          <div className="ed-sidebar-header">
            <div className="ed-sidebar-title">Articles</div>
            <button className="ed-new-btn" onClick={() => setTab('rediger')}>+ Nouvel article</button>
          </div>
          <div className="ed-list">
            {articles.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#9a8f8b', fontSize: '12px', lineHeight: '1.6' }}>
                Aucun article pour l'instant.
              </div>
            ) : articles.map(a => (
              <div key={a.id} className={`ed-item ${currentArticle?.id === a.id ? 'active' : ''}`} onClick={() => { setCurrentArticle(a); setTab('articles') }}>
                <div className="ed-item-title">{a.title}</div>
                <div className="ed-item-meta">
                  <span className="ed-badge" style={{ background: STATUS_COLORS[a.status]?.bg, color: STATUS_COLORS[a.status]?.color }}>{STATUS_LABELS[a.status]}</span>
                  <span className="ed-item-date">{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="ed-stats">
            <div className="ed-stat"><div className="ed-dot" style={{ background: '#FF8C00' }} />{reviewCount} relecture</div>
            <div className="ed-stat"><div className="ed-dot" style={{ background: '#2d7a4f' }} />{approvedCount} approuv{'\u00e9'}s</div>
            <div className="ed-stat"><div className="ed-dot" style={{ background: '#c0392b' }} />{publishedCount} publi{'\u00e9'}s</div>
          </div>
        </div>

        {/* MAIN */}
        <div className="ed-main">
          <div className="ed-tabs">
            <button role="tab" aria-selected={tab === 'rediger'} className={`ed-tab ${tab === 'rediger' ? 'active' : ''}`} onClick={() => setTab('rediger')}>R{'\u00e9'}diger</button>
            <button role="tab" aria-selected={tab === 'backlog'} className={`ed-tab ${tab === 'backlog' ? 'active' : ''}`} onClick={() => setTab('backlog')}>Backlog <span className="ed-tab-count">{BACKLOG.length}</span></button>
            <button role="tab" aria-selected={tab === 'articles'} className={`ed-tab ${tab === 'articles' ? 'active' : ''}`} onClick={() => setTab('articles')}>Articles <span className="ed-tab-count">{articles.length}</span></button>
            <button role="tab" aria-selected={tab === 'calendrier'} className={`ed-tab ${tab === 'calendrier' ? 'active' : ''}`} onClick={() => setTab('calendrier')}>Calendrier</button>
          </div>

          {/* TAB: REDIGER */}
          {tab === 'rediger' && (
            <div className="ed-content">
              <div className="ed-heading">
                <h2>Nouvel article</h2>
                <p>Configure le sujet et Claude r{'\u00e9'}dige le premier draft complet.</p>
              </div>
              <div className="ed-form-grid">
                <div className="ed-form-group full">
                  <label className="ed-label">Titre / Sujet</label>
                  <input className="ed-input" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={"Comment choisir entre BIC et IS pour un marchand de biens ?"} />
                </div>
                <div className="ed-form-group">
                  <label className="ed-label">Cat{'\u00e9'}gorie</label>
                  <select className="ed-input" value={fCategory} onChange={e => setFCategory(e.target.value)}>
                    <option value="">S{'\u00e9'}lectionner...</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ed-form-group">
                  <label className="ed-label">Longueur cible</label>
                  <select className="ed-input" value={fLength} onChange={e => setFLength(e.target.value)}>
                    {LENGTHS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div className="ed-form-group">
                  <label className="ed-label">Ton {'\u00e9'}ditorial</label>
                  <select className="ed-input" value={fTone} onChange={e => setFTone(e.target.value)}>
                    {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="ed-form-group">
                  <label className="ed-label">Mot-cl{'\u00e9'} SEO</label>
                  <input className="ed-input" value={fKeyword} onChange={e => setFKeyword(e.target.value)} placeholder={"marchand de biens fiscalit\u00E9"} />
                </div>
                <div className="ed-form-group full">
                  <label className="ed-label">Angle / Instructions</label>
                  <textarea className="ed-textarea" value={fAngle} onChange={e => setFAngle(e.target.value)} placeholder={"Comparer les deux r\u00E9gimes avec un exemple chiffr\u00E9..."} />
                </div>
                <div className="ed-form-group full">
                  <label className="ed-label">Public cible</label>
                  <div className="ed-tags">
                    {AUDIENCES.map(a => (
                      <div key={a} className={`ed-tag ${fAudience.includes(a) ? 'selected' : ''}`} onClick={() => setFAudience(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}>
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="ed-actions">
                <button className="ed-btn-primary" onClick={handleGenerate} disabled={generating}>G{'\u00e9'}n{'\u00e9'}rer l'article</button>
                <button className="ed-btn-secondary" onClick={() => setTab('backlog')}>Choisir depuis le backlog</button>
              </div>
            </div>
          )}

          {/* TAB: BACKLOG */}
          {tab === 'backlog' && (
            <div className="ed-content">
              <div className="ed-heading">
                <h2>Backlog {'\u00e9'}ditorial</h2>
                <p>Sujets pr{'\u00e9'}-identifi{'\u00e9'}s — clic sur "Utiliser" pour pr{'\u00e9'}remplir le formulaire.</p>
              </div>
              <div className="ed-backlog-grid">
                {BACKLOG.map((item, i) => (
                  <div key={i} className="ed-backlog-card">
                    <div className="ed-backlog-cat">{item.category}</div>
                    <div className="ed-backlog-title">{item.title}</div>
                    <div className="ed-backlog-kw">{item.keyword}</div>
                    <button className="ed-backlog-btn" onClick={() => useBacklogItem(item)}>Utiliser</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ARTICLES */}
          {tab === 'articles' && (
            currentArticle ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className="ed-editor-toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: '15px', fontWeight: 700 }}>{currentArticle.title}</span>
                    <span className="ed-badge" style={{ background: STATUS_COLORS[currentArticle.status]?.bg, color: STATUS_COLORS[currentArticle.status]?.color }}>{STATUS_LABELS[currentArticle.status]}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ background: '#fff', color: '#9a8f8b', border: '1px solid #e2d9d0', padding: '7px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', borderRadius: '4px' }} onClick={() => deleteArticle(currentArticle.id)}>Supprimer</button>
                    {currentArticle.status === 'review' && (
                      <>
                        <button style={{ background: '#fff', color: '#c0392b', border: '1px solid #c0392b', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderRadius: '4px' }} onClick={() => updateArticleStatus(currentArticle.id, 'draft')}>Rejeter</button>
                        <button style={{ background: '#2d7a4f', color: '#fff', border: 'none', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderRadius: '4px' }} onClick={() => updateArticleStatus(currentArticle.id, 'approved')}>Approuver</button>
                      </>
                    )}
                    {currentArticle.status === 'draft' && (
                      <button style={{ background: '#c0392b', color: '#fff', border: 'none', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderRadius: '4px' }} onClick={async () => {
                        setGenerating(true)
                        setGenStep('R\u00e9g\u00e9n\u00e9ration en cours...')
                        try {
                          // Supprimer l'ancien puis regenerer
                          await fetch('/api/editorial/articles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentArticle.id }) })
                          const res = await fetch('/api/editorial/articles', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              title: currentArticle.title, category: currentArticle.category,
                              keyword: currentArticle.keyword, tone: currentArticle.tone,
                              length_target: currentArticle.length_target, angle: currentArticle.angle,
                              audience: currentArticle.audience, generate: true,
                            }),
                          })
                          const data = await res.json()
                          if (data.article) {
                            setArticles(prev => prev.filter(a => a.id !== currentArticle.id).concat([data.article]))
                            setCurrentArticle(data.article)
                          }
                        } catch {}
                        setGenerating(false)
                      }}>R{'\u00e9'}g{'\u00e9'}n{'\u00e9'}rer</button>
                    )}
                    {currentArticle.status === 'approved' && (
                      <button style={{ background: '#1a1614', color: '#fff', border: 'none', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', borderRadius: '4px' }} onClick={() => updateArticleStatus(currentArticle.id, 'published')}>Publier</button>
                    )}
                    {currentArticle.status === 'published' && (
                      <span style={{ fontSize: '12px', color: '#2d7a4f', fontWeight: 600 }}>Publi{'\u00e9'}</span>
                    )}
                  </div>
                </div>
                <div className="ed-editor-body">
                  <ArticleContentWithPhotoPicker content={(() => {
                    const articleHtml = currentArticle.content || ''
                    const author = currentArticle.author || 'La r\u00e9daction Mon Petit MDB'
                    // Encoder tous les accents en entites HTML pour le dangerouslySetInnerHTML
                    const authorHtml = author.split('').map((c: string) => c.charCodeAt(0) > 127 ? `&#${c.charCodeAt(0)};` : c).join('')
                    const date = currentArticle.published_at
                      ? new Date(currentArticle.published_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                      : new Date(currentArticle.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    const meta = `<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2d9d0"><div style="width:36px;height:36px;border-radius:50%;background:#c0392b;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;font-family:DM Sans,sans-serif">${author[0]}</div><div><div style="font-size:14px;font-weight:600;color:#1a1614;font-family:DM Sans,sans-serif">${authorHtml}</div><div style="font-size:12px;color:#9a8f8b;font-family:DM Sans,sans-serif">${date}</div></div></div>`
                    // Inserer apres le premier </h1>
                    const h1End = articleHtml.indexOf('</h1>')
                    if (h1End !== -1) return articleHtml.slice(0, h1End + 5) + meta + articleHtml.slice(h1End + 5)
                    return meta + articleHtml
                  })()} articleId={currentArticle.id} onContentUpdate={(html) => {
                    setArticles(prev => prev.map(a => a.id === currentArticle.id ? { ...a, content: html } : a))
                    setCurrentArticle((prev: any) => ({ ...prev, content: html }))
                    // Sauvegarder en base
                    fetch('/api/editorial/articles', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: currentArticle.id, content: html }),
                    })
                  }} />
                  <div className="ed-aside">
                    <div className="ed-aside-label">Auteur</div>
                    <select
                      value={currentArticle.author || 'La r\u00e9daction Mon Petit MDB'}
                      onChange={e => {
                        fetch('/api/editorial/articles', {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: currentArticle.id, author: e.target.value }),
                        })
                        setCurrentArticle((prev: any) => ({ ...prev, author: e.target.value }))
                        setArticles(prev => prev.map(a => a.id === currentArticle.id ? { ...a, author: e.target.value } : a))
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2d9d0', borderRadius: '4px', fontSize: '13px', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <option value="La r\u00e9daction Mon Petit MDB">La r{'\u00e9'}daction Mon Petit MDB</option>
                      <option value="Arthur Maigre">Arthur Maigr{'\u00e9'}</option>
                    </select>
                    <div className="ed-aside-label">Date de publication</div>
                    <input type="date"
                      value={currentArticle.published_at ? new Date(currentArticle.published_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                      onChange={e => {
                        const newDate = new Date(e.target.value).toISOString()
                        fetch('/api/editorial/articles', {
                          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: currentArticle.id, published_at: newDate }),
                        })
                        setCurrentArticle((prev: any) => ({ ...prev, published_at: newDate }))
                        setArticles(prev => prev.map(a => a.id === currentArticle.id ? { ...a, published_at: newDate } : a))
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2d9d0', borderRadius: '4px', fontSize: '13px', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}
                    />
                    <div className="ed-aside-label">Cat{'\u00e9'}gorie</div>
                    <div className="ed-aside-value">{currentArticle.category || '\u2014'}</div>
                    <div className="ed-aside-label">Mot-cl{'\u00e9'} SEO</div>
                    <div className="ed-aside-value">{currentArticle.keyword || '\u2014'}</div>
                    <div className="ed-aside-label">Score SEO</div>
                    <div className="ed-seo-bar"><div className="ed-seo-fill" style={{ width: `${currentArticle.seo_score || 0}%` }} /></div>
                    <div className="ed-aside-value" style={{ color: '#2d7a4f', fontWeight: 600 }}>{currentArticle.seo_score || 0}/100</div>
                    <div className="ed-aside-label">Mots</div>
                    <div className="ed-aside-value">{currentArticle.word_count || 0}</div>
                    <div className="ed-aside-label">Ton</div>
                    <div className="ed-aside-value">{TONES.find(t => t.value === currentArticle.tone)?.label || currentArticle.tone}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="ed-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                <div style={{ textAlign: 'center', color: '#9a8f8b' }}>
                  <p style={{ fontSize: '14px' }}>S{'\u00e9'}lectionnez un article dans la sidebar ou cr{'\u00e9'}ez-en un nouveau.</p>
                </div>
              </div>
            )
          )}

          {/* TAB: CALENDRIER */}
          {tab === 'calendrier' && (
            <div className="ed-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div className="ed-heading" style={{ marginBottom: 0 }}>
                  <h2>Calendrier {'\u00e9'}ditorial</h2>
                  <p>Planning des articles par semaine — statut, suivi et lancement de r{'\u00e9'}daction.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#9a8f8b' }}>
                    {calendar.filter(w => w.status === 'published').length}/{calendar.length} publi{'\u00e9'}s
                  </span>
                  <button className="ed-btn-primary" onClick={generateCalendar} disabled={generating}>
                    {calendar.length > 0 ? 'R\u00e9g\u00e9n\u00e9rer' : 'G\u00e9n\u00e9rer le planning'}
                  </button>
                </div>
              </div>

              {calendar.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#9a8f8b' }}>
                  <p>Cliquez sur <strong>G{'\u00e9'}n{'\u00e9'}rer le planning</strong> pour cr{'\u00e9'}er votre ligne {'\u00e9'}ditoriale sur 52 semaines.</p>
                </div>
              ) : (
                <table className="ed-cal-table">
                  <thead>
                    <tr>
                      <th>Semaine</th>
                      <th>Cat{'\u00e9'}gorie</th>
                      <th>Titre</th>
                      <th>Mot-cl{'\u00e9'}</th>
                      <th>Tonalit{'\u00e9'}</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(calByMonth).map(([month, weeks]) => (
                      <Fragment key={month}>
                        <tr className="ed-cal-month-row">
                          <td colSpan={7}>
                            {month}
                            <span style={{ fontSize: '11px', color: '#9a8f8b', fontFamily: "'DM Sans'", marginLeft: '12px', fontWeight: 400 }}>
                              {(weeks as any[]).length} article{(weeks as any[]).length > 1 ? 's' : ''}
                              {' \u2014 '}
                              {(weeks as any[]).filter((w: any) => w.status === 'published').length} publi{'\u00e9'}(s)
                            </span>
                          </td>
                        </tr>
                        {(weeks as any[]).map((w: any) => {
                          const weekStart = new Date(w.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          const weekEnd = new Date(w.week_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                          const linkedArticle = w.article
                          const isPublished = w.status === 'published' || linkedArticle?.status === 'published'

                          return (
                            <tr key={w.id}>
                              <td>
                                <strong>Sem. {w.week_number}</strong>
                                <span className="ed-cal-week-range">{weekStart} — {weekEnd}</span>
                              </td>
                              <td><span className="ed-cal-cat-badge">{w.category}</span></td>
                              <td className="ed-cal-title-cell">{w.title}</td>
                              <td className="ed-cal-kw-cell">{w.keyword}</td>
                              <td className="ed-cal-tone-cell">{TONE_LABELS[w.tone] || w.tone}</td>
                              <td>
                                <select
                                  className="ed-cal-status-select"
                                  value={w.status}
                                  onChange={e => updateCalendarStatus(w.id, e.target.value)}
                                  style={{
                                    background: CAL_STATUS_COLORS[w.status]?.bg || '#E8E5E0',
                                    color: CAL_STATUS_COLORS[w.status]?.color || '#6B6560',
                                    borderColor: CAL_STATUS_COLORS[w.status]?.bg || '#E8E5E0',
                                  }}
                                >
                                  {Object.entries(CAL_STATUS_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <div className="ed-cal-actions">
                                  {!isPublished && (
                                    <button className="ed-cal-btn" onClick={() => useCalendarItem(w)}>R{'\u00e9'}diger</button>
                                  )}
                                  {isPublished && linkedArticle?.slug && (
                                    <a href={`/blog/${linkedArticle.slug}`} target="_blank" rel="noopener noreferrer" className="ed-cal-btn-voir">Voir</a>
                                  )}
                                  {isPublished && !linkedArticle?.slug && (
                                    <span className="ed-cal-status-badge" style={{ background: CAL_STATUS_COLORS.published.bg, color: CAL_STATUS_COLORS.published.color }}>Publi{'\u00e9'}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* OVERLAY GENERATION */}
      {generating && (
        <div className="ed-overlay">
          <div className="ed-overlay-box">
            <div className="ed-spinner" />
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', marginBottom: '8px' }}>R{'\u00e9'}daction en cours...</div>
            <div style={{ fontSize: '12px', color: '#9a8f8b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{genStep}</div>
          </div>
        </div>
      )}
    </Layout>
  )
}
