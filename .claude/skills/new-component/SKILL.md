---
description: Nouveau composant React TypeScript suivant les conventions du projet
---

# Nouveau Composant React

Crée un composant TypeScript suivant les conventions de monpetitmdb.

## Template composant standard

```typescript
// components/{NomComposant}.tsx
interface {NomComposant}Props {
  // props typées ici
}

export function {NomComposant}({ ...props }: {NomComposant}Props) {
  return (
    <div>
      {/* Accents en clair : é, è, à — PAS \u00E9 */}
      {/* Symbole euro : {'\u20AC'} */}
      {/* Apostrophes : {"'"} */}
    </div>
  )
}
```

## Conventions encoding

```tsx
// ✅ Correct
<span>{'\u20AC'} 250 000</span>
<p>Locataire en place</p>
<p>C{"'"}est le meilleur choix</p>

// ❌ Incorrect
<span>€ 250 000</span>        // € direct dans JSX
<p>Locataire en place\u00E9</p>  // unicode escapé
```

## Page client (sessionStorage)

```typescript
// app/{route}/page.tsx — wrapper SSR
import dynamic from 'next/dynamic'
const PageClient = dynamic(() => import('./{Page}Client'), { ssr: false })
export default function Page() { return <PageClient /> }

// app/{route}/{Page}Client.tsx — logique avec sessionStorage
'use client'
// ...
```

## Paywall

```tsx
// Chiffres floutés pour utilisateurs Free
<span className={isPro ? '' : 'val-blur'}>
  {'\u20AC'} {rendement.toFixed(1)}%
</span>
```

## Si $ARGUMENTS contient le nom → créer directement le composant
