
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
TARGET_KHO_TEXT = "1"
TARGET_VALUE = 1052.65
TOLERANCE = 0.05

BASE_DIR = Path.cwd()
OUT_DIR = BASE_DIR / "ttco_check_output"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_TXT = OUT_DIR / f"check_kho1_1052_65_{datetime.now():%Y%m%d_%H%M%S}.txt"
OUT_CSV = OUT_DIR / f"check_kho1_1052_65_{datetime.now():%Y%m%d_%H%M%S}.csv"


def write(line=""):
    print(line)
    with OUT_TXT.open("a", encoding="utf-8") as f:
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
    return t.lower() in {
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
    import pyodbc

    write("============================================================")
    write("TTCO - KIỂM TRA NGUỒN TỒN KHO KHO 1 = 1.052,65")
    write("============================================================")
    write(f"Server   : {SERVER}")
    write(f"Database : {DATABASE}")
    write(f"Kho cần kiểm tra: {TARGET_KHO_TEXT}")
    write(f"Giá trị TTCO_APP báo: {TARGET_VALUE}")
    write(f"Output TXT: {OUT_TXT}")
    write(f"Output CSV: {OUT_CSV}")
    write("")

    conn = connect()
    cur = conn.cursor()

    results = []

    # 1) Kiểm tra trực tiếp CDOTHAN theo tất cả kỳ.
    write("1) KIỂM TRA CDOTHAN THEO TẤT CẢ KỲ")
    write("------------------------------------------------------------")
    try:
        sql = """
        SELECT NamHT, ThangHT, MaKho, MaThan, SUM(CAST(TonCK AS float)) AS TonCK
        FROM dbo.CDOTHAN
        WHERE TRY_CONVERT(nvarchar(50), MaKho) IN (N'1', N'01')
        GROUP BY NamHT, ThangHT, MaKho, MaThan
        ORDER BY NamHT DESC, ThangHT DESC, MaThan;
        """
        rows = cur.execute(sql).fetchall()
        write(f"Số dòng CDOTHAN Kho 1: {len(rows)}")
        for r in rows[:50]:
            line = f"CDOTHAN | Nam={r.NamHT} | Thang={r.ThangHT} | MaKho={r.MaKho} | MaThan={r.MaThan} | TonCK={float(r.TonCK):,.2f}"
            write(line)
            diff = abs(float(r.TonCK) - TARGET_VALUE)
            results.append({
                "source": "CDOTHAN",
                "schema": "dbo",
                "table": "CDOTHAN",
                "period": f"{r.NamHT}-{r.ThangHT}",
                "kho_col": "MaKho",
                "kho_value": str(r.MaKho),
                "than_col": "MaThan",
                "than_value": str(r.MaThan),
                "value_col": "TonCK",
                "value": float(r.TonCK),
                "diff_to_1052_65": diff,
                "note": "CDOTHAN grouped by NamHT,ThangHT,MaKho,MaThan",
            })
        write("")
    except Exception as exc:
        write(f"Lỗi kiểm tra CDOTHAN: {exc}")
        write("")

    # 2) Tìm các bảng có cột kho và cột số liệu, tính SUM theo Kho 1.
    write("2) QUÉT CÁC BẢNG CÓ CỘT KHO VÀ CỘT SỐ LIỆU")
    write("------------------------------------------------------------")

    col_sql = """
    SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_TYPE IS NULL OR 1=1
    ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION;
    """
    cols = cur.execute(col_sql).fetchall()

    tables = {}
    for schema, table, col, dtype in cols:
        tables.setdefault((schema, table), []).append((col, dtype))

    kho_patterns = re.compile(r"^(MaKho|Kho|Mak|Ma_Kho|IDKho|KhoID)$", re.I)
    than_patterns = re.compile(r"(MaThan|TenThan|LoaiThan|Than)", re.I)
    value_patterns = re.compile(r"(Ton|Tồn|Klg|KL|KhoiLuong|Luong|Tan|SL|SoLuong|Cuoi|CK)", re.I)

    scanned = 0
    matched = 0

    for (schema, table), table_cols in tables.items():
        col_names = [c for c, _ in table_cols]
        kho_cols = [c for c in col_names if kho_patterns.search(c)]
        if not kho_cols:
            continue

        num_cols = [c for c, t in table_cols if is_numeric_type(t) and value_patterns.search(c)]
        if not num_cols:
            continue

        than_cols = [c for c in col_names if than_patterns.search(c)]
        period_cols = [c for c in col_names if c in ("NamHT", "ThangHT", "NgayHT", "Ngay", "NgayCT", "Thang", "Nam")]

        for kho_col in kho_cols[:2]:
            for val_col in num_cols[:12]:
                scanned += 1
                try:
                    select_extra = []
                    group_extra = []
                    for c in period_cols[:4] + than_cols[:2]:
                        select_extra.append(qident(c))
                        group_extra.append(qident(c))

                    extra_sql = ""
                    group_sql = ""
                    if select_extra:
                        extra_sql = ", " + ", ".join(select_extra)
                        group_sql = ", " + ", ".join(group_extra)

                    sql = f"""
                    SELECT TOP 200
                        {qident(kho_col)} AS KhoValue
                        {extra_sql},
                        SUM(TRY_CAST({qident(val_col)} AS float)) AS CheckValue,
                        COUNT(*) AS RowCount
                    FROM {qident(schema)}.{qident(table)}
                    WHERE TRY_CONVERT(nvarchar(50), {qident(kho_col)}) IN (N'1', N'01', N'Kho 1')
                    GROUP BY {qident(kho_col)}{group_sql}
                    HAVING SUM(TRY_CAST({qident(val_col)} AS float)) IS NOT NULL
                    ORDER BY ABS(SUM(TRY_CAST({qident(val_col)} AS float)) - ?) ASC;
                    """
                    rows = cur.execute(sql, TARGET_VALUE).fetchall()
                    if not rows:
                        continue

                    for r in rows[:10]:
                        val = safe_float(getattr(r, "CheckValue", None))
                        if val is None:
                            continue
                        diff = abs(val - TARGET_VALUE)
                        # Lưu các giá trị gần hoặc các bảng có khả năng cao.
                        if diff <= 200 or val > 0:
                            matched += 1
                            period = []
                            than = []
                            for c in period_cols[:4]:
                                if hasattr(r, c):
                                    period.append(f"{c}={getattr(r, c)}")
                            for c in than_cols[:2]:
                                if hasattr(r, c):
                                    than.append(f"{c}={getattr(r, c)}")

                            results.append({
                                "source": "scan",
                                "schema": schema,
                                "table": table,
                                "period": " | ".join(period),
                                "kho_col": kho_col,
                                "kho_value": str(getattr(r, "KhoValue", "")),
                                "than_col": " | ".join(than),
                                "than_value": "",
                                "value_col": val_col,
                                "value": val,
                                "diff_to_1052_65": diff,
                                "note": f"RowCount={getattr(r, 'RowCount', '')}",
                            })
                except Exception:
                    continue

    results_sorted = sorted(results, key=lambda x: x["diff_to_1052_65"])

    write(f"Số phép quét: {scanned}")
    write(f"Số kết quả thu được: {len(results_sorted)}")
    write("")
    write("3) TOP 30 KẾT QUẢ GẦN 1.052,65 NHẤT")
    write("------------------------------------------------------------")

    for i, r in enumerate(results_sorted[:30], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | "
            f"{r['kho_col']}={r['kho_value']} | "
            f"{r['value_col']}={r['value']:,.2f} | "
            f"Lệch={r['diff_to_1052_65']:,.2f} | "
            f"{r['period']} | {r['than_col']} {r['than_value']} | {r['note']}"
        )

    # CSV
    with OUT_CSV.open("w", newline="", encoding="utf-8-sig") as f:
        fieldnames = [
            "source", "schema", "table", "period", "kho_col", "kho_value",
            "than_col", "than_value", "value_col", "value", "diff_to_1052_65", "note"
        ]
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in results_sorted:
            w.writerow(r)

    write("")
    write("============================================================")
    write("HOÀN THÀNH")
    write("============================================================")
    write(f"File TXT: {OUT_TXT}")
    write(f"File CSV: {OUT_CSV}")
    write("")
    write("Anh mở file TXT/CSV, tìm dòng nào có Value gần đúng 1052.65 nhất.")
    write("Gửi lại tôi 5 dòng đầu TOP kết quả, tôi sẽ sửa backend/server.py theo đúng nguồn đó.")

    conn.close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        write("")
        write("[LỖI] " + str(exc))
        write("Kiểm tra lại kết nối SQL Server, ODBC Driver 18 hoặc quyền truy cập DB.")
        sys.exit(1)
