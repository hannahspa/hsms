"""Run migration 050 lich_hen via Supabase Management API."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8')

import requests

PROJECT_REF = "aqyemkfbjqxpegingoil"
# Management API dung Personal Access Token - thu dung service key trc
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxeWVta2ZianF4cGVnaW5nb2lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUxNTYwMCwiZXhwIjoyMDkzMDkxNjAwfQ.L2yo4Osu6XNhPaOTEMz1Z2GI-SVtzR6AnODirhUR4zI"

base = os.path.join(os.path.dirname(__file__), "..", "supabase", "migrations")
sql_file = os.path.join(base, "050_lich_hen.sql")

with open(sql_file, 'r', encoding='utf-8') as f:
    sql = f.read()

print(f"SQL length: {len(sql)} chars")

# Try Supabase Management API (project query endpoint)
url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
HEADERS = {
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

print("Trying Management API...")
resp = requests.post(url, headers=HEADERS, json={"query": sql})
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")
