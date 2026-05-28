r"""Summarize legacy MySpa service codes that are not linked to dich_vu.

Read-only by default. This helps build a safe alias/mapping queue for old
MySpa service codes that no longer exist in the latest service catalog.
"""
import io
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(r"C:\Users\Quoc Nam\Projects\hsms")
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"


def service_key():
    text = (ROOT / "scripts" / "import_myspa.py").read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


KEY = service_key()
HEADERS = {"apikey": KEY, "Authorization": "Bearer " + KEY}


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


def norm(text):
    value = unicodedata.normalize("NFD", str(text or "").lower())
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    value = re.sub(r"\b\d+k\b", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def similarity(a, b):
    a_tokens = set(norm(a).split())
    b_tokens = set(norm(b).split())
    if not a_tokens or not b_tokens:
        return 0
    return len(a_tokens & b_tokens) / len(a_tokens | b_tokens)


def main():
    services = get_all("dich_vu", "id,ma_dv,ten,danh_muc,is_active,hien_tren_menu")
    lines = get_all(
        "don_hang_chi_tiet",
        "id,loai_item,dich_vu_id,meta,thanh_tien,tien_tour,tien_hoa_hong",
        "loai_item=eq.dich_vu&dich_vu_id=is.null",
    )

    services_by_name = defaultdict(list)
    for service in services:
        services_by_name[norm(service.get("ten"))].append(service)

    grouped = {}
    for line in lines:
        meta = line.get("meta") or {}
        code = meta.get("myspaItemCode") or "-"
        name = meta.get("tenDichVu") or "-"
        if code.startswith("THE-"):
            kind = "card_or_prepaid"
        else:
            kind = "service_code"
        key = (code, name, kind)
        row = grouped.setdefault(key, {
            "myspaItemCode": code,
            "tenDichVu": name,
            "kind": kind,
            "count": 0,
            "amount": 0,
            "tour": 0,
            "sample_line_ids": [],
        })
        row["count"] += 1
        row["amount"] += int(line.get("thanh_tien") or 0)
        row["tour"] += int((line.get("tien_tour") if line.get("tien_tour") is not None else line.get("tien_hoa_hong")) or 0)
        if len(row["sample_line_ids"]) < 5:
            row["sample_line_ids"].append(line["id"])

    result = []
    for row in grouped.values():
        if row["kind"] != "service_code":
            result.append({**row, "candidates": []})
            continue
        exact = services_by_name.get(norm(row["tenDichVu"]), [])
        candidates = exact[:5]
        if not candidates:
            ranked = sorted(
                ((similarity(row["tenDichVu"], s.get("ten")), s) for s in services),
                key=lambda x: x[0],
                reverse=True,
            )
            candidates = [s for score, s in ranked if score >= 0.55][:5]
        result.append({
            **row,
            "candidates": [
                {
                    "id": c["id"],
                    "ma_dv": c.get("ma_dv"),
                    "ten": c.get("ten"),
                    "danh_muc": c.get("danh_muc"),
                    "is_active": c.get("is_active"),
                    "hien_tren_menu": c.get("hien_tren_menu"),
                    "score": round(similarity(row["tenDichVu"], c.get("ten")), 2),
                }
                for c in candidates
            ],
        })

    result.sort(key=lambda r: (r["kind"] != "service_code", -r["count"], r["myspaItemCode"]))
    print(json.dumps({
        "unmatched_groups": len(result),
        "unmatched_lines": len(lines),
        "service_code_groups": sum(1 for r in result if r["kind"] == "service_code"),
        "card_or_prepaid_groups": sum(1 for r in result if r["kind"] == "card_or_prepaid"),
        "groups_with_candidate": sum(1 for r in result if r["candidates"]),
        "top": result[:80],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
