r"""Backfill legacy POS line dich_vu_id from meta.myspaItemCode.

Only updates don_hang_chi_tiet rows with:
- loai_item = dich_vu
- dich_vu_id is null
- meta.myspaItemCode matches an existing dich_vu.ma_dv

No money fields are touched.
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(r"C:\Users\Quoc Nam\Projects\hsms")
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
BATCH = 200


def service_key():
    text = (ROOT / "scripts" / "import_myspa.py").read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


KEY = service_key()
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def get_all(table, columns, filters=""):
    rows = []
    offset = 0
    step = 1000
    select = urllib.parse.quote(columns, safe=",()*:->")
    while True:
        parts = [f"select={select}", f"limit={step}", f"offset={offset}", "order=id.asc"]
        if filters:
            parts.append(filters)
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?" + "&".join(parts), headers=HEADERS)
        with urllib.request.urlopen(req, timeout=90) as res:
            batch = json.loads(res.read().decode("utf-8"))
        rows.extend(batch)
        if len(batch) < step:
            break
        offset += step
    return rows


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def patch_lines(line_ids, service_id):
    payload = json.dumps({"dich_vu_id": service_id}, ensure_ascii=False).encode("utf-8")
    ids = ",".join(line_ids)
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?id=in.({urllib.parse.quote(ids, safe=',-')})",
        data=payload,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="PATCH",
    )
    with urllib.request.urlopen(req, timeout=60) as res:
        res.read()


def main(dry_run=False):
    services = get_all("dich_vu", "id,ma_dv,ten")
    service_by_code = {s["ma_dv"]: s for s in services if s.get("ma_dv")}
    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,meta",
        "loai_item=eq.dich_vu&dich_vu_id=is.null",
    )
    matched = []
    unmatched = []
    for line in lines:
        code = (line.get("meta") or {}).get("myspaItemCode")
        service = service_by_code.get(code)
        if service:
            matched.append((line["id"], code, service["id"], service["ten"]))
        else:
            unmatched.append({"id": line["id"], "myspaItemCode": code, "tenDichVu": (line.get("meta") or {}).get("tenDichVu")})

    updated_batches = 0
    if not dry_run:
        grouped = defaultdict(list)
        for line_id, _code, service_id, _name in matched:
            grouped[service_id].append(line_id)
        for service_id, ids in grouped.items():
            for batch_ids in chunks(ids, BATCH):
                patch_lines(batch_ids, service_id)
                updated_batches += 1

    print(json.dumps({
        "dry_run": dry_run,
        "candidate_lines": len(lines),
        "matched_to_update": len(matched),
        "updated_batches": updated_batches,
        "unmatched_kept_as_meta_only": len(unmatched),
        "matched_sample": [{"id": x[0], "ma_dv": x[1], "ten": x[3]} for x in matched[:20]],
        "unmatched_sample": unmatched[:20],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
