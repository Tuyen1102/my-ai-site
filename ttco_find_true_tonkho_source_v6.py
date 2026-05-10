
# -*- coding: utf-8 -*-
import csv
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

SERVER = r"tuyenthancuaong.com.vn,52376"
DEFAULT_DB = "TTCO_THONGKE"

TARGET_APP = 1052.65
CDOTHAN_NOW = 671.75
CDOTHAN_PREV = 509.95
DELTA_FROM_NOW = round(TARGET_APP - CDOTHAN_NOW, 2)   # 380.90
DELTA_FROM_PREV = round(TARGET_APP - CDOTHAN_PREV, 2) # 542.70

USERPROFILE = Path(os.environ.get("USERPROFILE", str(Path.home())))
DESKTOP = USERPROFILE / "Desktop"
OUT_DIR = DESKTOP / "TTCO_FIND_TRUE_TONKHO_SOURCE"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_TXT = OUT_DIR / f"find_true_tonkho_source_v6_{STAMP}.txt"
OUT_CSV = OUT_DIR / f"find_true_tonkho_source_v6_{STAMP}.csv"
OUT_SCHEMA = OUT_DIR / f"schema_candidate_tables_v6_{STAMP}.txt"
OUT_OBJECTS = OUT_DIR / f"sql_objects_all_db_v6_{STAMP}.txt"
OUT_ERRORS = OUT_DIR / f"errors_v6_{STAMP}.txt"


def write(line=""):
    print(line)
    with OUT_TXT.open("a", encoding="utf-8") as f:
        f.write(str(line) + "\n")


def write_file(path, line=""):
    with path.open("a", encoding="utf-8") as f:
        f.write(str(line) + "\n")


def log_error(line):
    write_file(OUT_ERRORS, line)


def ensure_pyodbc():
    try:
        import pyodbc  # noqa
        return
    except Exception:
        write("Chưa có pyodbc. Đang thử cài pyodbc...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyodbc"])


def connect(db):
    import pyodbc
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={SERVER};"
        f"DATABASE={db};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str, timeout=20)


def qident(name):
    return "[" + str(name).replace("]", "]]") + "]"


def safe_float(v):
    try:
        if v is None:
            return None
        return float(v)
    except Exception:
        return None


def is_numeric_type(dtype):
    return str(dtype).lower() in {
        "int", "bigint", "smallint", "tinyint", "decimal", "numeric",
        "float", "real", "money", "smallmoney"
    }


def fetch_all(cur, sql, params=None):
    if params is None:
        params = []
    return cur.execute(sql, params).fetchall()


def get_accessible_databases():
    dbs = []
    try:
        conn = connect(DEFAULT_DB)
        cur = conn.cursor()
        sql = """
        SELECT name
        FROM sys.databases
        WHERE state_desc = 'ONLINE'
          AND (
                name LIKE 'TTCO%'
             OR name LIKE '%THONGKE%'
             OR name LIKE '%DHSX%'
             OR name LIKE '%CAN%'
             OR name LIKE '%KHO%'
          )
        ORDER BY name
        """
        rows = fetch_all(cur, sql)
        dbs = [r.name for r in rows]
        conn.close()
    except Exception as exc:
        log_error("get_accessible_databases: " + str(exc))

    if DEFAULT_DB not in dbs:
        dbs.insert(0, DEFAULT_DB)
    return dbs


