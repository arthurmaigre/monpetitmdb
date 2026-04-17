---
description: Scaffolde une nouvelle route API Next.js avec le bon squelette (auth, await params, erreurs)
---

# Nouvelle Route API

Crée une route API Next.js App Router suivant les conventions du projet.

## Template route protégée (user auth)

```typescript
// app/api/{domaine}/[id]/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params  // OBLIGATOIRE — await params (bug Next.js 16)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // TODO: logique métier ici
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return Response.json(data)
  } catch (err) {
    console.error('[GET /api/{domaine}/[id]]', err)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

## Template route cron (CRON_SECRET)

```typescript
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // logique cron...
}
```

## Instructions

Si $ARGUMENTS contient le nom/chemin de la route → créer directement ce fichier.
Sinon → demander : nom de la route, type d'auth (user/cron/public), méthodes HTTP nécessaires.
