import warnings
from pathlib import Path
from datetime import datetime

import pandas as pd
import pyodbc

warnings.filterwarnings("ignore", category=UserWarning)

SERVER = r"tuyenthancuaong.com.vn,52376"
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


def read_sql(conn, sql, params=None):
    return pd.read_sql(sql, conn, params=params or [])


def main():
    print("Đang kết nối database...")
    conn = connect_db()
    print("Kết nối thành công.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = OUTPUT_DIR / f"mathan_mapping_fast_{timestamp}.xlsx"

    results = {}

    # 1. Kỳ mới nhất trong CDOTHAN
    sql_period = """
    SELECT TOP 1 NamHT, ThangHT
    FROM CDOTHAN
    GROUP BY NamHT, ThangHT
    ORDER BY NamHT DESC, ThangHT DESC;
    """
    df_period = read_sql(conn, sql_period)
    results["Ky_moi_nhat"] = df_period

    if df_period.empty:
        raise RuntimeError("Không tìm thấy kỳ dữ liệu trong CDOTHAN.")

    nam = int(df_period.iloc[0]["NamHT"])
    thang = int(df_period.iloc[0]["ThangHT"])

    print(f"Kỳ mới nhất: NamHT={nam}, ThangHT={thang}")

    # 2. Lấy MaThan đang phát sinh tồn CK
    sql_cdothan = """
    SELECT
        NamHT,
        ThangHT,
        MaKho,
        MaThan,
        SUM(TonCK) AS TonCK
    FROM CDOTHAN
    WHERE NamHT = ? AND ThangHT = ?
    GROUP BY NamHT, ThangHT, MaKho, MaThan
    ORDER BY MaKho, MaThan;
    """
    df_cdothan = read_sql(conn, sql_cdothan, [nam, thang])
    results["CDOTHAN_latest"] = df_cdothan

    df_mathan = (
        df_cdothan.groupby("MaThan", as_index=False)
        .agg(SoKho=("MaKho", "nunique"), TongTonCK=("TonCK", "sum"))
        .sort_values("MaThan")
    )
    results["MaThan_trong_CDOTHAN"] = df_mathan

    # 3. Tìm bảng có cột MaThan
    sql_tables = """
    SELECT
        TABLE_SCHEMA,
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
        COLUMN_NAME LIKE N'%MaThan%'
        OR COLUMN_NAME LIKE N'%Ma_Than%'
    ORDER BY TABLE_NAME, COLUMN_NAME;
    """
    df_tables = read_sql(conn, sql_tables)
    results["Tables_with_MaThan"] = df_tables

    # 4. Ưu tiên các bảng danh mục hay gặp, tránh quét toàn DB
    candidate_table_names = [
        "DMTHAN",
        "DM_THAN",
        "DM_Than",
        "DMThan",
        "DMCT",
        "DM_CT",
        "DMChungLoaiThan",
        "DM_CHUNGLOAITHAN",
        "DM_LOAITHAN",
        "DMLoaiThan",
        "DMMA_THAN",
        "DM_MATHAN",
        "DMHANGHOA",
        "DM_HANGHOA",
        "DMVATU",
        "DM_VATTU",
    ]

    existing_candidates = []
    for table_name in candidate_table_names:
        sql_exists = """
        SELECT TABLE_SCHEMA, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME = ?;
        """
        df_exists = read_sql(conn, sql_exists, [table_name])
        if not df_exists.empty:
            existing_candidates.extend(df_exists.to_dict("records"))

    results["Existing_priority_tables"] = pd.DataFrame(existing_candidates)

    # 5. Tự động lấy sample các bảng có MaThan, nhưng giới hạn 30 bảng đầu
    unique_tables = (
        df_tables[["TABLE_SCHEMA", "TABLE_NAME"]]
        .drop_duplicates()
        .head(30)
        .to_dict("records")
    )

    # Đưa bảng ưu tiên lên đầu
    priority_keys = {
        (x["TABLE_SCHEMA"], x["TABLE_NAME"]) for x in existing_candidates
    }

    ordered_tables = []
    for item in existing_candidates:
        if item not in ordered_tables:
            ordered_tables.append(item)

    for item in unique_tables:
        if (item["TABLE_SCHEMA"], item["TABLE_NAME"]) not in priority_keys:
            ordered_tables.append(item)

    all_mapping_rows = []

    for item in ordered_tables[:30]:
        schema = item["TABLE_SCHEMA"]
        table = item["TABLE_NAME"]
        print(f"Đang đọc sample: {schema}.{table}")

        try:
            sql_cols = """
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION;
            """
            df_cols = read_sql(conn, sql_cols, [schema, table])
            cols = df_cols["COLUMN_NAME"].tolist()

            ma_cols = [
                c for c in cols
                if "mathan" in c.lower().replace("_", "")
            ]

            if not ma_cols:
                continue

            ma_col = ma_cols[0]

            name_cols = [
                c for c in cols
                if any(
                    key in c.lower()
                    for key in ["ten", "name", "mota", "diengiai", "ghichu", "loai"]
                )
            ]

            selected_cols = [ma_col] + [c for c in name_cols if c != ma_col]
            selected_cols = selected_cols[:12]

            selected_sql = ", ".join(f"[{c}]" for c in selected_cols)

            sql_sample = f"""
            SELECT TOP 1000 {selected_sql}
            FROM [{schema}].[{table}]
            WHERE [{ma_col}] IS NOT NULL
            ORDER BY [{ma_col}];
            """

            df_sample = read_sql(conn, sql_sample)
            sheet_name = f"sample_{table}"[:31]
            results[sheet_name] = df_sample

            for _, row in df_sample.iterrows():
                ma_than = str(row.get(ma_col, "")).strip()
                if not ma_than:
                    continue

                out = {
                    "SourceTable": f"{schema}.{table}",
                    "MaThanColumn": ma_col,
                    "MaThan": ma_than,
                }

                for col in df_sample.columns:
                    if col != ma_col:
                        out[col] = row.get(col, "")

                all_mapping_rows.append(out)

        except Exception as exc:
            results[f"error_{table}"[:31]] = pd.DataFrame(
                [{"TABLE_SCHEMA": schema, "TABLE_NAME": table, "error": str(exc)}]
            )

    df_all = pd.DataFrame(all_mapping_rows)
    results["All_mapping_candidates"] = df_all

    if not df_all.empty:
        df_join = df_cdothan.merge(df_all, how="left", on="MaThan")
        results["Join_CDOTHAN_candidates"] = df_join

        interested = ["11A.1", "6A.1", "6A.14", "5A.1", "5A.14", "5B.1"]
        df_interested = df_join[
            df_join["MaThan"].astype(str).str.upper().isin([x.upper() for x in interested])
        ]
        results["Interested_codes"] = df_interested

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        for sheet_name, df in results.items():
            safe_name = sheet_name[:31]
            df.to_excel(writer, sheet_name=safe_name, index=False)

    conn.close()

    print("Đã xuất file dò map mã than:")
    print(output_file)


if __name__ == "__main__":
    main()