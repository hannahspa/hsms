# -*- coding: utf-8 -*-
"""
Audit the_lieu_trinh sessions between MySpa export and HSMS.

Default behavior is read-only:
  python scripts/audit_tlt_sessions.py

Outputs:
  reports/tlt_audit_full_YYYYMMDD_HHMMSS.csv
  reports/tlt_audit_issues_YYYYMMDD_HHMMSS.csv
  reports/tlt_fix_suggested_YYYYMMDD_HHMMSS.sql

The generated SQL is a suggestion file, not executed by this script.
"""
import argparse
import csv
import io
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DEFAULT_EXCEL_CANDIDATES = [
    Path(r"D:\Hannah Spa\Database\Data Thang 05\danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1780241952.xlsx"),
    Path(r"D:\Hannah Spa\Database\danh_sach_the_lieu_trinh_tat_ca_chi_nhanh_1778310007.xlsx"),
]


def read_env(path=".env.import"):
    env_path = Path(path)
    if not env_path.exists():
        raise FileNotFoundError(f"Khong tim thay {path}")
    env = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def clean_phone(value):
    text = str(value or "").strip().replace(" ", "").replace(".", "")
    if not text or text.lower() in {"nan", "none"}:
        return ""
    if text.startswith("+84"):
        text = "0" + text[3:]
    elif text[0].isdigit() and not text.startswith("0"):
        text = "0" + text
    return text[:20]


def to_int(value, default=0):
    if value is None:
        return default
    text = str(value).strip().replace(",", "")
    if text == "" or text.lower() in {"nan", "none", "nat"}:
        return default
    if "khong" in strip_accents(text).lower():
        return default
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return default


def strip_accents(text):
    # Enough for simple "Khong gioi han" detection without extra deps.
    mapping = str.maketrans(
        "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ"
        "ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ",
        "aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd"
        "AAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD",
    )
    return str(text or "").translate(mapping)


def parse_date(value):
    if value is None:
        return ""
    if hasattr(value, "date"):
        try:
            return value.date().isoformat()
        except Exception:
            pass
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "nat"}:
        return ""
    if "khong" in strip_accents(text).lower():
        return ""
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(text[:19] if "%H" in fmt else text[:10], fmt).date().isoformat()
        except ValueError:
            pass
    return text[:10]


def choose_excels(path_args):
    if path_args:
        paths = [Path(p) for p in path_args]
        missing = [p for p in paths if not p.exists()]
        if missing:
            raise FileNotFoundError(", ".join(str(p) for p in missing))
        return paths
    paths = [path for path in DEFAULT_EXCEL_CANDIDATES if path.exists()]
    if paths:
        return paths
    raise FileNotFoundError("Khong tim thay file Excel the lieu trinh MySpa.")


def load_myspa_cards(excel_path):
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb.active
    rows = ws.iter_rows(values_only=True)
    header = next(rows)
    idx = {str(name).strip(): i for i, name in enumerate(header) if name}

    def val(row, name, fallback_index=None):
        if name in idx and idx[name] < len(row):
            return row[idx[name]]
        if fallback_index is not None and fallback_index < len(row):
            return row[fallback_index]
        return None

    cards = {}
    for row in rows:
        ma_the = str(val(row, "Mã Thẻ (Tự động được tạo bởi hệ thống)", 0) or "").strip()
        if not ma_the:
            continue
        total = to_int(val(row, "Tổng số lần", 8))
        used = to_int(val(row, "Số lần đã sử dụng", 9))
        promo = to_int(val(row, "Số lần khuyến mãi", 10))
        cards[ma_the] = {
            "ma_the": ma_the,
            "ngay_mua": parse_date(val(row, "Ngày tạo", 1)),
            "ma_kh": str(val(row, "Mã khách hàng", 2) or "").strip(),
            "ten_kh": str(val(row, "Tên KH", 3) or "").strip(),
            "sdt": clean_phone(val(row, "Điện thoại", 4)),
            "ten_goi": str(val(row, "Tên gói", 5) or "").strip(),
            "ten_dv": str(val(row, "Tên dịch vụ / Tên combo", 7) or "").strip(),
            # Important: MySpa "Tong so lan" is already final total.
            "tong": total,
            "da_dung": used,
            "khuyen_mai": promo,
            "tong_neu_cong_km": total + promo,
            "con_lai": max(0, total - used),
            "ngay_het_han": parse_date(val(row, "Ngày hết hạn", 15)),
            "tong_tien": to_int(val(row, "Tổng tiền", 11)),
        }
    return cards


