r"""Backfill legacy MySpa order lines that reference treatment cards.

Only updates rows where:
- don_hang_chi_tiet.loai_item = dich_vu
- dich_vu_id is null
- meta.myspaItemCode starts with THE-LT-
- meta.myspaItemCode matches the_lieu_trinh.ma_the

No money fields are touched.
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(r"C:\Users\Quoc Nam\Projects\hsms")
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
BATCH = 200
WORKERS = 16


def service_key():
    text = (ROOT / "scripts" / "import_myspa.py").read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


KEY = service_key()
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def get_all(table, columns, filters="", order="id.asc"):
    rows = []
    offset = 0
    step = 1000
    select = urllib.parse.quote(columns, safe=",()*:->")
    while True:
        parts = [f"select={select}", f"limit={step}", f"offset={offset}"]
        if filters:
            parts.append(filters)
        if order:
            parts.append("order=" + urllib.parse.quote(order, safe=".,"))
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?" + "&".join(parts), headers=HEADERS)
        with urllib.request.urlopen(req, timeout=90) as res:
            batch = json.loads(res.read().decode("utf-8"))
        rows.extend(batch)
        if len(batch) < step:
            break
        offset += step
    return rows


def patch_lines(line_ids, card_id):
    payload = json.dumps({"loai_item": "the_lieu_trinh", "the_lieu_trinh_id": card_id}, ensure_ascii=False).encode("utf-8")
    ids = ",".join(line_ids)
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/don_hang_chi_tiet?id=in.({urllib.parse.quote(ids, safe=',-')})",
        data=payload,
        headers={**HEADERS, "Prefer": "return=minimal"},
        method="PATCH",
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        res.read()


def main(dry_run=False):
    cards = get_all("the_lieu_trinh", "id,ma_the,ten_dich_vu,trang_thai", "ma_the=like.THE-LT-*")
    card_by_code = {c["ma_the"]: c for c in cards if c.get("ma_the")}
    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,the_lieu_trinh_id,meta",
        "loai_item=eq.dich_vu&dich_vu_id=is.null",
    )

    matched = []
    unmatched = []
    for line in lines:
        meta = line.get("meta") or {}
        code = meta.get("myspaItemCode")
        if not code or not code.startswith("THE-LT-"):
            continue
        card = card_by_code.get(code)
        if card:
            matched.append((line["id"], code, card["id"], card.get("ten_dich_vu"), card.get("trang_thai")))
        else:
            unmatched.append({"id": line["id"], "myspaItemCode": code, "tenDichVu": meta.get("tenDichVu")})

    updated_batches = 0
    if not dry_run:
        grouped = defaultdict(list)
        for line_id, _code, card_id, _name, _status in matched:
            grouped[card_id].append(line_id)
        jobs = []
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for card_id, ids in grouped.items():
                for batch_ids in chunks(ids, BATCH):
                    jobs.append(pool.submit(patch_lines, batch_ids, card_id))
            for job in as_completed(jobs):
                job.result()
                updated_batches += 1

    print(json.dumps({
        "dry_run": dry_run,
        "matched_card_usage_lines": len(matched),
        "updated_batches": updated_batches,
        "unmatched_the_lt_lines": len(unmatched),
        "matched_sample": [
            {"id": x[0], "ma_the": x[1], "ten_dich_vu": x[3], "trang_thai": x[4]}
            for x in matched[:20]
        ],
        "unmatched_sample": unmatched[:20],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
