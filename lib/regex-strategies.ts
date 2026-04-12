// ──────────────────────────────────────────────────────────────────────────────
// Regex patterns per strategy — shared between webhook pre-filter & cron batch
// ──────────────────────────────────────────────────────────────────────────────

export interface RegexConfig {
  valid: RegExp[]
  exclude: RegExp[]
}

export const REGEX_CONFIGS: Record<string, RegexConfig> = {
  'Locataire en place': {
    valid: [
      /locataire\s+en\s+place/i,
      /vendu\s+lou[eé]/i,
      /bail\s+en\s+cours/i,
      /loyer\s+en\s+place/i,
      /bien\s+occup[eé]\s+lou[eé]/i,
      /occup[eé]\s+par\s+(un\s+)?locataire/i,
      /lou[eé]\s+et\s+occup[eé]/i,
      /vente\s+occup[eé]e?/i,
      /lou[eé]\s+en\s+place/i,
      /bail\s+(actif|restant|en\s+vigueur)/i,
      /locataire\s+(actuel|pr[eé]sent)/i,
      /lou[eé]\s+(actuellement|depuis\s+\d+)/i,
      /revenus?\s+locatifs?\s+de\s+\d+/i,
      /loyer\s+(actuel|en\s+cours|mensuel)\s+.{0,5}\d+/i,
      /rendement\s+(locatif|brut|net)\s+.{0,5}\d+/i,
      /bien\s+lou[eé]\s+(depuis|[àa]|avec)/i,
      /invest\w+\s+locatif\s+(avec|cl[eé]|imm[eé]diat)/i,
    ],
    exclude: [
      /(pas|sans|libre)\s+(de\s+)?locataire/i,
      /libre\s+de\s+(toute\s+)?occupation/i,
      /non\s+(lou[eé]|occup[eé])/i,
      /r[eé]sidence\s+(g[eé]r[eé]e|services?|senior)/i,
    ],
  },
  'Travaux lourds': {
    valid: [
      /[àa]\s+r[eé]nover/i,
      /r[eé]novation\s+(compl[eè]te|totale|enti[eè]re|int[eé]grale|lourde)/i,
      /gros\s+travaux/i,
      /tout\s+[àa]\s+refaire/i,
      /enti[eè]rement\s+[àa]\s+r[eé]nover/i,
      /[àa]\s+r[eé]habiliter/i,
      /travaux\s+importants/i,
      /vendu\s+en\s+l.[eé]tat/i,
      /toiture\s+[àa]\s+refaire/i,
      /mise\s+aux\s+normes/i,
      /inhabitable/i,
      /r[eé]novation\s+totale/i,
      /travaux\s+de\s+r[eé]novation/i,
      /[àa]\s+restaurer/i,
      /r[eé]nover\s+(enti[eè]rement|totalement|compl[eè]tement)/i,
    ],
    exclude: [
      /(pas|sans|aucun)\s+(de\s+)?(gros\s+)?travaux/i,
      /travaux\s+(r[eé]alis[eé]s|effectu[eé]s|termin[eé]s|faits)/i,
      /enti[eè]rement\s+r[eé]nov[eé]/i,
      /r[eé]cemment\s+r[eé]nov[eé]/i,
      /r[eé]novation\s+r[eé]cente/i,
      /refait\s+[àa]\s+neuf/i,
      /(pas|aucun)\s+(besoin\s+)?de\s+travaux/i,
    ],
  },
  'Division': {
    valid: [
      /(appartement|maison|bien|propri[eé]t[eé]|logement|surface)\s+.{0,15}divisible/i,
      /divisible\s+en\s+\d+\s*(lots?|logements?|appartements?|studios?)/i,
      /possibilit[eé]\s+de\s+division/i,
      /division\s+possible/i,
      /potentiel\s+de\s+division/i,
      /diviser\s+en\s+\d+/i,
      /cr[eé]er\s+(des\s+lots|\d+\s+logements|plusieurs\s+logements|deux\s+logements)/i,
      /transformer\s+en\s+plusieurs\s+(lots?|logements?|appartements?)/i,
      /id[eé]al\s+(pour\s+)?(la\s+)?division/i,
    ],
    exclude: [
      /non\s+divisible/i,
      /issu\s+d.une\s+division/i,
      /divis[eé]e?\s+en\s+deux\s+(espaces?|parties?|zones?)/i,
      /chambre\s+.{0,10}divisible/i,
      /(pi[eè]ce|salon|s[eé]jour|cuisine)\s+.{0,10}divisible/i,
      /(jardin|cour|terrain|parcelle)\s+.{0,15}divisible/i,
      /terrain\s+divisible/i,
      /parcelle\s+divisible/i,
    ],
  },
  'Immeuble de rapport': {
    valid: [
      /immeuble\s+de\s+rapport/i,
      /monopropri[eé]t[eé]/i,
      /copropri[eé]t[eé]\s+[àa]\s+cr[eé]er/i,
      /pas\s+(de|en)\s+copropri[eé]t[eé]/i,
      /hors\s+copropri[eé]t[eé]/i,
      /vent(e|u)\s+en\s+bloc/i,
      /plusieurs\s+(lots?|appartements?|logements?)/i,
      /division\s+en\s+plusieurs/i,
      /cr[eé](er|ation)\s+(de\s+)?plusieurs\s+(appartements?|logements?|lots?)/i,
    ],
    exclude: [],
  },
}

export function testRegex(text: string, config: RegexConfig): boolean {
  const hasValid = config.valid.some(re => re.test(text))
  if (!hasValid) return false
  const hasExclude = config.exclude.some(re => re.test(text))
  return !hasExclude
}
