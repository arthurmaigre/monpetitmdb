#!/bin/bash
# Hook Stop — s'exécute après chaque réponse de Claude
# Logge ce qui a été fait dans .claude/change-log.md
# Vérifie si une consolidation est nécessaire (tous les 7 jours)

PROJET_DIR="C:/Users/GAMER/monpetitmdb"
CHANGE_LOG="$PROJET_DIR/.claude/change-log.md"
LAST_CONSOLIDATION="$PROJET_DIR/.claude/.last-consolidation"
CONSOLIDATE_SCRIPT="$PROJET_DIR/.claude/hooks/consolidate.sh"

# Lire le JSON d'entrée depuis stdin
INPUT=$(cat)

# Extraire des infos utiles (fichiers modifiés, outil utilisé)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name','unknown'))" 2>/dev/null || echo "unknown")
TOOL_INPUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); ti=d.get('tool_input',{}); print(ti.get('file_path', ti.get('command', ''))[:80])" 2>/dev/null || echo "")

# N'enregistrer que les Write/Edit/Bash significatifs
if [[ "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Edit" ]]; then
  DATE=$(date +"%Y-%m-%d %H:%M")
  echo "- $DATE | $TOOL_NAME → $TOOL_INPUT" >> "$CHANGE_LOG"
fi

# Vérifier si consolidation nécessaire (tous les 7 jours)
if [ -f "$LAST_CONSOLIDATION" ]; then
  LAST_DATE=$(cat "$LAST_CONSOLIDATION" 2>/dev/null || echo "0")
  NOW=$(date +%s)
  DIFF=$(( (NOW - LAST_DATE) / 86400 ))

  if [ "$DIFF" -ge 7 ]; then
    # Lancer la consolidation en arrière-plan silencieusement
    bash "$CONSOLIDATE_SCRIPT" &>/dev/null &
  fi
else
  # Première fois — créer le fichier
  date +%s > "$LAST_CONSOLIDATION"
fi

# Toujours exit 0 pour ne pas bloquer Claude
exit 0
