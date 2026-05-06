import io
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
import pyodbc
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

import gspread
from google.oauth2.service_account import Credentials

# ======================================================
# BACKEND TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO
# - Lấy tồn kho từ TTCO_THONGKE.dbo.CDOTHAN
# - Luôn lấy kỳ mới nhất nếu không truyền năm/tháng
# - Xuất dữ liệu tồn kho lên Google Sheet
# - Phục vụ luôn giao diện React đã build trong thư mục dist
# ======================================================

SERVER = r"tuyenthancuaong.com.vn,52376"
DATABASE = "TTCO_THONGKE"

GOOGLE_SHEET_ID = "17RcfVPQFa8haXEAuHQb7Cwl7Bi8VWJpeh4l_7xG6sX8"
GOOGLE_SHEET_TAB_NAME = "ton_kho"

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
DIST_DIR = PROJECT_DIR / "dist"
INDEX_HTML = DIST_DIR / "index.html"
GOOGLE_CREDENTIAL_FILE = BASE_DIR / "google_service_account.json"

app = FastAPI(title="TTCO Stockpile Backend", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "https://tuyen1102.github.io",
        "https://tuyen1102.github.io/my-ai-site",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


def normalize_code(value) -> str:
    return str(value or "").strip().upper()


def normalize_text(value) -> str:
    return str(value or "").strip()


def map_mathan_to_coal(ma_than: str) -> str:
    """
    Map MaThan trong CDOTHAN sang tên loại than đang dùng trong web app.
    Nếu phát sinh mã mới chưa map, hàm sẽ trả lại mã gốc để dễ phát hiện.
    """

    code = normalize_code(ma_than)

    direct_map = {
        "B11C": "Cục xô 1C",
        "4A.1": "Cục 4a.1",
        "4A.2": "Cục 4a.2",
        "5A.1": "Cục 5a.1",
        "6A.1": "Cám 1",
        "7A.1": "Cám 2a.1",
        "8A.1": "Cám 3a.1",
        "8B.1": "Cám 3b.1",
        "9A.1": "Cám 4a.1",
        "9B.1": "Cám 4b.1",
        "10A.1": "Cám 5a.1",
        "10B.1": "Cám 5b.1",
        "11A.1": "Cám 6a.1",
        "11B.1": "Cám 6b.1",
    }

    if code in direct_map:
        return direct_map[code]

    cam_6a10_codes = {
        "11A.247",
        "11A.248",
        "11A.251",
    }

    if code in cam_6a10_codes:
        return "Cám 6a.10"

    if re.match(r"^10A\.\d+$", code):
        return "Cám 5a.14"

    if re.match(r"^11A\.\d+$", code):
        return "Cám 6a.14"

    if re.match(r"^11\.\d+$", code):
        return "Cám 6a.14"

    return code


def kho_name_from_makho(ma_kho: str) -> str:
    ma = str(ma_kho or "").strip()

    try:
        number = int(ma)
        return f"Kho {number}"
    except Exception:
        return f"Kho {ma}"


def get_latest_period(conn):
    sql = """
    SELECT TOP 1
        NamHT,
        ThangHT
    FROM CDOTHAN
    GROUP BY NamHT, ThangHT
    ORDER BY NamHT DESC, ThangHT DESC;
    """

    df = read_sql(conn, sql)

    if df.empty:
        raise RuntimeError("Không tìm thấy kỳ dữ liệu trong CDOTHAN.")

    return int(df.iloc[0]["NamHT"]), int(df.iloc[0]["ThangHT"])


def get_cdothan_data(nam: Optional[int] = None, thang: Optional[int] = None):
    conn = connect_db()

    try:
        if nam is None or thang is None:
            nam, thang = get_latest_period(conn)

        sql = """
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

        df_raw = read_sql(conn, sql, [nam, thang])

    finally:
        conn.close()

    if df_raw.empty:
        return nam, thang, pd.DataFrame(), pd.DataFrame()

    df_raw["Kho than"] = df_raw["MaKho"].apply(kho_name_from_makho)
    df_raw["Loại than"] = df_raw["MaThan"].apply(map_mathan_to_coal)
    df_raw["Tồn CK"] = pd.to_numeric(df_raw["TonCK"], errors="coerce").fillna(0)

    df_grouped = (
        df_raw.groupby(["Kho than", "Loại than"], as_index=False)
        .agg({"Tồn CK": "sum"})
        .sort_values(["Kho than", "Loại than"])
    )

    return nam, thang, df_raw, df_grouped


def build_google_sheet_rows(nam: int, thang: int, df_raw: pd.DataFrame):
    if df_raw.empty:
        return []

    updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    grouped = (
        df_raw.groupby(["Kho than", "Loại than"], as_index=False)
        .agg(
            {
                "Tồn CK": "sum",
                "MaKho": lambda values: ", ".join(
                    sorted({str(v).strip() for v in values if str(v).strip()})
                ),
                "MaThan": lambda values: ", ".join(
                    sorted({str(v).strip() for v in values if str(v).strip()})
                ),
            }
        )
        .sort_values(["Kho than", "Loại than"])
    )

    rows = []

    for _, row in grouped.iterrows():
        rows.append(
            [
                int(nam),
                int(thang),
                normalize_text(row["MaKho"]),
                normalize_text(row["MaThan"]),
                normalize_text(row["Kho than"]),
                normalize_text(row["Loại than"]),
                round(float(row["Tồn CK"]), 2),
                updated_at,
            ]
        )

    return rows


def get_gspread_client():
    if not GOOGLE_CREDENTIAL_FILE.exists():
        raise FileNotFoundError(
            f"Không tìm thấy file Google credential: {GOOGLE_CREDENTIAL_FILE}"
        )

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]

    credentials = Credentials.from_service_account_file(
        str(GOOGLE_CREDENTIAL_FILE),
        scopes=scopes,
    )

    return gspread.authorize(credentials)


def get_or_create_worksheet(spreadsheet, title: str):
    try:
        return spreadsheet.worksheet(title)
    except gspread.WorksheetNotFound:
        return spreadsheet.add_worksheet(title=title, rows=1000, cols=20)


def export_ttco_to_google_sheet(nam: Optional[int] = None, thang: Optional[int] = None):
    nam, thang, df_raw, df_grouped = get_cdothan_data(nam, thang)

    rows = build_google_sheet_rows(nam, thang, df_raw)

    client = get_gspread_client()
    spreadsheet = client.open_by_key(GOOGLE_SHEET_ID)
    worksheet = get_or_create_worksheet(spreadsheet, GOOGLE_SHEET_TAB_NAME)

    headers = [
        "NamHT",
        "ThangHT",
        "MaKho",
        "MaThan",
        "Kho than",
        "Loại than",
        "Tồn CK",
        "UpdatedAt",
    ]

    worksheet.clear()

    all_values = [headers] + rows

    if all_values:
        worksheet.update(
            values=all_values,
            range_name="A1",
        )

    worksheet.freeze(rows=1)

    return {
        "nam": nam,
        "thang": thang,
        "count": len(rows),
        "sheetId": GOOGLE_SHEET_ID,
        "sheetName": GOOGLE_SHEET_TAB_NAME,
        "updatedAt": datetime.now().isoformat(timespec="seconds"),
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "server": SERVER,
        "database": DATABASE,
        "googleCredentialExists": GOOGLE_CREDENTIAL_FILE.exists(),
        "googleSheetId": GOOGLE_SHEET_ID,
        "googleSheetTabName": GOOGLE_SHEET_TAB_NAME,
        "distExists": DIST_DIR.exists(),
        "indexExists": INDEX_HTML.exists(),
        "time": datetime.now().isoformat(timespec="seconds"),
    }


@app.get("/api/ttco-g3-bc05-json")
def get_g3_bc05_json(
    nam: Optional[int] = Query(default=None),
    thang: Optional[int] = Query(default=None),
):
    try:
        nam, thang, df_raw, df_grouped = get_cdothan_data(nam, thang)

        rows = []
        for _, row in df_grouped.iterrows():
            rows.append(
                {
                    "kho": normalize_text(row["Kho than"]),
                    "coal": normalize_text(row["Loại than"]),
                    "ton": round(float(row["Tồn CK"]), 2),
                }
            )

        raw_rows = []
        for _, row in df_raw.iterrows():
            raw_rows.append(
                {
                    "nam": int(row["NamHT"]),
                    "thang": int(row["ThangHT"]),
                    "maKho": normalize_text(row["MaKho"]),
                    "maThan": normalize_text(row["MaThan"]),
                    "kho": normalize_text(row["Kho than"]),
                    "coal": normalize_text(row["Loại than"]),
                    "ton": round(float(row["Tồn CK"]), 2),
                }
            )

        return {
            "ok": True,
            "nam": nam,
            "thang": thang,
            "count": len(rows),
            "rawCount": len(raw_rows),
            "rows": rows,
            "rawRows": raw_rows,
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": str(exc),
            },
        )


@app.get("/api/export-ttco-to-google-sheet")
def api_export_ttco_to_google_sheet(
    nam: Optional[int] = Query(default=None),
    thang: Optional[int] = Query(default=None),
):
    try:
        result = export_ttco_to_google_sheet(nam, thang)

        return {
            "ok": True,
            "message": "Đã xuất dữ liệu tồn kho TTCO_APP lên Google Sheet.",
            **result,
        }

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": str(exc),
            },
        )


@app.get("/api/ttco-g3-bc05.xlsx")
def download_g3_bc05_excel(
    nam: Optional[int] = Query(default=None),
    thang: Optional[int] = Query(default=None),
):
    try:
        nam, thang, df_raw, df_grouped = get_cdothan_data(nam, thang)

        output = io.BytesIO()

        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            export_df = df_grouped.copy()
            export_df.insert(0, "TT", range(1, len(export_df) + 1))
            export_df.to_excel(writer, sheet_name="G3_BC05", index=False)

            if not df_raw.empty:
                raw_df = df_raw[
                    [
                        "NamHT",
                        "ThangHT",
                        "MaKho",
                        "MaThan",
                        "Kho than",
                        "Loại than",
                        "Tồn CK",
                    ]
                ].copy()
            else:
                raw_df = pd.DataFrame(
                    columns=[
                        "NamHT",
                        "ThangHT",
                        "MaKho",
                        "MaThan",
                        "Kho than",
                        "Loại than",
                        "Tồn CK",
                    ]
                )

            raw_df.to_excel(writer, sheet_name="CDOTHAN_raw", index=False)

            wb = writer.book

            for ws in wb.worksheets:
                ws.freeze_panes = "A2"

                for cell in ws[1]:
                    cell.font = cell.font.copy(bold=True)

                for column_cells in ws.columns:
                    max_length = 0
                    column_letter = column_cells[0].column_letter

                    for cell in column_cells:
                        value = cell.value
                        if value is not None:
                            max_length = max(max_length, len(str(value)))

                    ws.column_dimensions[column_letter].width = min(max_length + 2, 35)

                for row in ws.iter_rows():
                    for cell in row:
                        if isinstance(cell.value, (int, float)):
                            cell.number_format = "#,##0.00"

        output.seek(0)

        file_name = f"G3_BC05_TTCO_DB_{nam}_{str(thang).zfill(2)}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{file_name}"'
            },
        )

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": str(exc),
            },
        )


if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/")
def serve_index():
    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))

    return JSONResponse(
        status_code=404,
        content={
            "ok": False,
            "error": "Chưa có thư mục dist. Hãy chạy npm run build trước.",
            "expected_index": str(INDEX_HTML),
        },
    )


@app.get("/{full_path:path}")
def serve_react_app(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse(
            status_code=404,
            content={"ok": False, "error": "API không tồn tại."},
        )

    requested_file = DIST_DIR / full_path

    if requested_file.exists() and requested_file.is_file():
        return FileResponse(str(requested_file))

    if INDEX_HTML.exists():
        return FileResponse(str(INDEX_HTML))

    return JSONResponse(
        status_code=404,
        content={
            "ok": False,
            "error": "Chưa có giao diện web đã build. Hãy chạy npm run build.",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
    )