r"""Link legacy MySpa service lines to HSMS services by name + price.

Rules:
- only don_hang_chi_tiet.loai_item = dich_vu
- only rows with dich_vu_id is null
- only MySpa item codes starting with DV-
- normalized legacy service name equals normalized HSMS service name
- exactly one matching HSMS service has gia_co_ban equal to line price

SP-* rows are intentionally skipped for the future inventory/product module.
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
MIN_SIMILARITY = 0.72


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


def money(value):
    try:
        return int(round(float(value or 0)))
    except Exception:
        return 0


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


def line_prices(line):
    prices = set()
    don_gia = money(line.get("don_gia"))
    thanh_tien = money(line.get("thanh_tien"))
    so_luong = max(1, money(line.get("so_luong")) or 1)
    for value in (don_gia, thanh_tien):
        if value > 0:
            prices.add(value)
    if thanh_tien > 0 and so_luong > 1 and thanh_tien % so_luong == 0:
        prices.add(thanh_tien // so_luong)
    return prices


def similarity(a, b):
    a_tokens = set(norm(a).split())
    b_tokens = set(norm(b).split())
    if not a_tokens or not b_tokens:
        return 0
    return len(a_tokens & b_tokens) / len(a_tokens | b_tokens)


def main(dry_run=False):
    services = get_all("dich_vu", "id,ma_dv,ten,danh_muc,gia_co_ban,is_active,hien_tren_menu")
    by_name = defaultdict(list)
    for service in services:
        by_name[norm(service.get("ten"))].append(service)

    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,meta,don_gia,thanh_tien,so_luong",
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
        prices = line_prices(line)
        if not prices:
            skipped["no_price_on_line"] += 1
            continue
        candidates = [
            service for service in by_name.get(norm(name), [])
            if money(service.get("gia_co_ban")) in prices
        ]
        match_kind = "exact_name_price"
        if not candidates:
            fuzzy = [
                (similarity(name, service.get("ten")), service)
                for service in services
                if money(service.get("gia_co_ban")) in prices
            ]
            fuzzy = [(score, service) for score, service in fuzzy if score >= MIN_SIMILARITY]
            fuzzy.sort(key=lambda x: x[0], reverse=True)
            if len(fuzzy) == 1 or (len(fuzzy) > 1 and fuzzy[0][0] > fuzzy[1][0]):
                candidates = [fuzzy[0][1]] if fuzzy else []
                match_kind = f"name_price_similarity_{round(fuzzy[0][0], 2)}" if fuzzy else "none"
        if len(candidates) != 1:
            skipped["no_unique_name_price_match"] += 1
            continue
        service = candidates[0]
        matched.append((
            line["id"],
            code,
            name,
            sorted(prices),
            service["id"],
            service.get("ma_dv"),
            service.get("ten"),
            money(service.get("gia_co_ban")),
            match_kind,
        ))

    updated_batches = 0
    if not dry_run:
        grouped = defaultdict(list)
        for line_id, _code, _name, _prices, service_id, _ma_dv, _service_name, _price, _match_kind in matched:
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
    for _line_id, code, name, prices, _service_id, ma_dv, service_name, service_price, match_kind in matched:
        key = (code, name, ma_dv, service_name, service_price, match_kind)
        row = groups.setdefault(key, {"count": 0, "line_prices": set()})
        row["count"] += 1
        row["line_prices"].update(prices)

    summary = []
    for (code, name, ma_dv, service_name, service_price, match_kind), data in groups.items():
        summary.append({
            "myspaItemCode": code,
            "tenDichVu": name,
            "target_ma_dv": ma_dv,
            "target_ten": service_name,
            "service_price": service_price,
            "line_prices": sorted(data["line_prices"]),
            "match_kind": match_kind,
            "count": data["count"],
        })
    summary.sort(key=lambda r: -r["count"])

    print(json.dumps({
        "dry_run": dry_run,
        "matched_lines": len(matched),
        "matched_groups": len(summary),
        "updated_batches": updated_batches,
        "skipped": dict(skipped),
        "matched_sample": summary[:80],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