def list_modules_all_dbs(dbs):
    write("A) TÌM STORED PROCEDURE / VIEW / FUNCTION TRONG TẤT CẢ DB TRUY CẬP ĐƯỢC")
    write("------------------------------------------------------------")
    total = 0
    keywords = [
        "G3_BC05", "BC05A", "CDOTHAN", "TonCK", "TonDK", "MaKho", "TonKho",
        "TonCuoi", "Nhap", "Xuat", "TKe", "Kho", "ThanNhap", "ThanXuat", "GiaoNhan"
    ]

    for db in dbs:
        try:
            conn = connect(db)
            cur = conn.cursor()
            conditions = " OR ".join([f"m.definition LIKE N'%{kw}%'" for kw in keywords])
            sql = f"""
            SELECT
                DB_NAME() AS db_name,
                o.type_desc,
                SCHEMA_NAME(o.schema_id) AS schema_name,
                o.name,
                m.definition
            FROM sys.sql_modules m
            INNER JOIN sys.objects o ON m.object_id = o.object_id
            WHERE {conditions}
            ORDER BY o.type_desc, SCHEMA_NAME(o.schema_id), o.name
            """
            rows = fetch_all(cur, sql)
            write(f"DB {db}: tìm được {len(rows)} object")
            for i, r in enumerate(rows[:80], start=1):
                total += 1
                fullname = f"{r.db_name}.{r.schema_name}.{r.name}"
                defn = r.definition or ""
                lower = (fullname + " " + defn).lower()
                score = sum(1 for kw in keywords if kw.lower() in lower)
                write(f"  {total:03d}. {r.type_desc} | {fullname} | score={score}")
                write_file(OUT_OBJECTS, "=" * 140)
                write_file(OUT_OBJECTS, f"{total:03d}. {r.type_desc} | {fullname} | score={score}")
                write_file(OUT_OBJECTS, "-" * 140)
                write_file(OUT_OBJECTS, defn)
                write_file(OUT_OBJECTS, "")
            conn.close()
        except Exception as exc:
            write(f"DB {db}: lỗi tìm object: {exc}")
            log_error(f"list_modules_all_dbs db={db}: {exc}")

    write(f"Tổng object liên quan: {total}")
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


def direct_cdothan_check():
    write("B) KIỂM TRA TRỰC TIẾP CDOTHAN")
    write("------------------------------------------------------------")
    try:
        conn = connect(DEFAULT_DB)
        cur = conn.cursor()
        sql = """
        SELECT NamHT, ThangHT, MaKho, MaThan, SUM(CAST(TonCK AS FLOAT)) AS TonCK
        FROM dbo.CDOTHAN
        WHERE CAST(MaKho AS NVARCHAR(100)) IN (N'1', N'01', N'Kho 1')
        GROUP BY NamHT, ThangHT, MaKho, MaThan
        ORDER BY NamHT DESC, ThangHT DESC, MaThan
        """
        rows = fetch_all(cur, sql)
        for r in rows[:20]:
            write(f"CDOTHAN | Nam={r.NamHT} | Thang={r.ThangHT} | MaKho={r.MaKho} | MaThan={r.MaThan} | TonCK={float(r.TonCK or 0):,.2f}")
        conn.close()
    except Exception as exc:
        write("Lỗi CDOTHAN: " + str(exc))
        log_error("direct_cdothan_check: " + str(exc))
    write("")


