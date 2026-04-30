/**
 * Gestion des brouillons locaux (état bleu) pour les champs éditables.
 * Les valeurs saisies mais non encore soumises à la DB sont stockées dans
 * localStorage avec un TTL de 30 jours.
 *
 * Clé : mdb_drafts_{bienId}
 * Valeur : { data: Record<string, number>, expiresAt: timestamp }
 */

const TTL_MS = 30 * 24 * 3600 * 1000 // 30 jours
const KEY = (bienId: string) => `mdb_drafts_${bienId}`

export function getDrafts(bienId: string): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(KEY(bienId))
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY(bienId))
      return {}
    }
    return parsed.data || {}
  } catch {
    return {}
  }
}

export function setDraft(bienId: string, champ: string, val: number | null) {
  if (typeof window === 'undefined') return
  try {
    const existing = getDrafts(bienId)
    if (val === null) {
      delete existing[champ]
    } else {
      existing[champ] = val
    }
    if (Object.keys(existing).length === 0) {
      localStorage.removeItem(KEY(bienId))
    } else {
      localStorage.setItem(KEY(bienId), JSON.stringify({
        data: existing,
        expiresAt: Date.now() + TTL_MS,
      }))
    }
  } catch {}
}

export function clearDraft(bienId: string, champ: string) {
  setDraft(bienId, champ, null)
}

export function clearAllDrafts(bienId: string) {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(KEY(bienId)) } catch {}
}
