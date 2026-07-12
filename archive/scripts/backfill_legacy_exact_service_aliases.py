r"""Link legacy MySpa service codes to current services by exact normalized name.

Safe auto mode:
- only loai_item = dich_vu
- dich_vu_id is null
- meta.myspaItemCode starts with DV-
- exactly one current dich_vu has the same normalized name as meta.tenDichVu

No money fields are touched.
"""
import io
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(r"C:\Users\Quoc Nam\Projects\hsms")
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
BATCH = 200
WORKERS = 12


def service_key():
    text = (ROOT / "scripts" / "import_myspa.py").read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


KEY = service_key()
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def norm(text):
    value = unicodedata.normalize("NFD", str(text or "").lower())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


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


def patch_lines(line_ids, service_id):
    payload = json.dumps({"dich_vu_id": service_id}, ensure_ascii=False).encode("utf-8")
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
    services = get_all("dich_vu", "id,ma_dv,ten,danh_muc,is_active,hien_tren_menu")
    by_name = defaultdict(list)
    for service in services:
        by_name[norm(service.get("ten"))].append(service)

    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,meta",
        "loai_item=eq.dich_vu&dich_vu_id=is.null",
    )

    matched = []
    skipped = defaultdict(int)
    for line in lines:
        meta = line.get("meta") or {}
        code = meta.get("myspaItemCode") or ""
        name = meta.get("tenDichVu") or ""
        if not code.startswith("DV-"):
            skipped["not_dv_code"] += 1
            continue
        candidates = by_name.get(norm(name), [])
        if len(candidates) != 1:
            skipped["no_unique_exact_name"] += 1
            continue
        service = candidates[0]
        matched.append((line["id"], code, name, service["id"], service.get("ma_dv"), service.get("ten")))

    updated_batches = 0
    if not dry_run:
        grouped = defaultdict(list)
        for line_id, _code, _name, service_id, _ma_dv, _service_name in matched:
            grouped[service_id].append(line_id)
        jobs = []
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for service_id, ids in grouped.items():
                for batch_ids in chunks(ids, BATCH):
                    jobs.append(pool.submit(patch_lines, batch_ids, service_id))
            for job in as_completed(jobs):
                job.result()
                updated_batches += 1

    groups = {}
    for _line_id, code, name, _service_id, ma_dv, service_name in matched:
        row = groups.setdefault((code, name, ma_dv, service_name), 0)
        groups[(code, name, ma_dv, service_name)] = row + 1

    summary = [
        {"myspaItemCode": code, "tenDichVu": name, "target_ma_dv": ma_dv, "target_ten": service_name, "count": count}
        for (code, name, ma_dv, service_name), count in groups.items()
    ]
    summary.sort(key=lambda r: -r["count"])

    print(json.dumps({
        "dry_run": dry_run,
        "matched_lines": len(matched),
        "matched_groups": len(summary),
        "updated_batches": updated_batches,
        "skipped": dict(skipped),
        "matched_sample": summary[:40],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
