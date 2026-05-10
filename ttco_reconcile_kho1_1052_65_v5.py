
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
TARGET_DELTA = round(TARGET_APP - CURRENT_CDOTHAN, 2)

USERPROFILE = Path(os.environ.get("USERPROFILE", str(Path.home())))
DESKTOP = USERPROFILE / "Desktop"
OUT_DIR = DESKTOP / "TTCO_RECONCILE_KHO1_TONKHO"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_TXT = OUT_DIR / ("reconcile_kho1_1052_65_v5_" + STAMP + ".txt")
OUT_CSV = OUT_DIR / ("reconcile_kho1_1052_65_v5_" + STAMP + ".csv")
OUT_OBJECTS = OUT_DIR / ("sql_objects_tonkho_v5_" + STAMP + ".txt")


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


def is_numeric_type(dtype: str) -> bool:
    return str(dtype).lower() in {
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


def fetch_all(cur, sql, params=None):
    if params is None:
        params = []
    return cur.execute(sql, params).fetchall()


def list_sql_objects(cur):
    write("A) STORED PROCEDURE / VIEW / FUNCTION LIÊN QUAN TỒN KHO")
    write("------------------------------------------------------------")
    sql = """
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
        OR m.definition LIKE N'%TonDK%'
        OR m.definition LIKE N'%MaKho%'
        OR m.definition LIKE N'%TonKho%'
        OR m.definition LIKE N'%Tồn%'
        OR m.definition LIKE N'%ton%'
        OR m.definition LIKE N'%kho%'
        OR m.definition LIKE N'%G3_BC05%'
        OR m.definition LIKE N'%BC05A%'
        OR m.definition LIKE N'%TKe%'
    ORDER BY o.type_desc, SCHEMA_NAME(o.schema_id), o.name
    """
    try:
        rows = fetch_all(cur, sql)
        write("Số object tìm được: " + str(len(rows)))
        for i, r in enumerate(rows[:80], start=1):
            name = str(r.schema_name) + "." + str(r.name)
            definition = r.definition or ""
            lower = (name + " " + definition).lower()
            score = 0
            for kw in ["g3_bc05", "bc05a", "cdothan", "tonck", "tondk", "makho", "tonkho", "tke"]:
                if kw in lower:
                    score += 1
            write(f"{i:02d}. {r.type_desc} | {name} | score={score}")
            write_obj("=" * 120)
            write_obj(f"{i:02d}. {r.type_desc} | {name} | score={score}")
            write_obj("-" * 120)
            write_obj(definition)
            write_obj("")
    except Exception as exc:
        write("Lỗi tìm SQL object: " + str(exc))
    write("")


def get_columns(cur):
    sql = """
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
    ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
    """
    return fetch_all(cur, sql)


def scan_tables(cur):
    write("B) QUÉT BẢNG/CỘT CÓ THỂ TÍNH RA 1.052,65 HOẶC CHÊNH 380,90")
    write("------------------------------------------------------------")

    cols = get_columns(cur)
    tables = {}
    for schema, table, col, dtype in cols:
        tables.setdefault((schema, table), []).append((col, dtype))

    kho_re = re.compile(r"(^MaKho$|^Kho$|Kho|Ma_Kho|IDKho|KhoID)", re.I)
    val_re = re.compile(r"(Ton|Klg|KL|KhoiLuong|Luong|Tan|SL|SoLuong|Cuoi|CK|Dau|DK|Nhap|Xuat|Tang|Giam)", re.I)
    than_re = re.compile(r"(MaThan|TenThan|LoaiThan|Than)", re.I)
    period_re = re.compile(r"^(NamHT|ThangHT|NgayHT|Ngay|NgayCT|Thang|Nam|Ca|Kip)$", re.I)

    results = []
    scanned = 0
    skipped = 0

    for (schema, table), table_cols in tables.items():
        col_names = [c for c, _ in table_cols]
        kho_cols = [c for c in col_names if kho_re.search(c)]
        num_cols = [c for c, t in table_cols if is_numeric_type(t) and val_re.search(c)]
        than_cols = [c for c in col_names if than_re.search(c)]
        period_cols = [c for c in col_names if period_re.search(c)]

        if not kho_cols or not num_cols:
            continue

        for kho_col in kho_cols[:4]:
            base_filter = "CAST(" + qident(kho_col) + " AS NVARCHAR(100)) IN (N'1', N'01', N'Kho 1')"
            filters = [("all", base_filter)]

            if "NamHT" in col_names and "ThangHT" in col_names:
                filters.append(("NamHT=2026 ThangHT=5", base_filter + " AND [NamHT]=2026 AND [ThangHT]=5"))
                filters.append(("NamHT=2026", base_filter + " AND [NamHT]=2026"))

            for val_col in num_cols[:30]:
                for filter_name, where_sql in filters:
                    scanned += 1
                    try:
                        val_expr = "CAST(" + qident(val_col) + " AS FLOAT)"
                        sql = (
                            "SELECT "
                            "SUM(" + val_expr + ") AS SumValue, "
                            "COUNT(*) AS RowCount, "
                            "MIN(" + val_expr + ") AS MinValue, "
                            "MAX(" + val_expr + ") AS MaxValue "
                            "FROM " + qident(schema) + "." + qident(table) + " "
                            "WHERE " + where_sql
                        )
                        row = cur.execute(sql).fetchone()
                        if not row:
                            continue
                        val = safe_float(row.SumValue)
                        if val is None:
                            continue

                        diff_app = abs(val - TARGET_APP)
                        diff_delta = abs(val - TARGET_DELTA)

                        if diff_app <= 1000 or diff_delta <= 1000 or (0 < abs(val) < 200000):
                            results.append({
                                "schema": schema,
                                "table": table,
                                "filter": filter_name,
                                "kho_col": kho_col,
                                "value_col": val_col,
                                "sum_value": val,
                                "diff_to_app_1052_65": diff_app,
                                "diff_to_delta_380_90": diff_delta,
                                "has_than_col": ",".join(than_cols[:5]),
                                "period_cols": ",".join(period_cols[:5]),
                                "note": "rows=" + str(row.RowCount) + "; min=" + str(safe_float(row.MinValue)) + "; max=" + str(safe_float(row.MaxValue)),
                            })
                    except Exception as exc:
                        skipped += 1
                        continue

    write("Số phép quét: " + str(scanned))
    write("Số phép bỏ qua: " + str(skipped))
    write("Số kết quả lưu: " + str(len(results)))
    write("")

    results_app = sorted(results, key=lambda x: x["diff_to_app_1052_65"])
    results_delta = sorted(results, key=lambda x: x["diff_to_delta_380_90"])

    write("C) TOP 50 TỔNG GẦN 1.052,65 NHẤT")
    write("------------------------------------------------------------")
    for i, r in enumerate(results_app[:50], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | filter={r['filter']} | "
            f"{r['kho_col']} | {r['value_col']} SUM={r['sum_value']:,.2f} | "
            f"lệch_app={r['diff_to_app_1052_65']:,.2f} | "
            f"lệch_delta={r['diff_to_delta_380_90']:,.2f} | "
            f"than_cols={r['has_than_col']} | period_cols={r['period_cols']} | {r['note']}"
        )

    write("")
    write("D) TOP 50 TỔNG GẦN PHẦN CHÊNH 380,90 NHẤT")
    write("------------------------------------------------------------")
    for i, r in enumerate(results_delta[:50], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | filter={r['filter']} | "
            f"{r['kho_col']} | {r['value_col']} SUM={r['sum_value']:,.2f} | "
            f"lệch_delta={r['diff_to_delta_380_90']:,.2f} | "
            f"lệch_app={r['diff_to_app_1052_65']:,.2f} | "
            f"than_cols={r['has_than_col']} | period_cols={r['period_cols']} | {r['note']}"
        )

    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = [
            "schema", "table", "filter", "kho_col", "value_col", "sum_value",
            "diff_to_app_1052_65", "diff_to_delta_380_90",
            "has_than_col", "period_cols", "note"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in sorted(results, key=lambda x: min(x["diff_to_app_1052_65"], x["diff_to_delta_380_90"])):
            writer.writerow(r)


def main():
    write("============================================================")
    write("TTCO - ĐỐI CHIẾU NGUỒN TỒN KHO KHO 1 = 1.052,65 - V5")
    write("============================================================")
    write("Server       : " + SERVER)
    write("Database     : " + DATABASE)
    write("CDOTHAN hiện : " + str(CURRENT_CDOTHAN))
    write("TTCO_APP     : " + str(TARGET_APP))
    write("Chênh lệch   : " + str(TARGET_DELTA))
    write("")
    write("Kết quả xuất tại:")
    write("Folder : " + str(OUT_DIR))
    write("TXT    : " + str(OUT_TXT))
    write("CSV    : " + str(OUT_CSV))
    write("Objects: " + str(OUT_OBJECTS))
    write("")

    ensure_pyodbc()
    conn = connect()
    cur = conn.cursor()

    list_sql_objects(cur)
    scan_tables(cur)

    conn.close()

    write("")
    write("============================================================")
    write("HOÀN THÀNH")
    write("============================================================")
    write("Anh gửi lại file TXT kết quả để tôi sửa backend/server.py theo đúng nguồn TTCO_APP.")

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
        write("Kiểm tra kết nối SQL Server, quyền DB hoặc ODBC Driver 18.")
        try:
            subprocess.Popen(["explorer.exe", str(OUT_DIR)])
        except Exception:
            pass
        sys.exit(1)
