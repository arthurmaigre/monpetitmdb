'use strict'
const http = require('http')
const https = require('https')
const { spawn } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const { URL } = require('url')

// Charger les secrets depuis le fichier env au démarrage
try {
  const envContent = fs.readFileSync('/etc/monpetitmdb/scrapper_secrets.env', 'utf8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
} catch {}

const PORT = parseInt(process.env.ARTICLE_SERVER_PORT || '3099', 10)
const GENERATION_SECRET = process.env.GENERATION_SECRET || ''
const CLAUDE_BIN = process.env.CLAUDE_BIN || '/usr/bin/claude'

function checkAuth(req) {
  const provided = req.headers['x-generation-secret'] || ''
  if (!GENERATION_SECRET || !provided) return false
  const a = Buffer.alloc(128, 0)
  const b = Buffer.alloc(128, 0)
  Buffer.from(provided, 'utf8').copy(a, 0, 0, 128)
  Buffer.from(GENERATION_SECRET, 'utf8').copy(b, 0, 0, 128)
  return crypto.timingSafeEqual(a, b) && provided === GENERATION_SECRET
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch { reject(new Error('Invalid JSON')) }
    })
    req.on('error', reject)
  })
}

function spawnClaude({ model, systemPrompt, prompt, timeout }) {
  return new Promise((resolve, reject) => {
    const args = ['--print']
    if (systemPrompt) args.push('--system-prompt', systemPrompt)
    args.push('-p', prompt, '--model', model)

    // Supprimer ANTHROPIC_API_KEY pour forcer OAuth (la clé API est désactivée)
    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY

    const child = spawn(CLAUDE_BIN, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Timeout ${model} apres ${timeout}ms`))
    }, timeout)

    child.on('close', code => {
      clearTimeout(timer)
      if (code === 0 && stdout.trim()) resolve(stdout.trim())
      else reject(new Error(`Exit ${code} (${model}): ${stderr.slice(0, 300)}`))
    })
    child.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), 3000)
    https.get(url, res => {
      let data = ''
      res.on('data', d => { data += d })
      res.on('end', () => { clearTimeout(timer); resolve(data) })
    }).on('error', err => { clearTimeout(timer); reject(err) })
  })
}

function httpsPost(urlStr, body, secret) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    let parsed
    try { parsed = new URL(urlStr) } catch (e) { return reject(e) }
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : require('http')
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'x-generation-secret': secret || '',
      },
    }
    const req = lib.request(options, res => {
      res.resume()
      res.on('end', resolve)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(new Error('httpsPost timeout')) })
    req.write(payload)
    req.end()
  })
}

async function buildWebContext(title, category, googleSearchKey, googleSearchCx) {
  if (!googleSearchKey || !googleSearchCx) return ''

  let queries = []
  try {
    const claimsRaw = await spawnClaude({
      model: 'claude-haiku-4-5-20251001',
      prompt: `Extrais 3 affirmations factuelles cles a verifier pour un article sur : "${title}" (categorie : ${category}).
Reponds UNIQUEMENT en JSON valide : {"queries":["taux IS 2026","seuil micro-foncier 2026","..."]}`,
      timeout: 10_000,
    })
    const parsed = JSON.parse(claimsRaw.replace(/```json|```/g, '').trim())
    queries = (parsed.queries || []).slice(0, 3)
  } catch (err) {
    console.error('[article-server] Haiku extraction failed:', err.message)
    return ''
  }

  let webContext = ''
  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${googleSearchKey}&cx=${googleSearchCx}&q=${encodeURIComponent(q + ' france 2026')}&num=2`
      const raw = await httpsGet(url)
      const data = JSON.parse(raw)
      const snippets = (data.items || []).map(item => `[${item.title}] ${item.snippet}`).join('\n')
      if (snippets) webContext += `\nRecherche "${q}" :\n${snippets}\n`
    } catch {}
  }
  return webContext
}

async function generateArticlePipeline(body) {
  const { systemPrompt, userPrompt, reviewBasePrompt, googleSearchKey, googleSearchCx, title, category } = body
  if (!systemPrompt || !userPrompt) throw new Error('systemPrompt et userPrompt requis')

  // Étape 1+2 : webContext via Haiku + Google Custom Search
  const webContext = await buildWebContext(title || '', category || '', googleSearchKey || '', googleSearchCx || '')

  // Étape 3 : Opus génère l'article
  console.log(`[article-server] Opus generating article: "${title}"`)
  const articleHtml = await spawnClaude({
    model: 'claude-opus-4-7',
    systemPrompt,
    prompt: userPrompt,
    timeout: 260_000,
  })

  // Étape 4 : Sonnet relit et corrige
  let reviewedHtml = articleHtml
  if (reviewBasePrompt) {
    try {
      console.log(`[article-server] Sonnet reviewing article (webContext: ${webContext.length > 0 ? 'yes' : 'no'})`)
      const fullReviewPrompt = reviewBasePrompt + (webContext ? `\n\nINFORMATIONS WEB RECENTES :\n${webContext}` : '')
      const corrected = await spawnClaude({
        model: 'claude-sonnet-4-6',
        systemPrompt: fullReviewPrompt,
        prompt: `Voici l'article a relire et corriger :\n\n${articleHtml}`,
        timeout: 75_000,
      })
      if (corrected.includes('<')) reviewedHtml = corrected
    } catch (err) {
      console.error('[article-server] Sonnet review failed, using raw Opus output:', err.message)
    }
  }

  return reviewedHtml
}

async function handleGenerateArticle(body, res) {
  const { article_id, callback_url, ...pipelineBody } = body

  if (article_id && callback_url) {
    // Mode async : répondre immédiatement, générer en arrière-plan
    res.writeHead(200)
    res.end(JSON.stringify({ queued: true, article_id }))

    ;(async () => {
      let html, genError
      try {
        html = await generateArticlePipeline(pipelineBody)
      } catch (err) {
        genError = err.message
        console.error('[article-server] async generation failed:', err.message)
      }
      try {
        await httpsPost(callback_url, { article_id, html, error: genError }, GENERATION_SECRET)
        console.log(`[article-server] callback sent → ${callback_url} (article_id: ${article_id})`)
      } catch (err) {
        console.error('[article-server] callback failed:', err.message)
      }
    })()
    return
  }

  // Mode sync (backward compat)
  const html = await generateArticlePipeline(body)
  res.writeHead(200)
  res.end(JSON.stringify({ html }))
}

async function handleGenerateCalendar(body) {
  const { systemPrompt, userPrompt, model } = body
  if (!userPrompt) throw new Error('userPrompt requis')

  console.log('[article-server] Opus generating calendar S13-S52')
  const text = await spawnClaude({
    model: model || 'claude-opus-4-7',
    systemPrompt,
    prompt: userPrompt,
    timeout: 110_000,  // 110s → laisse 20s de marge réseau pour le timeout Vercel (130s)
  })

  return { text }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString(), port: PORT }))
    return
  }

  if (!checkAuth(req)) {
    res.writeHead(401)
    res.end(JSON.stringify({ error: 'Unauthorized' }))
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405)
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  let body
  try { body = await readBody(req) } catch {
    res.writeHead(400)
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  try {
    if (req.url === '/generate/article') {
      await handleGenerateArticle(body, res)
    } else if (req.url === '/generate/calendar') {
      const result = await handleGenerateCalendar(body)
      res.writeHead(200)
      res.end(JSON.stringify(result))
    } else {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  } catch (err) {
    console.error(`[article-server] Error on ${req.url}:`, err.message)
    if (!res.headersSent) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`[article-server] Listening on port ${PORT} — CLAUDE_BIN=${CLAUDE_BIN}`)
})
