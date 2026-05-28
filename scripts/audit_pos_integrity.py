r"""Read-only POS integrity audit for HSMS.

Checks service catalog, POS orders, payments, revenue, treatment cards,
staff income ledger, and CRM service history consistency.
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(r"C:\Users\Quoc Nam\Projects\hsms")
SUPABASE_URL = "https://aqyemkfbjqxpegingoil.supabase.co"
CUTOFF = "2026-04-30"


def service_key():
    text = (ROOT / "scripts" / "import_myspa.py").read_text(encoding="utf-8", errors="ignore")
    match = re.search(r'SERVICE_KEY\s*=\s*"([^"]+)"', text)
    if not match:
        raise RuntimeError("Cannot find SERVICE_KEY")
    return match.group(1)


HEADERS = {
    "apikey": service_key(),
    "Authorization": "Bearer " + service_key(),
}


def get_all(table, columns="*", filters="", order="id.asc"):
    rows = []
    step = 1000
    offset = 0
    select = urllib.parse.quote(columns, safe=",()*:->")
    while True:
        parts = [f"select={select}", f"limit={step}", f"offset={offset}"]
        if filters:
            parts.append(filters)
        if order:
            parts.append("order=" + urllib.parse.quote(order, safe=".,"))
        url = f"{SUPABASE_URL}/rest/v1/{table}?" + "&".join(parts)
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=90) as res:
            batch = json.loads(res.read().decode("utf-8"))
        rows.extend(batch)
        if len(batch) < step:
            break
        offset += step
    return rows


def money(v):
    try:
        return int(v or 0)
    except Exception:
        return 0


def sample(rows, n=12):
    return rows[:n]


def main():
    services = get_all("dich_vu", "id,ma_dv,ten,danh_muc,is_active,hien_tren_menu,gia_co_ban,ti_le_hoa_hong,promotion_config")
    orders = get_all("don_hang", "id,ma_don,khach_hang_id,ngay,trang_thai,is_test,tong_tien_hang,giam_gia,vat,thuc_thu,con_no,tien_tour")
    lines = get_all("don_hang_chi_tiet", "id,don_hang_id,loai_item,dich_vu_id,san_pham_id,the_lieu_trinh_id,nhan_vien_id,so_luong,don_gia,thanh_tien,ti_le_hoa_hong,tien_hoa_hong,tien_tour,tien_commission,meta")
    payments = get_all("thanh_toan", "id,don_hang_id,hinh_thuc,so_tien")
    revenue = get_all("doanh_thu", "id,don_hang_id,hinh_thuc,so_tien,nguon")
    ledger = get_all("nhan_vien_thu_nhap", "id,don_hang_id,don_hang_chi_tiet_id,nhan_vien_id,loai,nguon,so_tien,is_test")
    cards = get_all("the_lieu_trinh", "id,ma_the,don_hang_id,khach_hang_id,dich_vu_id,combo_id,ten_dich_vu,so_buoi_tong,so_buoi_da_dung,so_buoi_con_lai,gia_tri_the,trang_thai,source")
    card_use = get_all("lich_su_dung_the", "id,the_lieu_trinh_id,don_hang_id,nguoi_thuc_hien")
    crm_history = get_all("lich_su_dich_vu_kh", "don_hang_id,don_hang_chi_tiet_id,khach_hang_id,loai_lich_su,ten_dich_vu,tien_tour,tien_commission", order="")

    services_by_id = {s["id"]: s for s in services}
    orders_by_id = {o["id"]: o for o in orders}
    lines_by_order = defaultdict(list)
    for line in lines:
        lines_by_order[line["don_hang_id"]].append(line)
    payments_by_order = defaultdict(list)
    for p in payments:
        payments_by_order[p["don_hang_id"]].append(p)
    revenue_by_order = defaultdict(list)
    for r in revenue:
        if r.get("don_hang_id"):
            revenue_by_order[r["don_hang_id"]].append(r)
    ledger_by_order = defaultdict(list)
    for row in ledger:
        if row.get("don_hang_id"):
            ledger_by_order[row["don_hang_id"]].append(row)
    cards_by_order = defaultdict(list)
    for c in cards:
        if c.get("don_hang_id"):
            cards_by_order[c["don_hang_id"]].append(c)
    card_use_by_order = defaultdict(list)
    for u in card_use:
        if u.get("don_hang_id"):
            card_use_by_order[u["don_hang_id"]].append(u)
    crm_by_line = {h.get("don_hang_chi_tiet_id"): h for h in crm_history if h.get("don_hang_chi_tiet_id")}

    finalized = [o for o in orders if o.get("trang_thai") in ("da_thanh_toan", "no_mot_phan")]
    real_finalized = [o for o in finalized if not o.get("is_test")]
    test_finalized = [o for o in finalized if o.get("is_test")]
    new_pos_orders = [o for o in finalized if (o.get("ngay") or "") > CUTOFF]
    legacy_orders = [o for o in finalized if (o.get("ngay") or "") <= CUTOFF]

    def is_myspa_archive_service(service):
        return bool(((service.get("promotion_config") or {}).get("myspa_archive") or {}).get("myspaItemCode"))

    catalog_issues = {
        "missing_myspa_config": [s for s in services if not ((s.get("promotion_config") or {}).get("myspa")) and not is_myspa_archive_service(s)],
        "visible_but_inactive": [s for s in services if s.get("hien_tren_menu") and not s.get("is_active")],
        "active_hidden": [s for s in services if s.get("is_active") and not s.get("hien_tren_menu")],
        "zero_price_visible": [s for s in services if s.get("hien_tren_menu") and money(s.get("gia_co_ban")) <= 0],
    }

    order_total_diff = []
    payment_diff = []
    revenue_diff = []
    ledger_diff = []
    missing_staff_income = []
    missing_created_cards = []
    missing_card_use_logs = []
    missing_crm_rows = []
    invalid_line_refs = []
    invalid_payment_methods = []
    missing_customer_required = []

    allowed_methods = {"tien_mat", "chuyen_khoan", "quet_the", "the_tra_truoc"}

    for oid, order_lines in lines_by_order.items():
        for line in order_lines:
            if line["loai_item"] == "dich_vu" and not line.get("dich_vu_id"):
                invalid_line_refs.append(line)
            if line["loai_item"] == "dich_vu" and line.get("dich_vu_id") and line["dich_vu_id"] not in services_by_id:
                invalid_line_refs.append(line)
            if line["loai_item"] == "the_lieu_trinh" and not line.get("the_lieu_trinh_id"):
                invalid_line_refs.append(line)
            if line["loai_item"] == "the_moi" and not (line.get("meta") or {}).get("tenDichVu"):
                invalid_line_refs.append(line)

    for p in payments:
        if p.get("hinh_thuc") not in allowed_methods:
            invalid_payment_methods.append(p)

    for order in new_pos_orders:
        oid = order["id"]
        order_lines = lines_by_order.get(oid, [])
        sum_lines = sum(money(l.get("thanh_tien")) for l in order_lines)
        if sum_lines != money(order.get("tong_tien_hang")):
            order_total_diff.append({"ma_don": order.get("ma_don"), "order": money(order.get("tong_tien_hang")), "lines": sum_lines})

        expected = max(0, sum_lines - money(order.get("giam_gia")) + money(order.get("vat")))
        if expected != money(order.get("thuc_thu")):
            payment_diff.append({"ma_don": order.get("ma_don"), "expected_thuc_thu": expected, "order_thuc_thu": money(order.get("thuc_thu"))})

        paid = sum(money(p.get("so_tien")) for p in payments_by_order.get(oid, []))
        if max(0, expected - paid) != money(order.get("con_no")):
            payment_diff.append({"ma_don": order.get("ma_don"), "paid": paid, "expected_con_no": max(0, expected - paid), "order_con_no": money(order.get("con_no"))})

        if not order.get("is_test"):
            rev_expected = sum(money(p.get("so_tien")) for p in payments_by_order.get(oid, []) if p.get("hinh_thuc") in {"tien_mat", "chuyen_khoan", "quet_the"})
            rev_actual = sum(money(r.get("so_tien")) for r in revenue_by_order.get(oid, []) if r.get("nguon") == "pos")
            if rev_expected != rev_actual:
                revenue_diff.append({"ma_don": order.get("ma_don"), "expected": rev_expected, "actual": rev_actual})
        else:
            rev_actual = sum(money(r.get("so_tien")) for r in revenue_by_order.get(oid, []) if r.get("nguon") == "pos")
            if rev_actual:
                revenue_diff.append({"ma_don": order.get("ma_don"), "test_order_revenue_should_be_0": rev_actual})

        expected_tour = 0
        expected_comm = 0
        expected_income_lines = []
        for line in order_lines:
            if not line.get("nhan_vien_id"):
                continue
            if line.get("loai_item") in ("dich_vu", "the_lieu_trinh"):
                amount = money(line.get("tien_tour")) or money(line.get("tien_hoa_hong"))
                expected_tour += amount
                if amount > 0:
                    expected_income_lines.append((line["id"], "tour", amount))
            if line.get("loai_item") in ("san_pham", "the_moi"):
                amount = money(line.get("tien_commission")) or money(line.get("tien_hoa_hong"))
                expected_comm += amount
                if amount > 0:
                    expected_income_lines.append((line["id"], "commission", amount))

        actual_tour = sum(money(x.get("so_tien")) for x in ledger_by_order.get(oid, []) if x.get("loai") == "tour")
        actual_comm = sum(money(x.get("so_tien")) for x in ledger_by_order.get(oid, []) if x.get("loai") == "commission")
        if expected_tour != actual_tour or expected_comm != actual_comm:
            ledger_diff.append({"ma_don": order.get("ma_don"), "expected_tour": expected_tour, "actual_tour": actual_tour, "expected_commission": expected_comm, "actual_commission": actual_comm})

        ledger_keys = {(x.get("don_hang_chi_tiet_id"), x.get("loai")) for x in ledger_by_order.get(oid, [])}
        for line_id, kind, amount in expected_income_lines:
            if (line_id, kind) not in ledger_keys:
                missing_staff_income.append({"ma_don": order.get("ma_don"), "line_id": line_id, "loai": kind, "amount": amount})

        if not order.get("is_test"):
            new_card_lines = [l for l in order_lines if l.get("loai_item") == "the_moi"]
            if len(cards_by_order.get(oid, [])) < len(new_card_lines):
                missing_created_cards.append({"ma_don": order.get("ma_don"), "card_lines": len(new_card_lines), "cards_created": len(cards_by_order.get(oid, []))})

            used_card_lines = [l for l in order_lines if l.get("loai_item") == "the_lieu_trinh"]
            if len(card_use_by_order.get(oid, [])) < len(used_card_lines):
                missing_card_use_logs.append({"ma_don": order.get("ma_don"), "used_card_lines": len(used_card_lines), "logs": len(card_use_by_order.get(oid, []))})

            for line in order_lines:
                if order.get("khach_hang_id") and line.get("loai_item") in ("dich_vu", "the_lieu_trinh", "the_moi"):
                    if line.get("id") not in crm_by_line:
                        missing_crm_rows.append({"ma_don": order.get("ma_don"), "line_id": line.get("id"), "loai": line.get("loai_item")})

        if any(l.get("loai_item") == "the_moi" for l in order_lines) and not order.get("khach_hang_id"):
            missing_customer_required.append({"ma_don": order.get("ma_don"), "reason": "the_moi_without_customer"})
        if any(p.get("hinh_thuc") == "the_tra_truoc" for p in payments_by_order.get(oid, [])) and not order.get("khach_hang_id"):
            missing_customer_required.append({"ma_don": order.get("ma_don"), "reason": "prepaid_without_customer"})

    legacy_summary = {
        "orders": len(legacy_orders),
        "lines": sum(len(lines_by_order.get(o["id"], [])) for o in legacy_orders),
        "card_sales_lines": sum(1 for o in legacy_orders for l in lines_by_order.get(o["id"], []) if l.get("loai_item") == "the_moi"),
        "orders_without_lines": sum(1 for o in legacy_orders if not lines_by_order.get(o["id"])),
        "orders_without_customer_for_card_sale": sum(1 for o in legacy_orders if any(l.get("loai_item") == "the_moi" for l in lines_by_order.get(o["id"], [])) and not o.get("khach_hang_id")),
    }

    report = {
        "catalog": {
            "services_total": len(services),
            "active": sum(1 for s in services if s.get("is_active")),
            "visible_pos": sum(1 for s in services if s.get("hien_tren_menu") and s.get("is_active")),
            "categories_total": len({s.get("danh_muc") for s in services if s.get("danh_muc")}),
            "visible_categories": sorted({s.get("danh_muc") for s in services if s.get("danh_muc") and s.get("hien_tren_menu") and s.get("is_active")}),
            "category_counts": dict(Counter(s.get("danh_muc") or "-" for s in services)),
            "issues": {k: {"count": len(v), "sample": sample([{kk: row.get(kk) for kk in ("ma_dv", "ten", "danh_muc", "is_active", "hien_tren_menu", "gia_co_ban")} for row in v])} for k, v in catalog_issues.items()},
        },
        "orders": {
            "orders_total": len(orders),
            "finalized": len(finalized),
            "real_finalized": len(real_finalized),
            "test_finalized": len(test_finalized),
            "legacy_until_cutoff": legacy_summary,
            "new_pos_after_cutoff": len(new_pos_orders),
            "by_status": dict(Counter(o.get("trang_thai") for o in orders)),
            "line_items": len(lines),
            "line_items_by_type": dict(Counter(l.get("loai_item") for l in lines)),
            "payments": len(payments),
            "payment_methods": dict(Counter(p.get("hinh_thuc") for p in payments)),
        },
        "integrity": {
            "order_total_diff": {"count": len(order_total_diff), "sample": sample(order_total_diff)},
            "payment_or_thuc_thu_diff": {"count": len(payment_diff), "sample": sample(payment_diff)},
            "revenue_diff": {"count": len(revenue_diff), "sample": sample(revenue_diff)},
            "staff_ledger_diff": {"count": len(ledger_diff), "sample": sample(ledger_diff)},
            "missing_staff_income_rows": {"count": len(missing_staff_income), "sample": sample(missing_staff_income)},
            "missing_created_cards": {"count": len(missing_created_cards), "sample": sample(missing_created_cards)},
            "missing_card_use_logs": {"count": len(missing_card_use_logs), "sample": sample(missing_card_use_logs)},
            "missing_crm_rows": {"count": len(missing_crm_rows), "sample": sample(missing_crm_rows)},
            "invalid_line_refs": {"count": len(invalid_line_refs), "sample": sample(invalid_line_refs)},
            "invalid_payment_methods": {"count": len(invalid_payment_methods), "sample": sample(invalid_payment_methods)},
            "missing_customer_required": {"count": len(missing_customer_required), "sample": sample(missing_customer_required)},
        },
        "cards": {
            "cards_total": len(cards),
            "by_status": dict(Counter(c.get("trang_thai") for c in cards)),
            "from_pos_orders": sum(1 for c in cards if c.get("don_hang_id")),
            "combo_cards": sum(1 for c in cards if c.get("combo_id")),
            "overused": sum(1 for c in cards if money(c.get("so_buoi_da_dung")) > money(c.get("so_buoi_tong"))),
            "remaining_negative": sum(1 for c in cards if money(c.get("so_buoi_con_lai")) < 0),
        },
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
