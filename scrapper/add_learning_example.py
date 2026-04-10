"""
add_learning_example.py — Ajoute un exemple vérifié au fichier encheres_learning.json

Usage :
  python add_learning_example.py --id 415 --fields tribunal="Tribunal Judiciaire de Coutances" frais_prealables=4200
  python add_learning_example.py --id 415 --note "TJ corrigé depuis le CCV"

Récupère automatiquement la description (input) depuis la base,
et crée un exemple avec les champs corrigés (output).
"""
import json, argparse, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
from supabase_client import get_client

LEARNING_FILE = Path(__file__).parent / "encheres_learning.json"


def load_learning() -> dict:
    if LEARNING_FILE.exists():
        return json.loads(LEARNING_FILE.read_text(encoding="utf-8"))
    return {"version": 1, "description": "Exemples vérifiés pour l'extraction Sonnet enchères.", "examples": []}


def save_learning(data: dict):
    LEARNING_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="Ajouter un exemple d'extraction vérifié")
    parser.add_argument("--id", type=int, required=True, help="ID de l'enchère en base")
    parser.add_argument("--note", type=str, default="", help="Note sur la correction")
    parser.add_argument("--fields", nargs="*", help="Champs corrigés : clé=valeur (ex: tribunal='TJ de Tours' frais_prealables=4200)")
    args = parser.parse_args()

    c = get_client()
    if not c:
        print("Erreur: Supabase non connecté")
        sys.exit(1)

    # Charger le bien
    r = c.table("encheres").select("*").eq("id", args.id).limit(1).execute()
    if not r.data:
        print(f"Erreur: enchère {args.id} non trouvée")
        sys.exit(1)

    item = r.data[0]

    # Construire le résumé input
    input_summary = f"{item.get('source', '?')}, {item.get('type_bien') or '?'} à {item.get('ville') or '?'}, mise à prix {item.get('mise_a_prix') or '?'}€"

    # Construire l'output attendu depuis les données actuelles + corrections
    output = {}
    extract_fields = [
        "type_bien", "ville", "code_postal", "departement", "tribunal",
        "occupation", "surface", "nb_pieces", "nb_chambres", "nb_lots",
        "frais_prealables", "adresse",
    ]
    for f in extract_fields:
        if item.get(f):
            output[f] = item[f]

    # Appliquer les corrections
    if args.fields:
        for field_str in args.fields:
            if "=" not in field_str:
                continue
            key, val = field_str.split("=", 1)
            try:
                val = float(val) if "." in val else int(val)
            except ValueError:
                pass
            output[key] = val

    # Ajouter à l'exemple
    learning = load_learning()
    example = {
        "note": args.note or f"Correction manuelle enchère #{args.id}",
        "input_summary": input_summary,
        "expected_output": output,
    }

    learning["examples"].append(example)
    save_learning(learning)

    print(f"Exemple ajouté ({len(learning['examples'])} total)")
    print(f"  Input: {input_summary}")
    print(f"  Output: {json.dumps(output, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
