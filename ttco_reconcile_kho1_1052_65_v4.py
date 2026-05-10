
# -*- coding: utf-8 -*-
import csv
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SERVER = r"tuyenthancuaong.com.vn,52376"
DATABASE = "TTCO_THONGKE"

TARGET_APP = 1052.65
CURRENT_CDOTHAN = 671.75
TARGET_DIFF = round(TARGET_APP - CURRENT_CDOTHAN, 2)  # 380.90

DESKTOP = Path.home() / "Desktop"
OUT_DIR = DESKTOP / "TTCO_RECONCILE_KHO1_TONKHO"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_TXT = OUT_DIR / f"reconcile_kho1_1052_65_{STAMP}.txt"
OUT_CSV = OUT_DIR / f"reconcile_kho1_1052_65_{STAMP}.csv"
OUT_OBJECTS = OUT_DIR / f"sql_objects_tonkho_{STAMP}.txt"


def write(line=""):
    print(line)
    with OUT_TXT.open("a", encoding="utf-8") as f:
        f.write(str(line) + "\n")


def write_obj(line=""):
    with OUT_OBJECTS.open("a", encoding="utf-8") as f:
        f.write(str(line) + "\n")


def ensure_pyodbc():
    try:
        import pyodbc  # noqa
        return
    except Exception:
        write("Chưa có pyodbc. Đang thử cài pyodbc...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyodbc"])


def connect():
    import pyodbc
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str, timeout=15)


def qident(name: str) -> str:
    return "[" + str(name).replace("]", "]]") + "]"


def is_numeric_type(t: str) -> bool:
    return str(t).lower() in {
        "int", "bigint", "smallint", "tinyint", "decimal", "numeric",
        "float", "real", "money", "smallmoney"
    }


def safe_float(v):
    try:
        if v is None:
            return None
        return float(v)
    except Exception:
        return None


