#!/bin/bash
# Consolidation légère — GRATUIT, zéro appel API
# S'exécute en arrière-plan après le hook Stop quand 7 jours se sont écoulés
#
# Ce script fait UNIQUEMENT des opérations fichiers :
#   1. Archive le change-log (garde les 20 dernières entrées)
#   2. Écrit un flag .consolidation-pending pour que Claude le voit au début de session
#   3. Met à jour la date de dernière consolidation
#
# La vraie consolidation intelligente se fait dans la session Claude Code
# (pas d'API séparée) via le skill /memory-status ou /anthropic-skills:consolidate-memory

PROJET_DIR="C:/Users/GAMER/monpetitmdb"
CHANGE_LOG="$PROJET_DIR/.claude/change-log.md"
LAST_CONSOLIDATION="$PROJET_DIR/.claude/.last-consolidation"
PENDING_FLAG="$PROJET_DIR/.claude/.consolidation-pending"
LOG_FILE="$PROJET_DIR/.claude/.consolidation-log.txt"

echo "[$(date)] Archivage change-log déclenché" >> "$LOG_FILE"

# 1. Compter les entrées du change-log
if [ -f "$CHANGE_LOG" ]; then
  NB_ENTREES=$(grep -c "^-" "$CHANGE_LOG" 2>/dev/null || echo "0")

  # 2. Archiver si plus de 30 entrées — garder les 20 dernières
  if [ "$NB_ENTREES" -gt 30 ]; then
    ARCHIVE_DIR="$PROJET_DIR/.claude/change-log-archives"
    mkdir -p "$ARCHIVE_DIR"
    DATE_ARCHIVE=$(date +"%Y%m%d")
    cp "$CHANGE_LOG" "$ARCHIVE_DIR/change-log-$DATE_ARCHIVE.md"
    # Garder header + 20 dernières entrées
    HEAD_LINES=$(grep -n "^-" "$CHANGE_LOG" | head -1 | cut -d: -f1)
    HEADER=$(head -$((HEAD_LINES - 1)) "$CHANGE_LOG")
    RECENT=$(grep "^-" "$CHANGE_LOG" | tail -20)
    echo "$HEADER" > "$CHANGE_LOG"
    echo "" >> "$CHANGE_LOG"
    echo "$RECENT" >> "$CHANGE_LOG"
    echo "[$(date)] Change-log archivé ($NB_ENTREES entrées → 20 gardées)" >> "$LOG_FILE"
  fi
fi

# 3. Écrire le flag "consolidation à faire" pour que Claude le propose en session
echo "$(date +"%Y-%m-%d")" > "$PENDING_FLAG"

# 4. Mettre à jour la date de dernière consolidation
date +%s > "$LAST_CONSOLIDATION"

echo "[$(date)] Archivage terminé — flag .consolidation-pending écrit" >> "$LOG_FILE"
