import pyodbc
import pandas as pd
from pathlib import Path
from datetime import datetime

# ======================================================
# DÒ NGUỒN DỮ LIỆU G3_BC05 TRONG DATABASE TTCO_APP
# Chạy trên máy công ty có quyền kết nối SQL Server
# ======================================================

SERVER = r"tuyenthancuaong.com.vn,52376"   # Sửa lại nếu server thực tế khác
DATABASE = "TTCO_THONGKE"

OUTPUT_DIR = Path(__file__).resolve().parent / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def connect_db():
    conn_str = (
        "DRIVER={ODBC Driver 18 for SQL Server};"
        f"SERVER={SERVER};"
        f"DATABASE={DATABASE};"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )
    return pyodbc.connect(conn_str)


def query_df(conn, sql, params=None):
    return pd.read_sql(sql, conn, params=params or [])


def main():
    print("Đang kết nối SQL Server...")
    conn = connect_db()
    print("Kết nối thành công.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = OUTPUT_DIR / f"g3_bc05_discovery_{timestamp}.xlsx"

    results = {}

    # 1. Tìm stored procedure/view/function có nhắc đến G3_BC05
    sql_modules_g3 = """
    SELECT 
        o.type_desc,
        SCHEMA_NAME(o.schema_id) AS schema_name,
        o.name AS object_name,
        m.definition
    FROM sys.sql_modules m
    INNER JOIN sys.objects o ON m.object_id = o.object_id
    WHERE 
        m.definition LIKE N'%G3_BC05%'
        OR m.definition LIKE N'%BC05%'
        OR m.definition LIKE N'%Tồn CK%'
        OR m.definition LIKE N'%Ton CK%'
        OR m.definition LIKE N'%TonCK%'
        OR m.definition LIKE N'%Tồn cuối kỳ%'
    ORDER BY o.type_desc, o.name;
    """
    results["modules_g3_bc05"] = query_df(conn, sql_modules_g3)

    # 2. Tìm bảng/cột có tên liên quan tồn kho/kho/than/khối lượng
    sql_columns = """
    SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
        COLUMN_NAME LIKE N'%Kho%'
        OR COLUMN_NAME LIKE N'%MaKho%'
        OR COLUMN_NAME LIKE N'%TenKho%'
        OR COLUMN_NAME LIKE N'%Than%'
        OR COLUMN_NAME LIKE N'%MaThan%'
        OR COLUMN_NAME LIKE N'%TenThan%'
        OR COLUMN_NAME LIKE N'%Ton%'
        OR COLUMN_NAME LIKE N'%Tồn%'
        OR COLUMN_NAME LIKE N'%Klg%'
        OR COLUMN_NAME LIKE N'%KLuong%'
        OR COLUMN_NAME LIKE N'%Klg_Tan%'
    ORDER BY TABLE_NAME, COLUMN_NAME;
    """
    results["related_columns"] = query_df(conn, sql_columns)

    # 3. Tìm bảng có tên liên quan tồn/kho/than
    sql_tables = """
    SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE 
        TABLE_NAME LIKE N'%Ton%'
        OR TABLE_NAME LIKE N'%Tồn%'
        OR TABLE_NAME LIKE N'%Kho%'
        OR TABLE_NAME LIKE N'%Than%'
        OR TABLE_NAME LIKE N'%BC05%'
        OR TABLE_NAME LIKE N'%G3%'
    ORDER BY TABLE_NAME;
    """
    results["related_tables"] = query_df(conn, sql_tables)

    # 4. Thống kê nhanh số dòng các bảng nghi ngờ
    table_candidates = results["related_tables"]["TABLE_NAME"].drop_duplicates().tolist()

    row_count_rows = []
    for table_name in table_candidates:
        try:
            sql_count = f"SELECT COUNT(*) AS row_count FROM [{table_name}]"
            df_count = query_df(conn, sql_count)
            row_count_rows.append({
                "TABLE_NAME": table_name,
                "row_count": int(df_count.iloc[0]["row_count"])
            })
        except Exception as e:
            row_count_rows.append({
                "TABLE_NAME": table_name,
                "row_count": None,
                "error": str(e)
            })

    results["table_row_counts"] = pd.DataFrame(row_count_rows)

    # 5. Lấy thử 20 dòng đầu của một số bảng nghi ngờ nhất
    priority_keywords = [
        "ton", "kho", "than", "bc05", "g3"
    ]

    sample_tables = []
    for table_name in table_candidates:
        lower = table_name.lower()
        if any(k in lower for k in priority_keywords):
            sample_tables.append(table_name)

    sample_tables = sample_tables[:20]

    for table_name in sample_tables:
        try:
            df_sample = query_df(conn, f"SELECT TOP 20 * FROM [{table_name}]")
            safe_sheet_name = f"sample_{table_name}"[:31]
            results[safe_sheet_name] = df_sample
        except Exception as e:
            results[f"err_{table_name}"[:31]] = pd.DataFrame([{
                "TABLE_NAME": table_name,
                "error": str(e)
            }])

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        for sheet_name, df in results.items():
            safe_name = sheet_name[:31]
            df.to_excel(writer, sheet_name=safe_name, index=False)

    conn.close()

    print("Đã xuất file dò nguồn:")
    print(output_file)


if __name__ == "__main__":
    main()