# -*- coding: utf-8 -*-
"""
Apply suggested treatment-card session fixes from audit_tlt_sessions.py.

This script writes to Supabase, but only after creating a local JSON backup.
It updates:
  - the_lieu_trinh.so_buoi_tong
  - the_lieu_trinh.so_buoi_da_dung

It does not touch revenue, payments, orders, or ledger tables.
"""
import argparse
import csv
import io
import json
import sys
from datetime import datetime
from pathlib import Path

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def read_env(path=".env.import"):
    env = {}
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


class SupabaseRest:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def get_cards(self, codes):
        rows = []
        for i in range(0, len(codes), 80):
            chunk = codes[i:i + 80]
            inlist = ",".join(chunk)
            res = requests.get(
                f"{self.url}/rest/v1/the_lieu_trinh",
                headers=self.headers,
                params={
                    "select": "*",
                    "ma_the": f"in.({inlist})",
                },
                timeout=120,
            )
            if not res.ok:
                raise RuntimeError(f"Backup fetch failed: {res.status_code} {res.text[:300]}")
            rows.extend(res.json())
        return rows

    def patch_card(self, ma_the, payload):
        res = requests.patch(
            f"{self.url}/rest/v1/the_lieu_trinh",
            headers={**self.headers, "Prefer": "return=representation"},
            params={"ma_the": f"eq.{ma_the}"},
            json=payload,
            timeout=120,
        )
        if not res.ok:
            raise RuntimeError(f"{ma_the}: {res.status_code} {res.text[:300]}")
        return res.json()


def load_fixes(path):
    rows = []
    with Path(path).open("r", encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            if row.get("action") != "suggest_update_hsms":
                continue
            rows.append({
                "ma_the": row["ma_the"],
                "expected_tong": int(float(row["expected_tong"])),
                "expected_da_dung": int(float(row["expected_da_dung"])),
                "issues": row.get("issues", ""),
                "ten_kh": row.get("ten_kh", ""),
            })
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("issues_csv", help="reports/tlt_audit_issues_*.csv")
    parser.add_argument("--env", default=".env.import")
    parser.add_argument("--out-dir", default="reports")
    parser.add_argument("--yes", action="store_true", help="Required to write DB")
    args = parser.parse_args()

    fixes = load_fixes(args.issues_csv)
    print(f"Fix rows: {len(fixes)}")
    if not fixes:
        return
    if not args.yes:
        print("DRY RUN only. Add --yes to apply.")
        for row in fixes[:20]:
            print(f"  {row['ma_the']}: tong={row['expected_tong']} da_dung={row['expected_da_dung']} | {row['issues']}")
        return

    env = read_env(args.env)
    api = SupabaseRest(env["SUPABASE_URL"], env["SUPABASE_KEY"])
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    codes = [row["ma_the"] for row in fixes]
    backup = api.get_cards(codes)
    backup_path = out_dir / f"tlt_backup_before_apply_{stamp}.json"
    backup_path.write_text(json.dumps(backup, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"Backup: {backup_path} ({len(backup)} rows)")

    applied = []
    for row in fixes:
        payload = {
            "so_buoi_tong": row["expected_tong"],
            "so_buoi_da_dung": row["expected_da_dung"],
        }
        api.patch_card(row["ma_the"], payload)
        applied.append(row)
        if len(applied) % 25 == 0:
            print(f"  applied {len(applied)}/{len(fixes)}")

    applied_path = out_dir / f"tlt_applied_{stamp}.json"
    applied_path.write_text(json.dumps(applied, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Applied: {len(applied)}")
    print(f"Applied log: {applied_path}")


if __name__ == "__main__":
    main()