def load_myspa_cards_many(excel_paths):
    merged = {}
    sources = []
    for path in excel_paths:
        cards = load_myspa_cards(path)
        sources.append({"path": str(path), "rows": len(cards)})
        merged.update(cards)
    return merged, sources


class SupabaseRest:
    def __init__(self, url, key):
        self.url = url.rstrip("/")
        self.headers = {"apikey": key, "Authorization": f"Bearer {key}"}

    def fetch_all(self, table, select, params=None, batch=1000):
        params = dict(params or {})
        params["select"] = select
        rows = []
        offset = 0
        while True:
            params["limit"] = batch
            params["offset"] = offset
            res = requests.get(
                f"{self.url}/rest/v1/{table}",
                headers=self.headers,
                params=params,
                timeout=120,
            )
            if not res.ok:
                raise RuntimeError(f"{table}: {res.status_code} {res.text[:300]}")
            chunk = res.json()
            rows.extend(chunk)
            if len(chunk) < batch:
                break
            offset += batch
        return rows


def load_hsms_cards(api):
    rows = api.fetch_all(
        "the_lieu_trinh",
        "id,ma_the,ten_dich_vu,so_buoi_tong,so_buoi_da_dung,so_buoi_con_lai,"
        "trang_thai,ngay_mua,ngay_het_han,source,meta,khach_hang:khach_hang_id(ho_ten,so_dien_thoai)",
    )
    return {row["ma_the"]: row for row in rows if row.get("ma_the")}


CARD_NOTE_RE = re.compile(
    r"(?P<used>\d+)\s*/\s*(?P<total>\d+)\.\s*\(M[ãa]\s*Th[ẻe]\s*:\s*(?P<code>THE-LT-\d+)",
    re.IGNORECASE,
)


def load_order_note_usage(api):
    rows = api.fetch_all(
        "don_hang",
        "id,ma_don,ngay,ghi_chu,trang_thai",
        params={"ghi_chu": "ilike.*THE-LT-*", "trang_thai": "neq.huy"},
    )
    usage = {}
    for row in rows:
        note = row.get("ghi_chu") or ""
        for match in CARD_NOTE_RE.finditer(note):
            code = match.group("code")
            used = int(match.group("used"))
            total = int(match.group("total"))
            current = usage.get(code)
            candidate = {
                "order_id": row.get("id"),
                "ma_don": row.get("ma_don"),
                "ngay": row.get("ngay") or "",
                "used": used,
                "total": total,
            }
            if not current or (candidate["ngay"], used) > (current["ngay"], current["used"]):
                usage[code] = candidate
    return usage


def load_line_usage(api):
    try:
        rows = api.fetch_all(
            "don_hang_chi_tiet",
            "id,the_lieu_trinh_id,so_luong,don_hang_id,don_hang:don_hang_id(ngay,trang_thai)",
            params={"loai_item": "eq.the_lieu_trinh"},
        )
    except RuntimeError:
        return {}
    usage = {}
    for row in rows:
        card_id = row.get("the_lieu_trinh_id")
        if not card_id:
            continue
        order = row.get("don_hang") or {}
        if order.get("trang_thai") == "huy":
            continue
        bucket = usage.setdefault(card_id, {"rows": 0, "qty": 0})
        bucket["rows"] += 1
        bucket["qty"] += int(row.get("so_luong") or 0)
    return usage


