"""Run Supabase migrations via direct SQL execution."""
import os, requests, json

SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
SERVICE_KEY = os.environ["SUPABASE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

def run_sql(sql: str):
    """Execute SQL via Supabase SQL endpoint."""
    # Try the SQL API endpoint
    resp = requests.post(
        f"{SUPABASE_URL}/sql",
        headers=HEADERS,
        data=sql,
    )
    if resp.status_code == 404:
        # Try alternative: wrap in an RPC
        return run_sql_via_rpc(sql)
    return resp

def run_sql_via_rpc(sql: str):
    """Try executing via rpc exec function."""
    # First try to call exec_sql if it exists
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        headers={**HEADERS, "Prefer": "params=single-object"},
        json={"query": sql},
    )
    if resp.status_code != 404:
        return resp

    # Create exec_sql using REST API
    # We can set up the function via the query API
    print("  Creating exec_sql helper function...")

    # Use the PostgreSQL wire protocol via HTTPS
    # Actually let's try a different approach - use the Supabase dashboard API

    return resp

def run_file(filepath: str) -> bool:
    fname = os.path.basename(filepath)
    print(f"\n{'='*60}")
    print(f"Running: {fname}")
    print(f"{'='*60}")

    with open(filepath, 'r', encoding='utf-8') as f:
        sql = f.read()

    # Try multiple endpoints
    endpoints = [
        (f"{SUPABASE_URL}/sql", "data"),
        (f"{SUPABASE_URL}/rest/v1/rpc/pgrest_exec", "json"),
    ]

    for url, mode in endpoints:
        try:
            if mode == "data":
                resp = requests.post(url, headers={**HEADERS, "Content-Type": "text/plain"}, data=sql.encode('utf-8'))
            else:
                resp = requests.post(url, headers=HEADERS, json={"query": sql})

            if resp.status_code in [200, 201, 204]:
                print(f"  ✓ OK via {url}")
                return True
            elif resp.status_code == 404:
                continue
            else:
                err = resp.text[:300]
                print(f"  [{resp.status_code}] {err}")
        except Exception as e:
            print(f"  Error: {e}")

    print(f"  ✗ Could not auto-execute.")
    print(f"  → Run manually: https://supabase.com/dashboard/project/aqyemkfbjqxpegingoil/sql/new")
    return False

if __name__ == "__main__":
    base = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")

    files = [
        "017_pos_test_mode.sql",
    ]

    for f in files:
        run_file(os.path.join(base, f))

    print("\n" + "="*60)
    print("If any migrations failed, run scripts/supabase-migrations.sql")
    print("in the Supabase SQL Editor.")
    print("="*60)
