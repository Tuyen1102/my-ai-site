
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
TARGET_VALUE = 1052.65

# v3: luôn xuất kết quả ra Desktop để dễ tìm
DESKTOP = Path.home() / "Desktop"
OUT_DIR = DESKTOP / "TTCO_CHECK_KHO1_1052_65"
OUT_DIR.mkdir(parents=True, exist_ok=True)

STAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_TXT = OUT_DIR / f"check_kho1_1052_65_{STAMP}.txt"
OUT_CSV = OUT_DIR / f"check_kho1_1052_65_{STAMP}.csv"


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


def cast_to_text_sql(col: str) -> str:
    return f"CAST({qident(col)} AS NVARCHAR(100))"


def cast_to_float_sql(col: str) -> str:
    return f"CAST({qident(col)} AS FLOAT)"


def main():
    ensure_pyodbc()

    write("============================================================")
    write("TTCO - KIỂM TRA NGUỒN TỒN KHO KHO 1 = 1.052,65 - V3")
    write("============================================================")
    write(f"Server   : {SERVER}")
    write(f"Database : {DATABASE}")
    write(f"Giá trị TTCO_APP báo: {TARGET_VALUE}")
    write("")
    write("KẾT QUẢ SẼ XUẤT RA DESKTOP:")
    write(f"Folder : {OUT_DIR}")
    write(f"TXT    : {OUT_TXT}")
    write(f"CSV    : {OUT_CSV}")
    write("")

    conn = connect()
    cur = conn.cursor()
    results = []

    write("1) KIỂM TRA CDOTHAN THEO TẤT CẢ KỲ")
    write("------------------------------------------------------------")
    try:
        sql = """
        SELECT NamHT, ThangHT, MaKho, MaThan, SUM(CAST(TonCK AS FLOAT)) AS TonCK
        FROM dbo.CDOTHAN
        WHERE CAST(MaKho AS NVARCHAR(100)) IN (N'1', N'01', N'Kho 1')
        GROUP BY NamHT, ThangHT, MaKho, MaThan
        ORDER BY NamHT DESC, ThangHT DESC, MaThan;
        """
        rows = cur.execute(sql).fetchall()
        write(f"Số dòng CDOTHAN Kho 1: {len(rows)}")
        for r in rows[:100]:
            val = float(r.TonCK or 0)
            write(f"CDOTHAN | Nam={r.NamHT} | Thang={r.ThangHT} | MaKho={r.MaKho} | MaThan={r.MaThan} | TonCK={val:,.2f}")
            results.append({
                "source": "CDOTHAN",
                "schema": "dbo",
                "table": "CDOTHAN",
                "period": f"NamHT={r.NamHT} | ThangHT={r.ThangHT}",
                "kho_col": "MaKho",
                "kho_value": str(r.MaKho),
                "than_col": "MaThan",
                "than_value": str(r.MaThan),
                "value_col": "TonCK",
                "value": val,
                "diff_to_1052_65": abs(val - TARGET_VALUE),
                "note": "CDOTHAN grouped by NamHT,ThangHT,MaKho,MaThan",
            })
        write("")
    except Exception as exc:
        write(f"Lỗi kiểm tra CDOTHAN: {exc}")
        write("")

    write("2) QUÉT CÁC BẢNG CÓ CỘT KHO VÀ CỘT SỐ LIỆU")
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

    kho_patterns = re.compile(r"^(MaKho|Kho|Mak|Ma_Kho|IDKho|KhoID)$|Kho", re.I)
    than_patterns = re.compile(r"(MaThan|TenThan|LoaiThan|Than)", re.I)
    value_patterns = re.compile(r"(Ton|Klg|KL|KhoiLuong|Luong|Tan|SL|SoLuong|Cuoi|CK|Nhap|Xuat)", re.I)
    period_patterns = re.compile(r"^(NamHT|ThangHT|NgayHT|Ngay|NgayCT|Thang|Nam|Ca|Kip)$", re.I)

    scanned = 0
    skipped = 0

    for (schema, table), table_cols in tables.items():
        col_names = [c for c, _ in table_cols]
        kho_cols = [c for c in col_names if kho_patterns.search(c)]
        if not kho_cols:
            continue

        num_cols = [c for c, t in table_cols if is_numeric_type(t) and value_patterns.search(c)]
        if not num_cols:
            continue

        than_cols = [c for c in col_names if than_patterns.search(c)]
        period_cols = [c for c in col_names if period_patterns.search(c)]

        for kho_col in kho_cols[:3]:
            for val_col in num_cols[:20]:
                scanned += 1
                try:
                    select_extra = []
                    group_extra = []

                    for c in period_cols[:5] + than_cols[:3]:
                        select_extra.append(qident(c))
                        group_extra.append(qident(c))

                    extra_sql = ", " + ", ".join(select_extra) if select_extra else ""
                    group_sql = ", " + ", ".join(group_extra) if group_extra else ""

                    kho_text = cast_to_text_sql(kho_col)
                    val_float = cast_to_float_sql(val_col)

                    sql = f"""
                    SELECT TOP 100
                        {qident(kho_col)} AS KhoValue
                        {extra_sql},
                        SUM({val_float}) AS CheckValue,
                        COUNT(*) AS RowCount
                    FROM {qident(schema)}.{qident(table)}
                    WHERE {kho_text} IN (N'1', N'01', N'Kho 1')
                    GROUP BY {qident(kho_col)}{group_sql}
                    HAVING SUM({val_float}) IS NOT NULL
                    ORDER BY ABS(SUM({val_float}) - ?) ASC;
                    """
                    rows = cur.execute(sql, TARGET_VALUE).fetchall()
                    if not rows:
                        continue

                    for r in rows[:8]:
                        val = safe_float(getattr(r, "CheckValue", None))
                        if val is None:
                            continue

                        diff = abs(val - TARGET_VALUE)
                        if diff <= 300 or (0 < val < 100000):
                            period = []
                            than = []
                            for c in period_cols[:5]:
                                if hasattr(r, c):
                                    period.append(f"{c}={getattr(r, c)}")
                            for c in than_cols[:3]:
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
                    skipped += 1
                    continue

    results_sorted = sorted(results, key=lambda x: x["diff_to_1052_65"])

    write(f"Số phép quét: {scanned}")
    write(f"Số phép bỏ qua do lỗi kiểu dữ liệu/quyền: {skipped}")
    write(f"Số kết quả thu được: {len(results_sorted)}")
    write("")
    write("3) TOP 50 KẾT QUẢ GẦN 1.052,65 NHẤT")
    write("------------------------------------------------------------")

    for i, r in enumerate(results_sorted[:50], start=1):
        write(
            f"{i:02d}. {r['schema']}.{r['table']} | "
            f"{r['kho_col']}={r['kho_value']} | "
            f"{r['value_col']}={r['value']:,.2f} | "
            f"Lệch={r['diff_to_1052_65']:,.2f} | "
            f"{r['period']} | {r['than_col']} {r['than_value']} | {r['note']}"
        )

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
    write("Anh gửi lại phần TOP 50 kết quả gần 1.052,65 nhất.")
    write("Tôi sẽ dựa vào bảng/cột đúng để sửa backend/server.py.")

    conn.close()

    # Mở folder output tự động
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
        write("Kiểm tra lại kết nối SQL Server, ODBC Driver 18 hoặc quyền truy cập DB.")
        try:
            subprocess.Popen(["explorer.exe", str(OUT_DIR)])
        except Exception:
            pass
        sys.exit(1)