def main():
    ensure_pyodbc()
    conn = connect()
    cur = conn.cursor()

    write("============================================================")
    write("TTCO - ĐỐI CHIẾU KHO 1: CDOTHAN 671,75 -> TTCO_APP 1.052,65")
    write("============================================================")
    write(f"Server       : {SERVER}")
    write(f"Database     : {DATABASE}")
    write(f"CDOTHAN hiện : {CURRENT_CDOTHAN}")
    write(f"TTCO_APP     : {TARGET_APP}")
    write(f"Chênh lệch   : {TARGET_DIFF}")
    write("")
    write("Mục tiêu script:")
    write("1. Tìm bảng/cột có tổng gần 1.052,65 cho Kho 1.")
    write("2. Tìm bảng/cột có tổng gần 380,90 để xác định phần phát sinh sau CDOTHAN.")
    write("3. Tìm stored procedure/view có khả năng TTCO_APP dùng để tính tồn kho.")
    write("")
    write(f"TXT chính : {OUT_TXT}")
    write(f"CSV       : {OUT_CSV}")
    write(f"Objects   : {OUT_OBJECTS}")
    write("")

    results = []

    # A) Search objects definitions: stored procedures/views/functions.
    write("A) TÌM STORED PROCEDURE / VIEW / FUNCTION LIÊN QUAN TỒN KHO")
    write("------------------------------------------------------------")
    obj_sql = """
    SELECT
        o.type_desc,
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name,
        m.definition
    FROM sys.sql_modules m
    INNER JOIN sys.objects o ON m.object_id = o.object_id
    WHERE
        m.definition LIKE N'%CDOTHAN%'
        OR m.definition LIKE N'%TonCK%'
        OR m.definition LIKE N'%MaKho%'
        OR m.definition LIKE N'%tồn%'
        OR m.definition LIKE N'%ton%'
        OR m.definition LIKE N'%kho%'
        OR m.definition LIKE N'%TKe%'
        OR m.definition LIKE N'%TK_%'
    ORDER BY o.type_desc, SCHEMA_NAME(o.schema_id), o.name;
    """
    try:
        objects = cur.execute(obj_sql).fetchall()
        write(f"Số object liên quan tìm được: {len(objects)}")
        for i, r in enumerate(objects[:100], start=1):
            name = f"{r.schema_name}.{r.name}"
            defn = r.definition or ""
            score = 0
            for kw in ["CDOTHAN", "TonCK", "MaKho", "TonKho", "Tồn", "Kho", "sp_", "TKe"]:
                if kw.lower() in defn.lower() or kw.lower() in name.lower():
                    score += 1
            write(f"{i:02d}. {r.type_desc} | {name} | score={score}")
            write_obj("=" * 100)
            write_obj(f"{i:02d}. {r.type_desc} | {name} | score={score}")
            write_obj("-" * 100)
            write_obj(defn)
            write_obj("")
    except Exception as exc:
        write(f"Lỗi tìm SQL objects: {exc}")
    write("")

    # B) Search table/column sums without GROUP BY extra columns.
    write("B) QUÉT TỔNG CỘNG CÁC CỘT SỐ THEO KHO 1")
    write("------------------------------------------------------------")

    col_sql = """
    SELECT
        c.TABLE_SCHEMA,
        c.TABLE_NAME,
        c.COLUMN_NAME,
        c.DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS c
    INNER JOIN INFORMATION_SCHEMA.TABLES t
        ON c.TABLE_SCHEMA = t.TABLE_SCHEMA
       AND c.TABLE_NAME = t.TABLE_NAME
    WHERE t.TABLE_TYPE = 'BASE TABLE'
    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;
    """
    cols = cur.execute(col_sql).fetchall()

    tables = {}
    for schema, table, col, dtype in cols:
        tables.setdefault((schema, table), []).append((col, dtype))

    kho_patterns = re.compile(r"(^MaKho$|^Kho$|Kho|Ma_Kho|IDKho|KhoID)", re.I)
    value_patterns = re.compile(r"(Ton|Klg|KL|KhoiLuong|Luong|Tan|SL|SoLuong|Cuoi|CK|Nhap|Xuat|Dau|DK|Tang|Giam)", re.I)
    than_patterns = re.compile(r"(MaThan|TenThan|LoaiThan|Than)", re.I)

    scanned = 0
    skipped = 0

    for (schema, table), table_cols in tables.items():
        col_names = [c for c, _ in table_cols]
        col_types = {c: t for c, t in table_cols}

        kho_cols = [c for c in col_names if kho_patterns.search(c)]
        num_cols = [c for c, t in table_cols if is_numeric_type(t) and value_patterns.search(c)]
        if not kho_cols or not num_cols:
            continue

        has_namht = "NamHT" in col_names
        has_thanght = "ThangHT" in col_names
        has_mathan = "MaThan" in col_names
        has_tenthan = "TenThan" in col_names

        for kho_col in kho_cols[:4]:
            kho_filter = f"CAST({qident(kho_col)} AS NVARCHAR(100)) IN (N'1', N'01', N'Kho 1')"

            filters = [
                ("all", kho_filter),
            ]
            if has_namht and has_thanght:
                filters.append(("NamHT=2026 ThangHT=5", kho_filter + " AND [NamHT]=2026 AND [ThangHT]=5"))
                filters.append(("NamHT=2026", kho_filter + " AND [NamHT]=2026")

            for val_col in num_cols[:30]:
                for filter_name, where_sql in filters:
                    scanned += 1
                    try:
                        sql = f"""
                        SELECT
                            SUM(CAST({qident(val_col)} AS FLOAT)) AS SumValue,
                            COUNT(*) AS RowCount,
                            MIN(CAST({qident(val_col)} AS FLOAT)) AS MinValue,
                            MAX(CAST({qident(val_col)} AS FLOAT)) AS MaxValue
                        FROM {qident(schema)}.{qident(table)}
                        WHERE {where_sql};
                        """
                        row = cur.execute(sql).fetchone()
                        if not row:
                            continue

                        val = safe_float(row.SumValue)
                        if val is None:
                            continue

                        diff_app = abs(val - TARGET_APP)
                        diff_delta = abs(val - TARGET_DIFF)

                        # Lưu các kết quả gần mục tiêu hoặc giá trị dương có ý nghĩa để phân tích.
                        if diff_app <= 500 or diff_delta <= 500 or (0 < abs(val) < 200000):
                            note = f"{filter_name}; rows={row.RowCount}; min={safe_float(row.MinValue)}; max={safe_float(row.MaxValue)}"
                            results.append({
                                "schema": schema,
                                "table": table,
                                "filter": filter_name,
                                "kho_col": kho_col,
                                "value_col": val_col,
                                "sum_value": val,
                                "diff_to_app_1052_65": diff_app,
                                "diff_to_delta_380_90": diff_delta,
                                "has_mathan": has_mathan,
                                "has_tenthan": has_tenthan,
                                "note": note,
                            })
                    except Exception:
                        skipped += 1
                        continue

    results_sorted_app = sorted(results, key=lambda x: x["diff_to_app_1052_65"])
    results_sorted_delta = sorted(results, key=lambda x: x["diff_to_delta_380_90"])

    write(f"Số phép quét: {scanned}")
    write(f"Số phép bỏ qua: {skipped}")
    write(f"Số kết quả lưu: {len(results)}")
    write("")

    write("C) TOP 40 TỔNG GẦN 1.052,65 NHẤT")
    write("------------------------------------------------------------")
    for i, r in enumerate(results_sorted_app[:40], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | filter={r['filter']} | "
            f"{r['kho_col']} | {r['value_col']} SUM={r['sum_value']:,.2f} | "
            f"lệch_app={r['diff_to_app_1052_65']:,.2f} | "
            f"lệch_delta={r['diff_to_delta_380_90']:,.2f} | {r['note']}"
        )

    write("")
    write("D) TOP 40 TỔNG GẦN PHẦN CHÊNH 380,90 NHẤT")
    write("------------------------------------------------------------")
    for i, r in enumerate(results_sorted_delta[:40], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | filter={r['filter']} | "
            f"{r['kho_col']} | {r['value_col']} SUM={r['sum_value']:,.2f} | "
            f"lệch_delta={r['diff_to_delta_380_90']:,.2f} | "
            f"lệch_app={r['diff_to_app_1052_65']:,.2f} | {r['note']}"
        )

    # CSV
    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = [
            "schema", "table", "filter", "kho_col", "value_col", "sum_value",
            "diff_to_app_1052_65", "diff_to_delta_380_90",
            "has_mathan", "has_tenthan", "note"
        ]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in sorted(results, key=lambda x: min(x["diff_to_app_1052_65"], x["diff_to_delta_380_90"])):
            w.writerow(r)

    write("")
    write("============================================================")
    write("HOÀN THÀNH")
    write("============================================================")
    write(f"Folder : {OUT_DIR}")
    write(f"TXT    : {OUT_TXT}")
    write(f"CSV    : {OUT_CSV}")
    write(f"Objects: {OUT_OBJECTS}")
    write("")
    write("Anh gửi lại 3 phần:")
    write("1. TOP 40 TỔNG GẦN 1.052,65 NHẤT")
    write("2. TOP 40 TỔNG GẦN PHẦN CHÊNH 380,90 NHẤT")
    write("3. 10 dòng đầu danh sách SQL object liên quan.")

    conn.close()

    try:
        subprocess.Popen(["explorer.exe", str(OUT_DIR)])
    except Exception:
        pass


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        write("")
        write("[LỖI] " + str(exc))
        write("Kiểm tra kết nối SQL Server, quyền truy cập DB hoặc ODBC Driver 18.")
        try:
            subprocess.Popen(["explorer.exe", str(OUT_DIR)])
        except Exception:
            pass
        sys.exit(1)