def scan_sums_all_dbs(dbs):
    write("C) QUÉT BẢNG/CỘT ĐỂ TÌM CÔNG THỨC KHỚP TTCO_APP")
    write("------------------------------------------------------------")
    write(f"Mục tiêu TTCO_APP        : {TARGET_APP:,.2f}")
    write(f"CDOTHAN tháng hiện tại   : {CDOTHAN_NOW:,.2f}")
    write(f"CDOTHAN tháng trước      : {CDOTHAN_PREV:,.2f}")
    write(f"Chênh với hiện tại       : {DELTA_FROM_NOW:,.2f}")
    write(f"Chênh với tháng trước    : {DELTA_FROM_PREV:,.2f}")
    write("")

    kho_re = re.compile(r"(^MaKho$|^Kho$|Kho|Ma_Kho|IDKho|KhoID|MaDV|MaDonVi)", re.I)
    val_re = re.compile(r"(Ton|Klg|KL|KhoiLuong|Luong|Tan|SL|SoLuong|Cuoi|CK|Dau|DK|Nhap|Xuat|Tang|Giam|Klg_Tan)", re.I)
    than_re = re.compile(r"(MaThan|TenThan|LoaiThan|Than)", re.I)
    date_re = re.compile(r"(NamHT|ThangHT|NgayHT|Ngay|NgayCT|Thang|Nam|Ca|Kip|TuNgay|DenNgay)", re.I)

    results = []
    error_count = 0
    scan_count = 0

    for db in dbs:
        try:
            conn = connect(db)
            cur = conn.cursor()
            cols = get_columns(cur)
        except Exception as exc:
            log_error(f"get_columns db={db}: {exc}")
            continue

        tables = {}
        for schema, table, col, dtype in cols:
            tables.setdefault((schema, table), []).append((col, dtype))

        # Ghi schema các bảng có liên quan để đọc thủ công.
        for (schema, table), table_cols in tables.items():
            table_name_lower = table.lower()
            interesting_table = any(k in table_name_lower for k in [
                "than", "kho", "giao", "nhap", "xuat", "cdothan", "kqsx", "tk", "tmp"
            ])
            has_kho = any(kho_re.search(c) for c, _ in table_cols)
            has_val = any(is_numeric_type(t) and val_re.search(c) for c, t in table_cols)
            if interesting_table or (has_kho and has_val):
                write_file(OUT_SCHEMA, "=" * 120)
                write_file(OUT_SCHEMA, f"{db}.{schema}.{table}")
                write_file(OUT_SCHEMA, "-" * 120)
                for c, t in table_cols:
                    write_file(OUT_SCHEMA, f"{c} | {t}")
                write_file(OUT_SCHEMA, "")

        for (schema, table), table_cols in tables.items():
            col_names = [c for c, _ in table_cols]
            kho_cols = [c for c in col_names if kho_re.search(c)]
            val_cols = [c for c, t in table_cols if is_numeric_type(t) and val_re.search(c)]
            than_cols = [c for c in col_names if than_re.search(c)]
            date_cols = [c for c in col_names if date_re.search(c)]

            if not kho_cols or not val_cols:
                continue

            # Ưu tiên các bảng có tên liên quan.
            table_priority = any(k in table.lower() for k in ["than", "kho", "nhap", "xuat", "giao", "cdothan", "kqsx", "tmp"])
            max_val_cols = 40 if table_priority else 12

            for kho_col in kho_cols[:5]:
                kho_expr = f"CAST({qident(kho_col)} AS NVARCHAR(100))"
                kho_filter = f"{kho_expr} IN (N'1', N'01', N'Kho 1')"

                filters = [("all", kho_filter)]

                if "NamHT" in col_names and "ThangHT" in col_names:
                    filters.append(("NamHT=2026 ThangHT=5", kho_filter + " AND [NamHT]=2026 AND [ThangHT]=5"))
                    filters.append(("NamHT=2026", kho_filter + " AND [NamHT]=2026"))

                for val_col in val_cols[:max_val_cols]:
                    val_expr = f"CAST({qident(val_col)} AS FLOAT)"

                    for filter_name, where_sql in filters:
                        scan_count += 1
                        try:
                            sql = (
                                "SELECT "
                                f"SUM({val_expr}) AS SumValue, "
                                "COUNT(*) AS RowCount, "
                                f"MIN({val_expr}) AS MinValue, "
                                f"MAX({val_expr}) AS MaxValue "
                                f"FROM {qident(schema)}.{qident(table)} "
                                f"WHERE {where_sql}"
                            )
                            row = cur.execute(sql).fetchone()
                            if not row:
                                continue

                            val = safe_float(row.SumValue)
                            if val is None:
                                continue

                            diff_app = abs(val - TARGET_APP)
                            diff_now = abs(val - DELTA_FROM_NOW)
                            diff_prev = abs(val - DELTA_FROM_PREV)

                            formula_now = CDOTHAN_NOW + val
                            formula_prev = CDOTHAN_PREV + val
                            diff_formula_now = abs(formula_now - TARGET_APP)
                            diff_formula_prev = abs(formula_prev - TARGET_APP)

                            keep = False
                            if diff_app <= 1000 or diff_now <= 1000 or diff_prev <= 1000:
                                keep = True
                            if diff_formula_now <= 1000 or diff_formula_prev <= 1000:
                                keep = True
                            if table_priority and 0 < abs(val) < 300000:
                                keep = True

                            if keep:
                                results.append({
                                    "db": db,
                                    "schema": schema,
                                    "table": table,
                                    "filter": filter_name,
                                    "kho_col": kho_col,
                                    "value_col": val_col,
                                    "sum_value": val,
                                    "diff_to_app": diff_app,
                                    "diff_to_delta_now_380_90": diff_now,
                                    "diff_to_delta_prev_542_70": diff_prev,
                                    "cdothan_now_plus_value": formula_now,
                                    "diff_formula_now": diff_formula_now,
                                    "cdothan_prev_plus_value": formula_prev,
                                    "diff_formula_prev": diff_formula_prev,
                                    "than_cols": ",".join(than_cols[:6]),
                                    "date_cols": ",".join(date_cols[:8]),
                                    "note": f"rows={row.RowCount}; min={safe_float(row.MinValue)}; max={safe_float(row.MaxValue)}",
                                })
                        except Exception as exc:
                            error_count += 1
                            if error_count <= 120:
                                log_error(f"SCAN ERROR db={db} table={schema}.{table} kho={kho_col} val={val_col} filter={filter_name}: {exc}")

        conn.close()

    write(f"Số phép quét: {scan_count}")
    write(f"Số lỗi quét: {error_count}")
    write(f"Số kết quả lưu: {len(results)}")
    write("")

    def print_top(title, rows, key, limit=60):
        write(title)
        write("------------------------------------------------------------")
        for i, r in enumerate(sorted(rows, key=key)[:limit], start=1):
            write(
                f"{i:02d}. {r['db']}.{r['schema']}.{r['table']} | filter={r['filter']} | "
                f"{r['kho_col']} | {r['value_col']} SUM={r['sum_value']:,.2f} | "
                f"diff_app={r['diff_to_app']:,.2f} | "
                f"diff_380={r['diff_to_delta_now_380_90']:,.2f} | "
                f"diff_542={r['diff_to_delta_prev_542_70']:,.2f} | "
                f"CDOTHAN_now+SUM={r['cdothan_now_plus_value']:,.2f} diff={r['diff_formula_now']:,.2f} | "
                f"CDOTHAN_prev+SUM={r['cdothan_prev_plus_value']:,.2f} diff={r['diff_formula_prev']:,.2f} | "
                f"than_cols={r['than_cols']} | date_cols={r['date_cols']} | {r['note']}"
            )
        write("")

    print_top("D) TOP GẦN TRỰC TIẾP 1.052,65", results, lambda x: x["diff_to_app"])
    print_top("E) TOP GẦN CHÊNH 380,90 = 1.052,65 - 671,75", results, lambda x: x["diff_to_delta_now_380_90"])
    print_top("F) TOP GẦN CHÊNH 542,70 = 1.052,65 - 509,95", results, lambda x: x["diff_to_delta_prev_542_70"])
    print_top("G) TOP CÔNG THỨC CDOTHAN THÁNG 5 + SUM = 1.052,65", results, lambda x: x["diff_formula_now"])
    print_top("H) TOP CÔNG THỨC CDOTHAN THÁNG 4 + SUM = 1.052,65", results, lambda x: x["diff_formula_prev"])

    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = [
            "db", "schema", "table", "filter", "kho_col", "value_col", "sum_value",
            "diff_to_app", "diff_to_delta_now_380_90", "diff_to_delta_prev_542_70",
            "cdothan_now_plus_value", "diff_formula_now",
            "cdothan_prev_plus_value", "diff_formula_prev",
            "than_cols", "date_cols", "note"
        ]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in sorted(results, key=lambda x: min(
            x["diff_to_app"],
            x["diff_to_delta_now_380_90"],
            x["diff_to_delta_prev_542_70"],
            x["diff_formula_now"],
            x["diff_formula_prev"],
        )):
            w.writerow(r)