def decide_status(myspa, hsms, note):
    issues = []
    action = "ok"
    if not myspa and hsms:
        return "extra_hsms", "HSMS co, MySpa export khong co", [], None, None, "none"
    if myspa and not hsms:
        return "missing_hsms", "MySpa co, HSMS thieu", [], None, None, "myspa_export"

    my_total = myspa["tong"]
    my_used = myspa["da_dung"]
    expected_total = my_total
    expected_used = my_used
    expected_source = "myspa_export"
    if note:
        note_total = int(note["total"])
        note_used = int(note["used"])
        if my_total < 0 or note_used >= my_used:
            expected_total = note_total
            expected_used = note_used
            expected_source = "order_note_latest"
        elif note_total > 0 and note_total != my_total and my_total <= 0:
            expected_total = note_total
            expected_source = "order_note_total"

    hs_total = int(hsms.get("so_buoi_tong") or 0)
    hs_used = int(hsms.get("so_buoi_da_dung") or 0)

    if expected_total <= 0:
        issues.append("myspa_invalid_total")
    if hs_total == myspa["tong_neu_cong_km"] and myspa["khuyen_mai"] > 0 and hs_total != expected_total:
        issues.append("double_count_promo")
    if hs_total != expected_total:
        issues.append("total_mismatch")
    if hs_used != expected_used:
        issues.append("used_mismatch")
    if note and note["used"] < my_used:
        issues.append("order_note_older_than_export")

    if issues:
        if "myspa_invalid_total" in issues:
            action = "manual_review"
        else:
            action = "suggest_update_hsms"
    return action, ";".join(issues) if issues else "ok", issues, expected_total, expected_used, expected_source


def audit(myspa_cards, hsms_cards, order_usage, line_usage):
    rows = []
    all_codes = sorted(set(myspa_cards) | set(hsms_cards))
    for code in all_codes:
        my = myspa_cards.get(code)
        hs = hsms_cards.get(code)
        note = order_usage.get(code)
        line = line_usage.get(hs.get("id")) if hs else None
        action, issue_text, issues, expected_total, expected_used, expected_source = decide_status(my, hs, note)
        kh = hs.get("khach_hang") if hs else {}
        row = {
            "ma_the": code,
            "action": action,
            "issues": issue_text,
            "sdt": (my or {}).get("sdt") or (kh or {}).get("so_dien_thoai") or "",
            "ten_kh": (my or {}).get("ten_kh") or (kh or {}).get("ho_ten") or "",
            "ten_the_myspa": (my or {}).get("ten_goi") or "",
            "ten_the_hsms": (hs or {}).get("ten_dich_vu") or "",
            "myspa_tong": (my or {}).get("tong", ""),
            "myspa_da_dung": (my or {}).get("da_dung", ""),
            "myspa_con_lai": (my or {}).get("con_lai", ""),
            "myspa_khuyen_mai": (my or {}).get("khuyen_mai", ""),
            "expected_tong": expected_total if expected_total is not None else "",
            "expected_da_dung": expected_used if expected_used is not None else "",
            "expected_source": expected_source,
            "expected_con_lai": max(0, expected_total - expected_used) if expected_total is not None and expected_used is not None else "",
            "hsms_tong": (hs or {}).get("so_buoi_tong", ""),
            "hsms_da_dung": (hs or {}).get("so_buoi_da_dung", ""),
            "hsms_con_lai": (hs or {}).get("so_buoi_con_lai", ""),
            "hsms_trang_thai": (hs or {}).get("trang_thai", ""),
            "note_tong": (note or {}).get("total", ""),
            "note_da_dung": (note or {}).get("used", ""),
            "note_ma_don": (note or {}).get("ma_don", ""),
            "line_rows": (line or {}).get("rows", 0),
            "line_qty": (line or {}).get("qty", 0),
            "ngay_mua_myspa": (my or {}).get("ngay_mua", ""),
            "ngay_mua_hsms": (hs or {}).get("ngay_mua", ""),
            "_hsms_id": (hs or {}).get("id", ""),
            "_can_auto_update": action == "suggest_update_hsms" and my is not None and hs is not None,
        }
        rows.append(row)
    return rows


def write_csv(path, rows):
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    public_keys = [k for k in rows[0].keys() if not k.startswith("_")]
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=public_keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in public_keys})


