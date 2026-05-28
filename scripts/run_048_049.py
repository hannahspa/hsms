"""Run migrations 048 and 049."""
import sys, os, requests

# Fix encoding on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

HEADERS_TEXT = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "text/plain",
}

def run_sql_file(filepath):
    fname = os.path.basename(filepath)
    print(f"\n{'='*60}")
    print(f"Running: {fname}")
    print(f"{'='*60}")
    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()

    sql_bytes = sql.encode('utf-8')

    endpoints = [
        f"{SUPABASE_URL}/sql",
        f"{SUPABASE_URL}/rest/v1/sql",
    ]

    for url in endpoints:
        try:
            resp = requests.post(url, headers=HEADERS_TEXT, data=sql_bytes, timeout=30)
            print(f"  Endpoint {url} -> status {resp.status_code}")
            if resp.status_code in [200, 201, 204]:
                print(f"  SUCCESS!")
                return True
            elif resp.status_code == 404:
                print(f"  404 - trying next...")
                continue
            else:
                print(f"  Response: {resp.text[:500]}")
        except Exception as e:
            print(f"  Error: {e}")

    print(f"  FAILED - run manually in Supabase SQL Editor")
    return False

base = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")
files = [
    "048_normalize_tour_commission.sql",
    "049_remove_commission_unify_hoa_hong.sql",
]

for f in files:
    run_sql_file(os.path.join(base, f))

print("\n" + "="*60)
print("Manual URL: https://supabase.com/dashboard/project/aqyemkfbjqxpegingoil/sql/new")
print("="*60)
