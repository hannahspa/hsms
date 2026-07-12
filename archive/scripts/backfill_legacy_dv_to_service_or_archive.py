r"""Resolve remaining legacy MySpa DV-* lines.

Strategy requested for operations:
1. Ignore the old MySpa service code.
2. For DV-* lines, link to an existing HSMS service only when the normalized
   name is exactly the same.
3. If no exact current service exists, create an inactive/hidden archive service
   using the old MySpa name, then link the old order lines to it.
4. Skip SP-* and THE-* for future inventory/card modules.

No money fields are touched.
"""
import io
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
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
    value = re.sub(r"\b\d+k\b", " ", value)
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


def post_row(table, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{table}",
        data=data,
        headers={**HEADERS, "Prefer": "return=representation"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as res:
        rows = json.loads(res.read().decode("utf-8"))
    return rows[0]


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


def common_price(lines):
    prices = []
    for line in lines:
        for key in ("don_gia", "thanh_tien"):
            value = money(line.get(key))
            if value > 0:
                prices.append(value)
    if not prices:
        return 0
    return Counter(prices).most_common(1)[0][0]


def main(dry_run=False):
    services = get_all("dich_vu", "id,ma_dv,ten,danh_muc,gia_co_ban,is_active,hien_tren_menu,promotion_config")
    by_name = defaultdict(list)
    by_archive_code = {}
    for service in services:
        by_name[norm(service.get("ten"))].append(service)
        archive_code = ((service.get("promotion_config") or {}).get("myspa_archive") or {}).get("myspaItemCode")
        if archive_code:
            by_archive_code[archive_code] = service

    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,meta,don_gia,thanh_tien,so_luong",
        "loai_item=eq.dich_vu&dich_vu_id=is.null",
    )

    groups = defaultdict(list)
    skipped = defaultdict(int)
    for line in lines:
        meta = line.get("meta") or {}
        code = meta.get("myspaItemCode") or ""
        if not code.startswith("DV-"):
            skipped["not_dv_code"] += 1
            continue
        name = meta.get("tenDichVu") or ""
        group = meta.get("myspaItemGroup") or "Dịch Vụ MySpa Cũ"
        groups[(code, name, group)].append(line)

    planned = []
    archive_to_create = []
    for (code, name, group), group_lines in groups.items():
        target = None
        match_kind = ""
        exact = by_name.get(norm(name), [])
        if len(exact) == 1:
            target = exact[0]
            match_kind = "exact_name"
        elif code in by_archive_code:
            target = by_archive_code[code]
            match_kind = "existing_archive"

        if target:
            planned.append({
                "code": code,
                "name": name,
                "group": group,
                "line_ids": [line["id"] for line in group_lines],
                "target_id": target["id"],
                "target_ma_dv": target.get("ma_dv"),
                "target_ten": target.get("ten"),
                "match_kind": match_kind,
                "count": len(group_lines),
            })
        else:
            price = common_price(group_lines)
            archive_code = f"MYSPA-{code}"
            archive_to_create.append({
                "code": code,
                "name": name,
                "group": group,
                "price": price,
                "line_ids": [line["id"] for line in group_lines],
                "count": len(group_lines),
                "payload": {
                    "ma_dv": archive_code,
                    "ten": name,
                    "danh_muc": group or "Dịch Vụ MySpa Cũ",
                    "gia_co_ban": price,
                    "ti_le_hoa_hong": 0,
                    "thoi_gian_phut": 0,
                    "thu_tu": 9999,
                    "is_active": False,
                    "hien_tren_menu": False,
                    "la_hot": False,
                    "la_phu_thu": False,
                    "mo_ta_ngan": "Dịch vụ lưu trữ từ dữ liệu MySpa cũ, dùng để tra cứu lịch sử POS/CRM.",
                    "mo_ta": "Tự động tạo khi đồng bộ dữ liệu đơn hàng cũ. Không hiển thị trên POS.",
                    "promotion_config": {
                        "myspa_archive": {
                            "myspaItemCode": code,
                            "source": "legacy_order_line_unmatched",
                            "created_by_script": "backfill_legacy_dv_to_service_or_archive.py",
                        }
                    },
                },
            })

    created_archives = []
    if not dry_run:
        for item in archive_to_create:
            row = post_row("dich_vu", item["payload"])
            created_archives.append({"code": item["code"], "target_ma_dv": row.get("ma_dv"), "target_ten": row.get("ten"), "count": item["count"]})
            planned.append({
                "code": item["code"],
                "name": item["name"],
                "group": item["group"],
                "line_ids": item["line_ids"],
                "target_id": row["id"],
                "target_ma_dv": row.get("ma_dv"),
                "target_ten": row.get("ten"),
                "match_kind": "created_archive_service",
                "count": item["count"],
            })

        jobs = []
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for item in planned:
                for batch_ids in chunks(item["line_ids"], BATCH):
                    jobs.append(pool.submit(patch_lines, batch_ids, item["target_id"]))
            for job in as_completed(jobs):
                job.result()

    summary = [
        {k: item[k] for k in ("code", "name", "target_ma_dv", "target_ten", "match_kind", "count")}
        for item in sorted(planned, key=lambda x: -x["count"])
    ]
    archive_summary = [
        {k: item[k] for k in ("code", "name", "group", "price", "count")}
        for item in sorted(archive_to_create, key=lambda x: -x["count"])
    ]
    print(json.dumps({
        "dry_run": dry_run,
        "dv_groups": len(groups),
        "planned_link_lines": sum(item["count"] for item in planned),
        "planned_link_groups": len(planned),
        "archive_groups_to_create": len(archive_to_create),
        "archive_lines_to_create": sum(item["count"] for item in archive_to_create),
        "created_archives": created_archives[:40],
        "skipped": dict(skipped),
        "link_sample": summary[:80],
        "archive_sample": archive_summary[:80],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main("--dry-run" in sys.argv)
