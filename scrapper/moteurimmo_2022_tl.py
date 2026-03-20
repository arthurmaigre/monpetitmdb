"""Lance ingestion Travaux lourds 2022-2023"""
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=True)
import os
import moteurimmo_client
moteurimmo_client.API_KEY = os.getenv("MOTEURIMMO_API_KEY", "")
moteurimmo_client.ingest_strategy_by_date("Travaux lourds", start_date="2022-01-01", dry_run=False)
