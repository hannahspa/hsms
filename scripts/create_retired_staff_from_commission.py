"""Create inactive staff records from staged MySpa commission rows.

This only creates missing nhan_vien rows for old employees and rematches
myspa_commission_detail.matched_nhan_vien_id by staff_name_raw.
"""
import io
import re
import sys
import time
import unicodedata
from collections import defaultdict

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = r"C:\Users\Quoc Nam\Projects\hsms"
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
BATCH_SIZE = 1000


def load_service_key():
    with open(ROOT + r"\scripts\import_myspa.py", "r", encoding="utf-8", errors="ignore") as fh:
        text = fh.read()
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


SERVICE_KEY = load_service_key()
HEADERS = {"apikey": SERVICE_KEY, "Authorization": "Bearer " + SERVICE_KEY}
JSON_HEADERS = {**HEADERS, "Content-Type": "application/json"}


def norm(value):
    text = unicodedata.normalize("NFD", str(value or "").lower())
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d")
    return re.sub(r"\s+", " ", text).strip()


def fetch_all(table, select, params=""):
    rows = []
    start = 0
    while True:
        headers = {**HEADERS, "Range": f"{start}-{start + BATCH_SIZE - 1}"}
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}{params}"
        res = requests.get(url, headers=headers, timeout=120)
        res.raise_for_status()
        batch = res.json()
        rows.extend(batch)
        if len(batch) < BATCH_SIZE:
            break
        start += BATCH_SIZE
    return rows


def patch_with_retry(table, query, payload):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    for attempt in range(1, 6):
        try:
            res = requests.patch(url, headers=JSON_HEADERS, json=payload, timeout=120)
            if res.ok:
                return
            last = f"{res.status_code} {res.text[:300]}"
        except requests.RequestException as exc:
            last = str(exc)
        time.sleep(min(10, attempt * 2))
    raise RuntimeError(f"PATCH failed {query}: {last}")


def main():
    staff_rows = fetch_all("nhan_vien", "id,ho_ten,trang_thai")
    staff_by_norm = {norm(row["ho_ten"]): row for row in staff_rows}

    staged = fetch_all(
        "myspa_commission_detail",
        "staff_name_raw,staff_display,chuc_vu,ngay,tong_tien",
        "&matched_nhan_vien_id=is.null",
    )

    grouped = defaultdict(lambda: {"display": "", "vi_tri": "", "first": None, "amount": 0, "rows": 0})
    for row in staged:
        raw = (row.get("staff_name_raw") or "").strip()
        if not raw:
            continue
        item = grouped[raw]
        item["display"] = row.get("staff_display") or item["display"]
        item["vi_tri"] = row.get("chuc_vu") or item["vi_tri"]
        item["amount"] += row.get("tong_tien") or 0
        item["rows"] += 1
        day = row.get("ngay")
        if day and (not item["first"] or day < item["first"]):
            item["first"] = day

    created = 0
    matched = {}
    for raw, info in sorted(grouped.items()):
        staff_name = f"{raw} (Nghỉ Việc)"
        existing = staff_by_norm.get(norm(staff_name)) or staff_by_norm.get(norm(raw))
        if existing:
            matched[raw] = existing["id"]
            continue

        payload = {
            "ho_ten": staff_name,
            "vi_tri": info["vi_tri"] or "Nhân Viên Nghỉ Việc",
            "luong_cung": 0,
            "ngay_bat_dau": info["first"] or "2019-01-01",
            "trang_thai": "nghi_viec",
            "ky_quy_so_thang": 0,
            "ky_quy_trang_thai": "chua",
        }
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/nhan_vien",
            headers={**JSON_HEADERS, "Prefer": "return=representation"},
            json=payload,
            timeout=120,
        )
        if not res.ok:
            raise RuntimeError(f"Cannot create staff {staff_name}: {res.status_code} {res.text[:300]}")
        created += 1
        matched[raw] = res.json()[0]["id"]

    for raw, staff_id in matched.items():
        q = "staff_name_raw=eq." + requests.utils.quote(raw, safe="")
        patch_with_retry(
            "myspa_commission_detail",
            q,
            {"matched_nhan_vien_id": staff_id, "staff_status": "nghi_viec"},
        )

    print(f"Created retired staff: {created}")
    print(f"Rematched staff names: {len(matched)}")


if __name__ == "__main__":
    main()
