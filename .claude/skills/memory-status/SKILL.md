---
description: Affiche l'état de la mémoire, le change-log récent, et déclenche une consolidation si nécessaire
---

# Memory Status

## Actions à effectuer

1. Lire `.claude/memories/MEMORY.md` et lister les fichiers avec leur date de dernière modification
2. Lire `.claude/change-log.md` si existant — afficher les 10 dernières entrées
3. Lire `.claude/.last-consolidation` si existant — afficher la date
4. Lire `.claude/proposed-claude-updates.md` si existant — afficher les suggestions CLAUDE.md

## Afficher un résumé

```
📁 MÉMOIRE — {N} fichiers
  ├── feedback_comportement.md   (modifié le JJ/MM/YYYY)
  ├── feedback_estimation.md     (modifié le JJ/MM/YYYY)
  ├── project_roadmap.md         (modifié le JJ/MM/YYYY)
  └── ...

📝 CHANGE-LOG — {N} entrées
  Dernières :
  - 2026-04-16 | ...
  - 2026-04-15 | ...

🔄 DERNIÈRE CONSOLIDATION : JJ/MM/YYYY (il y a X jours)
   → Prochaine consolidation : dans X jours

💡 SUGGESTIONS CLAUDE.MD : {N} suggestions en attente
   Taper /memory-status apply pour les appliquer
```

## Si $ARGUMENTS = "consolidate" → consolidation intelligente DANS cette session

⚠️ GRATUIT — s'exécute dans la session Claude Code en cours, AUCUN appel API séparé.

Actions :
1. Lire `.claude/change-log.md` et les fichiers mémoire
2. Identifier les infos obsolètes ou à mettre à jour
3. Modifier directement les fichiers mémoire nécessaires
4. Mettre à jour MEMORY.md
5. Si des updates CLAUDE.md sont pertinentes → écrire `.claude/proposed-claude-updates.md`
6. Supprimer `.claude/.consolidation-pending` une fois terminé
7. NE PAS modifier CLAUDE.md racine directement

## Si $ARGUMENTS = "apply" → appliquer les suggestions de proposed-claude-updates.md

Lire le fichier, proposer les modifications CLAUDE.md pour validation avant d'écrire.

## Détection automatique du flag

Si `.claude/.consolidation-pending` existe → signaler au début : 
"💡 Consolidation mémoire suggérée (7 jours écoulés). Taper /memory-status consolidate pour lancer — aucun coût supplémentaire."