def sql_quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def write_fix_sql(path, issue_rows):
    auto_rows = [r for r in issue_rows if r.get("_can_auto_update")]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    lines = [
        "-- Suggested TLT session corrections generated by scripts/audit_tlt_sessions.py",
        "-- Review this file before running in Supabase SQL Editor.",
        "BEGIN;",
        f"CREATE TABLE IF NOT EXISTS backup_the_lieu_trinh_before_audit_{timestamp} AS",
        "SELECT * FROM the_lieu_trinh WHERE false;",
        f"INSERT INTO backup_the_lieu_trinh_before_audit_{timestamp}",
        "SELECT * FROM the_lieu_trinh",
        "WHERE ma_the IN (",
    ]
    lines.append("  " + ",\n  ".join(sql_quote(r["ma_the"]) for r in auto_rows) + "\n);")
    for row in auto_rows:
        lines.extend([
            "",
            f"-- {row['ma_the']} | {row['ten_kh']} | {row['issues']}",
            "UPDATE the_lieu_trinh",
            f"SET so_buoi_tong = {int(row['expected_tong'])},",
            f"    so_buoi_da_dung = {int(row['expected_da_dung'])},",
            "    meta = COALESCE(meta, '{}'::jsonb) || "
            f"{sql_quote(json.dumps({'audit_tlt_sessions': timestamp}, ensure_ascii=False))}::jsonb",
            f"WHERE ma_the = {sql_quote(row['ma_the'])};",
        ])
    lines.extend(["", "COMMIT;", ""])
    path.write_text("\n".join(lines), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--excel", action="append", help="Duong dan Excel the lieu trinh MySpa. Co the truyen nhieu lan.")
    parser.add_argument("--env", default=".env.import")
    parser.add_argument("--out-dir", default="reports")
    args = parser.parse_args()

    excels = choose_excels(args.excel)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("Doc MySpa Excel:")
    for excel in excels:
        print(f"  - {excel}")
    myspa_cards, source_rows = load_myspa_cards_many(excels)
    print(f"  MySpa cards: {len(myspa_cards):,}")

    env = read_env(args.env)
    api = SupabaseRest(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    print("Tai HSMS cards...")
    hsms_cards = load_hsms_cards(api)
    print(f"  HSMS cards: {len(hsms_cards):,}")

    print("Doc lich su dung the tu ghi chu don hang...")
    order_usage = load_order_note_usage(api)
    print(f"  Note usage cards: {len(order_usage):,}")

    print("Doc dong hang the_lieu_trinh...")
    line_usage = load_line_usage(api)
    print(f"  Line usage cards: {len(line_usage):,}")

    rows = audit(myspa_cards, hsms_cards, order_usage, line_usage)
    issues = [r for r in rows if r["action"] != "ok"]
    auto = [r for r in issues if r.get("_can_auto_update")]
    manual = [r for r in issues if r["action"] == "manual_review"]

    full_path = out_dir / f"tlt_audit_full_{stamp}.csv"
    issues_path = out_dir / f"tlt_audit_issues_{stamp}.csv"
    sql_path = out_dir / f"tlt_fix_suggested_{stamp}.sql"
    write_csv(full_path, rows)
    write_csv(issues_path, issues)
    write_fix_sql(sql_path, issues)

    summary = {
        "myspa_cards": len(myspa_cards),
        "hsms_cards": len(hsms_cards),
        "ok": len(rows) - len(issues),
        "issues": len(issues),
        "auto_suggested": len(auto),
        "manual_review": len(manual),
        "missing_hsms": sum(1 for r in issues if r["action"] == "missing_hsms"),
        "extra_hsms": sum(1 for r in issues if r["action"] == "extra_hsms"),
        "double_count_promo": sum(1 for r in issues if "double_count_promo" in r["issues"]),
        "files": {
            "full": str(full_path),
            "issues": str(issues_path),
            "sql": str(sql_path),
        },
        "sources": source_rows,
    }
    (out_dir / f"tlt_audit_summary_{stamp}.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nTOM TAT")
    for key, value in summary.items():
        if key != "files":
            print(f"  {key}: {value}")
    print("\nFILES")
    print(f"  Full CSV:   {full_path}")
    print(f"  Issues CSV: {issues_path}")
    print(f"  Fix SQL:    {sql_path}")


if __name__ == "__main__":
    main()
