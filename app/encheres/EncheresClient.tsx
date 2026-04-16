'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'
import EnchereCard from '@/components/EnchereCard'
import { Enchere } from '@/lib/types'
import { theme } from '@/lib/theme'
import { isVenteDelocalisee } from '@/lib/utils-encheres'

const MapView = dynamic(() => import('../biens/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf8f5', borderRadius: '16px', color: '#7a6a60' }}>
      Chargement de la carte...
    </div>
  ),
})

function formatPrix(n: number) {
  return n ? n.toLocaleString('fr-FR') + ' \u20AC' : '-'
}

const TYPES_BIEN = ['Appartement', 'Maison', 'Immeuble', 'Terrain', 'Local commercial', 'Parking', 'Mixte', 'Autre']
const OCCUPATIONS = [
  { value: '', label: 'Toutes' },
  { value: 'libre', label: 'Libre' },
  { value: 'occupe', label: 'Occupé' },
  { value: 'loue', label: 'Loué' },
]
const DATE_RANGES = [
  { value: '', label: 'Toutes dates' },
  { value: '7', label: '7 prochains jours' },
  { value: '30', label: '30 prochains jours' },
  { value: '90', label: '3 prochains mois' },
]
const TRIS = [
  { value: 'date_audience_asc', label: 'Date audience (prochaine)' },
  { value: 'prix_asc', label: 'Prix croissant' },
  { value: 'prix_desc', label: 'Prix décroissant' },
  { value: 'recent', label: 'Plus récentes' },
]

