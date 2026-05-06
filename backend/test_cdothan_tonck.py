import pyodbc
import pandas as pd
from pathlib import Path
from datetime import datetime

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


def main():
    print("Đang kết nối database...")
    conn = connect_db()
    print("Kết nối thành công.")

    # 1. Xem kỳ dữ liệu mới nhất trong CDOTHAN
    sql_latest = """
    SELECT TOP 20
        NamHT,
        ThangHT,
        COUNT(*) AS SoDong,
        SUM(TonCK) AS TongTonCK
    FROM CDOTHAN
    GROUP BY NamHT, ThangHT
    ORDER BY NamHT DESC, ThangHT DESC;
    """

    df_latest = pd.read_sql(sql_latest, conn)
    print("\n=== Các kỳ dữ liệu mới nhất trong CDOTHAN ===")
    print(df_latest)

    if df_latest.empty:
        print("Không có dữ liệu trong CDOTHAN.")
        conn.close()
        return

    nam = int(df_latest.iloc[0]["NamHT"])
    thang = int(df_latest.iloc[0]["ThangHT"])

    print(f"\nĐang kiểm tra kỳ mới nhất: NamHT={nam}, ThangHT={thang}")

    # 2. Lấy toàn bộ tồn CK kỳ mới nhất
    sql_data = """
    SELECT
        NamHT,
        ThangHT,
        MaKho,
        MaThan,
        TonDK,
        NhapTK,
        XuatTK,
        TonCK,
        TonCK_TToan
    FROM CDOTHAN
    WHERE NamHT = ? AND ThangHT = ?
    ORDER BY MaKho, MaThan;
    """

    df = pd.read_sql(sql_data, conn, params=[nam, thang])

    # 3. Kiểm tra riêng Kho 9 / Cám 6a.1
    df_check = df[
        (df["MaKho"].astype(str).str.zfill(2) == "09")
        & (df["MaThan"].astype(str).str.lower().str.strip() == "6a.1")
    ]

    print("\n=== Kiểm tra Kho 9 / Cám 6a.1 ===")
    if df_check.empty:
        print("Không tìm thấy dòng MaKho=09, MaThan=6a.1")
    else:
        print(df_check)
        print("\nTổng TonCK:")
        print(df_check["TonCK"].sum())

    # 4. Xuất file để kiểm tra
    output_file = OUTPUT_DIR / f"test_cdothan_tonck_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    with pd.ExcelWriter(output_file, engine="openpyxl") as writer:
        df_latest.to_excel(writer, sheet_name="Ky_du_lieu", index=False)
        df.to_excel(writer, sheet_name="CDOTHAN_latest", index=False)
        df_check.to_excel(writer, sheet_name="Check_Kho9_6a1", index=False)

    conn.close()

    print("\nĐã xuất file kiểm tra:")
    print(output_file)


if __name__ == "__main__":
    main()