def main():
    write("============================================================")
    write("TTCO - TÌM ĐÚNG NGUỒN TỒN KHO TTCO_APP - V6")
    write("============================================================")
    write(f"Server       : {SERVER}")
    write(f"Default DB   : {DEFAULT_DB}")
    write(f"TTCO_APP     : {TARGET_APP:,.2f}")
    write(f"CDOTHAN now  : {CDOTHAN_NOW:,.2f}")
    write(f"CDOTHAN prev : {CDOTHAN_PREV:,.2f}")
    write(f"Delta now    : {DELTA_FROM_NOW:,.2f}")
    write(f"Delta prev   : {DELTA_FROM_PREV:,.2f}")
    write("")
    write("Kết quả:")
    write(f"Folder : {OUT_DIR}")
    write(f"TXT    : {OUT_TXT}")
    write(f"CSV    : {OUT_CSV}")
    write(f"Schema : {OUT_SCHEMA}")
    write(f"Objects: {OUT_OBJECTS}")
    write(f"Errors : {OUT_ERRORS}")
    write("")

    ensure_pyodbc()
    dbs = get_accessible_databases()
    write("DB truy cập được: " + ", ".join(dbs))
    write("")

    list_modules_all_dbs(dbs)
    direct_cdothan_check()
    scan_sums_all_dbs(dbs)

    write("============================================================")
    write("HOÀN THÀNH")
    write("============================================================")
    write("Anh gửi lại file TXT chính và nếu cần gửi thêm errors_v6 để tôi sửa backend/server.py.")
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
        write("Gửi lại file TXT/errors để kiểm tra tiếp.")
        try:
            subprocess.Popen(["explorer.exe", str(OUT_DIR)])
        except Exception:
            pass
        sys.exit(1)