function getSessionFilters() {
  if (typeof window === 'undefined') return null
  try {
    const saved = sessionStorage.getItem('encheres_filters')
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export default function EncheresPage() {
  const saved = useRef(getSessionFilters())
  const [encheres, setEncheres] = useState<Enchere[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalEncheres, setTotalEncheres] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Vue
  const [view, setView] = useState<'grid' | 'list' | 'map'>(saved.current?.view || 'grid')

  // Filtres
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [typeBien, setTypeBien] = useState(saved.current?.typeBien || '')
  const [prixMin, setPrixMin] = useState(saved.current?.prixMin || '')
  const [prixMax, setPrixMax] = useState(saved.current?.prixMax || '')
  const [surfaceMin, setSurfaceMin] = useState(saved.current?.surfaceMin || '')
  const [surfaceMax, setSurfaceMax] = useState(saved.current?.surfaceMax || '')
  const [occupation, setOccupation] = useState(saved.current?.occupation || '')
  const [tribunal, setTribunal] = useState(saved.current?.tribunal || '')
  const [dateRange, setDateRange] = useState(saved.current?.dateRange || '')
  const [statut, setStatut] = useState(saved.current?.statut || '')
  const [keyword, setKeyword] = useState(saved.current?.keyword || '')
  const [keywordSearch, setKeywordSearch] = useState(saved.current?.keyword || '')
  const [sources, setSources] = useState<Set<string>>(new Set(saved.current?.sources || []))
  const [delocalise, setDelocalise] = useState<boolean>(saved.current?.delocalise || false)
  const [tri, setTri] = useState(saved.current?.tri || 'date_audience_asc')

  // Localisation
  const [communeSearch, setCommuneSearch] = useState(saved.current?.communeSearch || '')
  const [communeResults, setCommuneResults] = useState<any[]>([])
  const [selectedCommune, setSelectedCommune] = useState<any>(saved.current?.selectedCommune || null)

  // Auth
  const [userId, setUserId] = useState<string | null>(null)
  const [userToken, setUserToken] = useState<string | null>(null)

  // Sentinel for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data?.session?.user?.id || null)
      setUserToken(data?.session?.access_token || null)
    })
  }, [])

  // Save filters to session
  useEffect(() => {
    sessionStorage.setItem('encheres_filters', JSON.stringify({
      typeBien, prixMin, prixMax, surfaceMin, surfaceMax, occupation,
      tribunal, dateRange, statut, keyword: keywordSearch, tri, view,
      communeSearch, selectedCommune, sources: Array.from(sources), delocalise,
    }))
  }, [typeBien, prixMin, prixMax, surfaceMin, surfaceMax, occupation, tribunal, dateRange, statut, keywordSearch, tri, view, communeSearch, selectedCommune, sources, delocalise])

  // Build API URL
  function buildApiUrl(page: number, mapMode = false) {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', mapMode ? '2000' : '50')
    params.set('tri', tri)

    if (typeBien) params.set('type_bien', typeBien)
    if (prixMin) params.set('prix_min', prixMin)
    if (prixMax) params.set('prix_max', prixMax)
    if (surfaceMin) params.set('surface_min', surfaceMin)
    if (surfaceMax) params.set('surface_max', surfaceMax)
    if (occupation) params.set('occupation', occupation)
    if (tribunal) params.set('tribunal', tribunal)
    if (dateRange) params.set('date_audience_max', dateRange)
    if (statut) params.set('statut', statut)
    if (keywordSearch) params.set('keyword', keywordSearch)

    if (sources.size > 0 && sources.size < 3) params.set('source', Array.from(sources).join(','))
    if (delocalise) params.set('delocalise', 'true')

    if (selectedCommune) {
      params.set('locationType', selectedCommune.type || 'commune')
      params.set('locationValue', selectedCommune.nom || selectedCommune.value || '')
      if (selectedCommune.code_postal) params.set('locationCP', selectedCommune.code_postal)
    }

    return `/api/encheres?${params}`
  }

  // Fetch encheres
  const fetchEncheres = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = buildApiUrl(1, view === 'map')
      const res = await fetch(url, { headers: userToken ? { Authorization: `Bearer ${userToken}` } : {} })
      if (!res.ok) throw new Error('Erreur chargement')
      const data = await res.json()
      setEncheres(data.encheres || [])
      setTotalEncheres(data.total || 0)
      setCurrentPage(1)
      setHasMore(data.hasMore || false)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [typeBien, prixMin, prixMax, surfaceMin, surfaceMax, occupation, tribunal, dateRange, statut, keywordSearch, tri, view, selectedCommune, userToken, sources, delocalise])

  useEffect(() => { fetchEncheres() }, [fetchEncheres])

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || view === 'map') return
    const observer = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true)
        const nextPage = currentPage + 1
        try {
          const res = await fetch(buildApiUrl(nextPage), { headers: userToken ? { Authorization: `Bearer ${userToken}` } : {} })
          const data = await res.json()
          setEncheres(prev => [...prev, ...(data.encheres || [])])
          setCurrentPage(nextPage)
          setHasMore(data.hasMore || false)
        } catch {}
        setLoadingMore(false)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, currentPage, view])

  // Commune search
  useEffect(() => {
    if (communeSearch.length < 2) { setCommuneResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/communes?q=${encodeURIComponent(communeSearch)}`)
        const data = await res.json()
        setCommuneResults(data.results || [])
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [communeSearch])

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: theme.radii.sm,
    border: `1px solid ${theme.colors.sand}`, fontFamily: theme.fonts.body,
    fontSize: theme.fontSizes.sm, width: '100%',
    background: theme.colors.card,
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 600, color: theme.colors.muted,
    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    marginBottom: '4px', display: 'block',
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: `${theme.spacing[6]} ${theme.spacing[4]}` }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing[5], flexWrap: 'wrap', gap: theme.spacing[3] }}>
          <div>
            <h1 style={{ fontFamily: theme.fonts.display, fontSize: '28px', fontWeight: 700, margin: 0 }}>
              Enchères Judiciaires
            </h1>
            <p style={{ color: theme.colors.muted, fontSize: theme.fontSizes.sm, marginTop: theme.spacing[1] }}>
              {totalEncheres} enchères{!loading && ` trouvées`}
            </p>
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', background: theme.colors.sandLight, borderRadius: theme.radii.md, padding: '4px' }}>
            {(['grid', 'list', 'map'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 16px', border: 'none', borderRadius: theme.radii.sm,
                  background: view === v ? theme.colors.card : 'transparent',
                  color: view === v ? theme.colors.ink : theme.colors.muted,
                  fontWeight: view === v ? 600 : 400,
                  cursor: 'pointer', fontSize: theme.fontSizes.sm,
                  fontFamily: theme.fonts.body,
                  boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {v === 'grid' ? 'Grille' : v === 'list' ? 'Liste' : 'Carte'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: theme.colors.card, borderRadius: theme.radii.lg,
          padding: theme.spacing[4], marginBottom: theme.spacing[5],
          border: `1px solid ${theme.colors.sand}`,
        }}>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: theme.spacing[2],
              fontFamily: theme.fonts.display, fontSize: theme.fontSizes.md,
              fontWeight: 600, color: theme.colors.ink, padding: 0,
            }}
          >
            Filtres {filtersOpen ? '▾' : '▸'}
          </button>

          {filtersOpen && (
            <div style={{ marginTop: theme.spacing[4], display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: theme.spacing[3] }}>
              {/* Localisation */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Localisation</label>
                <input
                  style={inputStyle}
                  placeholder="Ville, département..."
                  value={selectedCommune ? selectedCommune.label || selectedCommune.nom : communeSearch}
                  onChange={e => {
                    setCommuneSearch(e.target.value)
                    if (selectedCommune) setSelectedCommune(null)
                  }}
                />
                {communeResults.length > 0 && !selectedCommune && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: theme.colors.card, border: `1px solid ${theme.colors.sand}`,
                    borderRadius: theme.radii.sm, maxHeight: 200, overflowY: 'auto', zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}>
                    {communeResults.map((c: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => { setSelectedCommune(c); setCommuneSearch(''); setCommuneResults([]) }}
                        style={{
                          padding: '8px 12px', cursor: 'pointer', fontSize: theme.fontSizes.sm,
                          borderBottom: i < communeResults.length - 1 ? `1px solid ${theme.colors.sandLight}` : 'none',
                        }}
                      >
                        {c.label || c.nom}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Type bien */}
              <div>
                <label style={labelStyle}>Type de bien</label>
                <select style={inputStyle} value={typeBien} onChange={e => setTypeBien(e.target.value)}>
                  <option value="">Tous</option>
                  {TYPES_BIEN.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Prix min */}
              <div>
                <label style={labelStyle}>Prix min</label>
                <input style={inputStyle} type="number" placeholder="0" value={prixMin} onChange={e => setPrixMin(e.target.value)} />
              </div>

              {/* Prix max */}
              <div>
                <label style={labelStyle}>Prix max</label>
                <input style={inputStyle} type="number" placeholder="5 000 000" value={prixMax} onChange={e => setPrixMax(e.target.value)} />
              </div>

              {/* Surface min */}
              <div>
                <label style={labelStyle}>Surface min (m²)</label>
                <input style={inputStyle} type="number" placeholder="0" value={surfaceMin} onChange={e => setSurfaceMin(e.target.value)} />
              </div>

              {/* Surface max */}
              <div>
                <label style={labelStyle}>Surface max (m²)</label>
                <input style={inputStyle} type="number" placeholder="10 000" value={surfaceMax} onChange={e => setSurfaceMax(e.target.value)} />
              </div>

              {/* Occupation */}
              <div>
                <label style={labelStyle}>Occupation</label>
                <select style={inputStyle} value={occupation} onChange={e => setOccupation(e.target.value)}>
                  {OCCUPATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Tribunal */}
              <div>
                <label style={labelStyle}>Tribunal</label>
                <input style={inputStyle} placeholder="Bobigny" value={tribunal} onChange={e => setTribunal(e.target.value)} />
              </div>

              {/* Date audience */}
              <div>
                <label style={labelStyle}>Date audience</label>
                <select style={inputStyle} value={dateRange} onChange={e => setDateRange(e.target.value)}>
                  {DATE_RANGES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {/* Statut */}
              <div>
                <label style={labelStyle}>Statut</label>
                <select style={inputStyle} value={statut} onChange={e => setStatut(e.target.value)}>
                  <option value="">À venir + Surenchère</option>
                  <option value="a_venir">À venir</option>
                  <option value="surenchere">En surenchère</option>
                  <option value="adjuge">Adjugé</option>
                </select>
              </div>

              {/* Tri */}
              <div>
                <label style={labelStyle}>Trier par</label>
                <select style={inputStyle} value={tri} onChange={e => setTri(e.target.value)}>
                  {TRIS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Keyword */}
              <div>
                <label style={labelStyle}>Recherche</label>
                <input
                  style={inputStyle}
                  placeholder="Mot-clé..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setKeywordSearch(keyword) }}
                  onBlur={() => setKeywordSearch(keyword)}
                />
              </div>

              {/* Sources */}
              <div>
                <label style={labelStyle}>Source</label>
                <select style={inputStyle} value={sources.size === 1 ? Array.from(sources)[0] : ''} onChange={e => {
                  const v = e.target.value
                  setSources(v ? new Set([v]) : new Set())
                }}>
                  <option value="">Toutes</option>
                  <option value="licitor">Licitor</option>
                  <option value="avoventes">Avoventes</option>
                  <option value="vench">Vench</option>
                </select>
              </div>

              {/* Délocalisée */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '20px' }}>
                <input
                  type="checkbox"
                  id="filter-delocalise"
                  checked={delocalise}
                  onChange={e => setDelocalise(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#e65100' }}
                />
                <label htmlFor="filter-delocalise" style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer' }}>
                  📍 Délocalisées uniquement
                </label>
              </div>
            </div>
          )}

          {/* Active filters + reset */}
          {(typeBien || prixMin || prixMax || surfaceMin || surfaceMax || occupation || tribunal || dateRange || statut || selectedCommune || keywordSearch || sources.size > 0 || delocalise) && (
            <div style={{ marginTop: theme.spacing[3], display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => {
                  setTypeBien(''); setPrixMin(''); setPrixMax(''); setSurfaceMin(''); setSurfaceMax('')
                  setOccupation(''); setTribunal(''); setDateRange(''); setStatut('')
                  setSelectedCommune(null); setCommuneSearch(''); setKeyword(''); setKeywordSearch('')
                  setSources(new Set()); setDelocalise(false)
                }}
                style={{
                  padding: '4px 12px', borderRadius: theme.radii.sm,
                  border: `1px solid ${theme.colors.sand}`, background: theme.colors.sandLight,
                  cursor: 'pointer', fontSize: '12px', color: theme.colors.muted,
                  fontFamily: theme.fonts.body,
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: theme.spacing[4], background: '#fef2f2', borderRadius: theme.radii.md, color: '#c0392b', marginBottom: theme.spacing[4] }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: theme.spacing[6], color: theme.colors.muted }}>
            Chargement des enchères...
          </div>
        )}

        {/* Grid view */}
        {!loading && view === 'grid' && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: theme.spacing[4],
            }}>
              {encheres.map(e => (
                <EnchereCard key={e.id} enchere={e} />
              ))}
            </div>
            {encheres.length === 0 && (
              <div style={{ textAlign: 'center', padding: theme.spacing[6], color: theme.colors.muted }}>
                Aucune enchère ne correspond à vos critères.
              </div>
            )}
          </>
        )}

        {/* List view */}
        {!loading && view === 'list' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: theme.fonts.body, fontSize: theme.fontSizes.sm }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${theme.colors.sand}`, textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Bien</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Ville</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Mise à prix</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Adjugé</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Surface</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Occupation</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Tribunal</th>
                  <th style={{ padding: '12px 8px', fontWeight: 600 }}>Audience</th>
                  <th style={{ padding: '12px 8px' }}></th>
                </tr>
              </thead>
              <tbody>
                {encheres.map(e => {
                  const countdown = e.date_audience ? Math.ceil((new Date(e.date_audience).getTime() - Date.now()) / 86400000) : null
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${theme.colors.sandLight}` }}>
                      <td style={{ padding: '10px 8px', fontWeight: 500 }}>
                        {e.type_bien}{e.nb_pieces ? ` ${e.nb_pieces}p` : ''}
                      </td>
                      <td style={{ padding: '10px 8px' }}>{e.ville}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{formatPrix(e.mise_a_prix)}</td>
                      <td style={{ padding: '10px 8px', color: e.prix_adjuge ? theme.colors.ink : theme.colors.textTertiary }}>
                        {e.prix_adjuge ? formatPrix(e.prix_adjuge) : '-'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>{e.surface ? `${e.surface} m²` : '-'}</td>
                      <td style={{ padding: '10px 8px' }}>
                        {OCCUPATIONS.find(o => o.value === e.occupation)?.label || '-'}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '12px' }}>
                        {formatTribunal(e.tribunal)}
                        {isVenteDelocalisee(e.departement, e.tribunal) && (
                          <span style={{ marginLeft: '6px', background: '#fff3e0', color: '#e65100', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 600 }} title="La vente se déroule dans un tribunal d'un autre département">📍 Délocalisée</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        {e.date_audience ? new Date(e.date_audience).toLocaleDateString('fr-FR') : '-'}
                        {countdown !== null && countdown >= 0 && (
                          <span style={{
                            marginLeft: '6px', fontSize: '11px', fontWeight: 600,
                            color: countdown <= 7 ? '#c0392b' : countdown <= 14 ? '#e67e22' : theme.colors.muted,
                          }}>
                            J-{countdown}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <a href={`/encheres/${e.id}`} style={{
                          padding: '6px 12px', borderRadius: theme.radii.sm,
                          background: theme.colors.sandLight, border: `1px solid ${theme.colors.sand}`,
                          color: theme.colors.ink, textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                        }}>
                          Analyse
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Map view */}
        {!loading && view === 'map' && (
          <MapView biens={encheres as any} userToken={userToken} />
        )}

        {/* Infinite scroll sentinel */}
        {view !== 'map' && <div ref={sentinelRef} style={{ height: 1 }} />}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: theme.spacing[4], color: theme.colors.muted }}>
            Chargement...
          </div>
        )}
      </div>
    </Layout>
  )
}

function formatTribunal(tribunal: string | null): string {
  if (!tribunal) return '-'
  return tribunal.replace(/Tribunal Judiciaire de\s*/i, 'TJ ').trim()
}
