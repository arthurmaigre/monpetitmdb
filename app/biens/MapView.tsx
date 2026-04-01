'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import 'leaflet/dist/leaflet.css'
import BienCard from '@/components/BienCard'

export default function MapView({ biens, userToken, watchlistIds, onWatchlistChange }: {
  biens: any[]
  userToken?: string | null
  watchlistIds?: Set<string>
  onWatchlistChange?: (bienId: string, added: boolean) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const activeMarkerRef = useRef<any>(null)
  const markerMapRef = useRef<Map<string, any>>(new Map())
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const LRef = useRef<any>(null)

  // Biens avec coords
  const biensAvecCoords = biens.filter(b => b.latitude && b.longitude)

  // Biens visibles sur la portion de carte affichee
  const visibleBiens = visibleIds.size > 0
    ? biensAvecCoords.filter(b => visibleIds.has(b.id))
    : biensAvecCoords

  const updateVisibleBiens = useCallback(() => {
    if (!mapInstance.current) return
    const bounds = mapInstance.current.getBounds()
    const ids = new Set<string>()
    biensAvecCoords.forEach(b => {
      if (bounds.contains([b.latitude, b.longitude])) ids.add(b.id)
    })
    setVisibleIds(ids)
  }, [biensAvecCoords])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return
    const container = mapRef.current

    import('leaflet').then((L) => {
      if (mapInstance.current) return // Double-check apres async (React StrictMode)
      LRef.current = L.default
      const map = L.default.map(container, {
        center: [46.6, 2.3],
        zoom: 6,
        zoomControl: true,
      })

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 18,
      }).addTo(map)

      mapInstance.current = map
      markersRef.current = L.default.layerGroup().addTo(map)
      setReady(true)

      setTimeout(() => map.invalidateSize(), 100)

      // Mettre a jour les biens visibles quand on bouge la carte
      map.on('moveend', () => updateVisibleBiens())
      map.on('zoomend', () => updateVisibleBiens())
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Mettre a jour les markers
  useEffect(() => {
    if (!ready || !mapInstance.current || !markersRef.current || !LRef.current) return

    const L = LRef.current
    const markers = markersRef.current
    markers.clearLayers()
    markerMapRef.current.clear()

    const bounds: [number, number][] = []

    const defaultIcon = L.divIcon({
      className: 'map-marker-custom',
      html: '<div class="map-marker-dot"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    const activeIcon = L.divIcon({
      className: 'map-marker-custom',
      html: '<div class="map-marker-dot active"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })

    biensAvecCoords.forEach(bien => {
      bounds.push([bien.latitude, bien.longitude])

      const marker = L.marker([bien.latitude, bien.longitude], { icon: defaultIcon })
      marker.on('click', () => {
        if (activeMarkerRef.current) activeMarkerRef.current.setIcon(defaultIcon)
        marker.setIcon(activeIcon)
        activeMarkerRef.current = marker
        setSelectedId(bien.id)
        // Scroll vers la card
        const card = cardRefs.current.get(bien.id)
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      markers.addLayer(marker)
      markerMapRef.current.set(bien.id, marker)
    })

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }

    // Init visible apres fitBounds
    setTimeout(() => updateVisibleBiens(), 500)
  }, [biens, ready])

  // Clic sur une card → centrer la carte + activer le marker
  function handleCardClick(bien: any) {
    if (!mapInstance.current || !LRef.current) return
    const L = LRef.current

    const defaultIcon = L.divIcon({ className: 'map-marker-custom', html: '<div class="map-marker-dot"></div>', iconSize: [12, 12], iconAnchor: [6, 6] })
    const activeIcon = L.divIcon({ className: 'map-marker-custom', html: '<div class="map-marker-dot active"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })

    if (activeMarkerRef.current) activeMarkerRef.current.setIcon(defaultIcon)
    const marker = markerMapRef.current.get(bien.id)
    if (marker) {
      marker.setIcon(activeIcon)
      activeMarkerRef.current = marker
    }
    setSelectedId(bien.id)
    mapInstance.current.setView([bien.latitude, bien.longitude], Math.max(mapInstance.current.getZoom(), 13), { animate: true })
  }

  return (
    <div>
      <style>{`
        .map-layout { display: flex; height: 520px; max-height: 520px; gap: 0; border-radius: 16px; overflow: hidden; border: 1.5px solid #e8e2d8; }
        .map-panel { width: 480px; flex-shrink: 0; background: #f7f4f0; border-right: 1.5px solid #e8e2d8; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: thin; scrollbar-color: #d4cdc4 transparent; }
        .map-panel::-webkit-scrollbar { width: 5px; }
        .map-panel::-webkit-scrollbar-thumb { background: #d4cdc4; border-radius: 5px; }
        .map-panel::-webkit-scrollbar-track { background: transparent; }
        .map-panel-count { font-size: 11px; color: #7a6a60; padding: 6px 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #e8e2d8; margin-bottom: 2px; }
        .map-card-wrap { cursor: pointer; border-radius: 14px; transition: all 150ms ease; border: 2px solid transparent; flex-shrink: 0; }
        .map-card-wrap:hover { border-color: #e8e2d8; }
        .map-card-wrap.selected { border-color: #c0392b; }
        .map-card-wrap > div { display: flex !important; flex-direction: row !important; border-radius: 12px !important; }
        .map-card-wrap > div > div:first-child { width: 180px !important; min-width: 180px !important; height: auto !important; min-height: 140px !important; }
        .map-card-wrap > div > div:first-child img { height: 100% !important; }
        .map-card-wrap > div > div:last-child { flex: 1; min-width: 0; }
        .map-container { flex: 1; min-width: 0; }
        .map-marker-custom { background: none; border: none; }
        .map-marker-dot { width: 14px; height: 14px; background: #c0392b; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transition: all 150ms ease; cursor: pointer; }
        .map-marker-dot::after { content: ''; position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; border-radius: 50%; }
        .map-marker-dot:hover { width: 20px; height: 20px; margin: -3px 0 0 -3px; background: #a5311f; box-shadow: 0 3px 10px rgba(192,57,43,0.4); }
        .map-marker-dot.active { width: 20px; height: 20px; margin: -3px 0 0 -3px; background: #1a1210; border: 3px solid #c0392b; box-shadow: 0 3px 10px rgba(0,0,0,0.4); }
        .map-info { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 13px; color: #7a6a60; }
        @media (max-width: 900px) {
          .map-layout { flex-direction: column-reverse; height: auto; }
          .map-container { height: 350px; }
          .map-panel { width: 100%; height: 280px; border-right: none; border-bottom: 1.5px solid #e8e2d8; flex-direction: row; overflow-x: auto; overflow-y: hidden; padding: 8px; gap: 8px; }
          .map-card-wrap { min-width: 340px; }
          .map-card-wrap > div { flex-direction: column !important; }
          .map-card-wrap > div > div:first-child { width: 100% !important; min-width: unset !important; height: 120px !important; min-height: unset !important; }
        }
      `}</style>
      <div className="map-info">
        <span>{biensAvecCoords.length} bien{biensAvecCoords.length > 1 ? 's' : ''} sur la carte</span>
        {biensAvecCoords.length < biens.length && (
          <span style={{ fontSize: '11px', color: '#b0a898' }}>({biens.length - biensAvecCoords.length} sans coordonn{'\u00E9'}es)</span>
        )}
      </div>
      <div className="map-layout">
        <div className="map-panel">
          <div className="map-panel-count">{visibleBiens.length} bien{visibleBiens.length > 1 ? 's' : ''} dans la zone</div>
          {visibleBiens.map(bien => (
            <div
              key={bien.id}
              ref={el => { if (el) cardRefs.current.set(bien.id, el); else cardRefs.current.delete(bien.id) }}
              className={`map-card-wrap ${selectedId === bien.id ? 'selected' : ''}`}
              onClick={() => handleCardClick(bien)}
            >
              <BienCard
                bien={bien}
                inWatchlist={watchlistIds?.has(bien.id) || false}
                userToken={userToken || null}
                onWatchlistChange={onWatchlistChange || (() => {})}
                compact
              />
            </div>
          ))}
        </div>
        <div ref={mapRef} className="map-container" />
      </div>
    </div>
  )
}
