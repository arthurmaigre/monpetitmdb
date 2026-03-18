/**
 * Script de calcul des prix parking/box par ville via DVF
 * Requete les transactions de dependances (garages, parkings) dans chaque metropole
 *
 * Usage : node scripts/load_ref_parking.js
 */

const { createClient } = require('@supabase/supabase-js')
const https = require('https')

const SUPABASE_URL = 'https://evylshvjvzopycwvzaqy.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eWxzaHZqdnpvcHljd3Z6YXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzAzMDYzMCwiZXhwIjoyMDg4NjA2NjMwfQ.Lao87eCjNFi2Dve4OLZvZOtn3D_mZUKIhTjdpHLRMUU'

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Centres des metropoles (lat, lng) avec rayon de recherche
const METROPOLES = [
  { nom: 'Paris', lat: 48.8566, lng: 2.3522, metropole: 'Grand Paris' },
  { nom: 'Lyon', lat: 45.7640, lng: 4.8357, metropole: 'Metropole de Lyon' },
  { nom: 'Marseille', lat: 43.2965, lng: 5.3698, metropole: 'Aix-Marseille-Provence' },
  { nom: 'Nantes', lat: 47.2184, lng: -1.5536, metropole: 'Nantes Metropole' },
  { nom: 'Bordeaux', lat: 44.8378, lng: -0.5792, metropole: 'Bordeaux Metropole' },
  { nom: 'Toulouse', lat: 43.6047, lng: 1.4442, metropole: 'Toulouse Metropole' },
  { nom: 'Rennes', lat: 48.1173, lng: -1.6778, metropole: 'Rennes Metropole' },
  { nom: 'Lille', lat: 50.6292, lng: 3.0573, metropole: 'Lille Metropole' },
  { nom: 'Nice', lat: 43.7102, lng: 7.2620, metropole: 'Nice Cote d Azur' },
  { nom: 'Strasbourg', lat: 48.5734, lng: 7.7521, metropole: 'Strasbourg Eurometropole' },
  { nom: 'Montpellier', lat: 43.6108, lng: 3.8767, metropole: 'Montpellier Mediterranee Metropole' },
  { nom: 'Grenoble', lat: 45.1885, lng: 5.7245, metropole: 'Grenoble Alpes Metropole' },
  { nom: 'Rouen', lat: 49.4432, lng: 1.0999, metropole: 'Rouen Normandie' },
  { nom: 'Toulon', lat: 43.1242, lng: 5.9280, metropole: 'Toulon Provence Mediterranee' },
  { nom: 'Dijon', lat: 47.3220, lng: 5.0415, metropole: 'Dijon Metropole' },
  { nom: 'Tours', lat: 47.3941, lng: 0.6848, metropole: 'Tours Metropole Val de Loire' },
  { nom: 'Clermont-Ferrand', lat: 45.7772, lng: 3.0870, metropole: 'Clermont Auvergne Metropole' },
  { nom: 'Saint-Etienne', lat: 45.4397, lng: 4.3872, metropole: 'Saint-Etienne Metropole' },
  { nom: 'Metz', lat: 49.1193, lng: 6.1757, metropole: 'Metz Metropole' },
  { nom: 'Nancy', lat: 48.6921, lng: 6.1844, metropole: 'Grand Nancy' },
  { nom: 'Orleans', lat: 47.9029, lng: 1.9093, metropole: 'Orleans Metropole' },
  { nom: 'Brest', lat: 48.3904, lng: -4.4861, metropole: 'Brest Metropole' },
]

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function median(arr) {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function fetchParkingPrices(ville) {
  const rayon = 0.008 // ~800m centre-ville
  const bbox = `${ville.lng - rayon},${ville.lat - rayon},${ville.lng + rayon},${ville.lat + rayon}`
  const url = `https://apidf-preprod.cerema.fr/dvf_opendata/geomutations/?in_bbox=${bbox}&nature_mutation=Vente&anneemut_min=2020&page_size=50`

  const allPrix = []

  try {
    let nextUrl = url
    let pages = 0
    while (nextUrl && pages < 3) {
      const data = await fetchJSON(nextUrl)
      for (const f of (data.features || [])) {
        const p = f.properties
        // Dependances seules (parking/garage sans logement)
        if (p.nblocmut === 0 && p.nbvolmut === 0 && parseFloat(p.valeurfonc) > 0) {
          const prix = parseFloat(p.valeurfonc)
          // Filtrer les prix aberrants
          if (prix >= 2000 && prix <= 80000) {
            allPrix.push(prix)
          }
        }
        // Ou bien type "dependance" explicite
        if (p.libtypbien && p.libtypbien.toLowerCase().includes('pendance')) {
          const prix = parseFloat(p.valeurfonc)
          if (prix >= 2000 && prix <= 80000) {
            allPrix.push(prix)
          }
        }
      }
      nextUrl = data.next ? data.next.replace('http://', 'https://') : null
      pages++
    }
  } catch (e) {
    console.log(`  Erreur ${ville.nom}: ${e.message}`)
  }

  return allPrix
}

async function main() {
  console.log('Calcul des prix parking/box par ville via DVF...\n')

  const results = []

  for (const ville of METROPOLES) {
    process.stdout.write(`  ${ville.nom}...`)
    const prix = await fetchParkingPrices(ville)

    if (prix.length >= 3) {
      const med = median(prix)
      // Estimation box ferme = median, parking ouvert = 55% du box
      const prixBox = med
      const prixParking = Math.round(med * 0.55)
      console.log(` ${prix.length} transactions, median ${med} EUR (box ~${prixBox}, parking ~${prixParking})`)
      results.push({
        ville: ville.nom,
        metropole: ville.metropole,
        prix_median_box: prixBox,
        prix_median_parking: prixParking,
        nb_transactions: prix.length,
        derniere_maj: new Date().toISOString()
      })
    } else {
      console.log(` ${prix.length} transactions (insuffisant)`)
    }

    // Pause pour ne pas saturer l'API
    await new Promise(r => setTimeout(r, 2000))
  }

  if (results.length === 0) {
    console.log('\nAucun resultat. Verifier l\'API DVF.')
    return
  }

  // Vider et re-inserer
  console.log(`\nInsertion de ${results.length} villes...`)
  await sb.from('ref_prix_parking').delete().neq('id', 0)
  const { error } = await sb.from('ref_prix_parking').insert(results)
  if (error) console.log('Erreur insertion:', error.message)
  else console.log('OK !')

  console.log('\nRecap:')
  results.sort((a, b) => b.prix_median_box - a.prix_median_box)
  for (const r of results) {
    console.log(`  ${r.ville.padEnd(20)} Box: ${String(r.prix_median_box).padStart(6)} EUR | Parking: ${String(r.prix_median_parking).padStart(6)} EUR | ${r.nb_transactions} tx`)
  }
}

main().catch(console.error)
