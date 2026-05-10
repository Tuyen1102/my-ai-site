import json
import os
import subprocess
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pyodbc
from dotenv import load_dotenv


APP_VERSION = "1.2.0"

# Quy tắc tổng hợp theo cơ chế danh mục DB:
# DMTHAN có nhiều mã than chi tiết theo tàu, ví dụ:
# - Cám 6a.14 (Úc - Tàu ...)
# - Cám 6a.14 (Mozambique - Tàu ...)
# Khi tên than bắt đầu bằng một trong các tên gốc dưới đây, app chỉ cần hiển thị 1 dòng tổng.
# Đây không phải mapping từ Excel, mà là chuẩn hóa theo tên chủng loại trong TTCO_QTHT.dbo.DMTHAN.
COAL_BASE_NAMES_TO_GROUP = [
    "Cám 5a.10",
    "Cám 5a.14",
    "Cám 6a.10",
    "Cám 6a.14",
]


def load_config() -> Dict[str, str]:
    load_dotenv()

    return {
        "DB_SERVER": os.getenv("DB_SERVER", "tuyenthancuaong.com.vn,52376").strip(),
        "DB_NAME": os.getenv("DB_NAME", "TTCO_THONGKE").strip(),
        "DB_DRIVER": os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server").strip(),
        "DB_AUTH": os.getenv("DB_AUTH", "windows").strip().lower(),
        "DB_USER": os.getenv("DB_USER", "").strip(),
        "DB_PASSWORD": os.getenv("DB_PASSWORD", "").strip(),
        "GIT_REPO_DIR": os.getenv("GIT_REPO_DIR", "").strip(),
        "OUTPUT_RELATIVE_PATH": os.getenv("OUTPUT_RELATIVE_PATH", "public/data/ton_kho_latest.json").strip(),
        "GIT_COMMIT_MESSAGE": os.getenv("GIT_COMMIT_MESSAGE", "Update TTCO ton kho latest data").strip(),
        "RUN_GIT_PUSH": os.getenv("RUN_GIT_PUSH", "1").strip(),
    }


def get_repo_dir(config: Dict[str, str]) -> Path:
    if config["GIT_REPO_DIR"]:
        return Path(config["GIT_REPO_DIR"]).expanduser().resolve()

    return Path(__file__).resolve().parent


def normalize_value(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")

    return value


def rows_to_dicts(cursor: pyodbc.Cursor) -> List[Dict[str, Any]]:
    columns = [column[0] for column in cursor.description]
    rows: List[Dict[str, Any]] = []

    for row in cursor.fetchall():
        rows.append({columns[index]: normalize_value(row[index]) for index in range(len(columns))})

    return rows


def build_connection_string(config: Dict[str, str]) -> str:
    if not config["DB_SERVER"]:
        raise RuntimeError("Thiếu DB_SERVER trong file .env")

    if not config["DB_NAME"]:
        raise RuntimeError("Thiếu DB_NAME trong file .env")

    base = (
        f"DRIVER={{{config['DB_DRIVER']}}};"
        f"SERVER={config['DB_SERVER']};"
        f"DATABASE={config['DB_NAME']};"
        "TrustServerCertificate=yes;"
        "Encrypt=no;"
    )

    if config["DB_AUTH"] == "sql":
        if not config["DB_USER"] or not config["DB_PASSWORD"]:
            raise RuntimeError("DB_AUTH=sql nhưng thiếu DB_USER hoặc DB_PASSWORD trong file .env")

        return base + f"UID={config['DB_USER']};PWD={config['DB_PASSWORD']};"

    return base + "Trusted_Connection=yes;"


def get_connection(config: Dict[str, str]) -> pyodbc.Connection:
    return pyodbc.connect(build_connection_string(config), timeout=30)


def get_latest_period(conn: pyodbc.Connection) -> Tuple[int, int]:
    sql = """
    SELECT TOP 1
        NamHT,
        ThangHT
    FROM dbo.CDOTHAN
    WHERE NamHT IS NOT NULL
      AND ThangHT IS NOT NULL
    GROUP BY
        NamHT,
        ThangHT
    ORDER BY
        NamHT DESC,
        ThangHT DESC
    """

    cursor = conn.cursor()
    cursor.execute(sql)
    row = cursor.fetchone()

    if not row:
        raise RuntimeError("Không tìm thấy kỳ dữ liệu trong bảng dbo.CDOTHAN")

    return int(row.NamHT), int(row.ThangHT)


def compact_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def normalize_for_compare(value: Any) -> str:
    return compact_text(value).lower()


def get_group_base_name_from_dmthan_name(ten_than: str) -> str:
    """
    Xác định tên chủng loại hiển thị từ TenThan trong TTCO_QTHT.dbo.DMTHAN.

    Ví dụ:
    - Cám 6a.14 (Úc - Tàu MV ...)  -> Cám 6a.14
    - Cám 6a.14(Mozambique - Tầu...) -> Cám 6a.14
    - Cám 5a.14                     -> Cám 5a.14

    Chỉ gộp 4 nhóm đã xác định; các chủng loại khác giữ nguyên tên DB.
    """

    text = compact_text(ten_than)
    lower_text = normalize_for_compare(text)

    for base_name in COAL_BASE_NAMES_TO_GROUP:
        lower_base = normalize_for_compare(base_name)

        if lower_text == lower_base:
            return base_name

        if lower_text.startswith(lower_base + " "):
            return base_name

        if lower_text.startswith(lower_base + "("):
            return base_name

        if lower_text.startswith(lower_base + "-"):
            return base_name

        if lower_text.startswith(lower_base + "–"):
            return base_name

    return text


def build_group_code(base_name: str) -> str:
    return (
        "GROUP_"
        + base_name.upper()
        .replace(" ", "_")
        .replace(".", "_")
        .replace("Á", "A")
        .replace("À", "A")
        .replace("Ả", "A")
        .replace("Ã", "A")
        .replace("Ạ", "A")
        .replace("Ă", "A")
        .replace("Ắ", "A")
        .replace("Ằ", "A")
        .replace("Ẳ", "A")
        .replace("Ẵ", "A")
        .replace("Ặ", "A")
        .replace("Â", "A")
        .replace("Ấ", "A")
        .replace("Ầ", "A")
        .replace("Ẩ", "A")
        .replace("Ẫ", "A")
        .replace("Ậ", "A")
    )


def fetch_ton_kho_raw_with_dm_names(conn: pyodbc.Connection, nam: int, thang: int) -> List[Dict[str, Any]]:
    """
    Nguồn tồn kho:
    - TTCO_THONGKE.dbo.CDOTHAN

    Danh mục chuẩn:
    - TTCO_QTHT.dbo.DMKHO: MaKho -> TenKho
    - TTCO_QTHT.dbo.DMTHAN: MaThan -> TenThan, MaThanCha

    Join dùng UPPER + LTRIM/RTRIM để không lỗi do khác chữ hoa/thường.
    """

    sql = """
    SELECT
        c.NamHT,
        c.ThangHT,
        LTRIM(RTRIM(c.MaKho)) AS MaKho,
        COALESCE(NULLIF(LTRIM(RTRIM(k.TenKho)), ''), LTRIM(RTRIM(c.MaKho))) AS TenKho,
        LTRIM(RTRIM(c.MaThan)) AS MaThan,
        COALESCE(NULLIF(LTRIM(RTRIM(t.TenThan)), ''), LTRIM(RTRIM(c.MaThan))) AS TenThanDB,
        LTRIM(RTRIM(ISNULL(t.MaThanCha, ''))) AS MaThanCha,
        CAST(SUM(ISNULL(c.TonDK, 0)) AS float) AS TonDauKy,
        CAST(SUM(ISNULL(c.NhapTK, 0)) AS float) AS NhapTrongKy,
        CAST(SUM(ISNULL(c.XuatTK, 0)) AS float) AS XuatTrongKy,
        CAST(SUM(ISNULL(c.TonCK, 0)) AS float) AS TonCuoiKy
    FROM dbo.CDOTHAN c
    LEFT JOIN TTCO_QTHT.dbo.DMKHO k
        ON UPPER(LTRIM(RTRIM(c.MaKho))) = UPPER(LTRIM(RTRIM(k.MaKho)))
    LEFT JOIN TTCO_QTHT.dbo.DMTHAN t
        ON UPPER(LTRIM(RTRIM(c.MaThan))) = UPPER(LTRIM(RTRIM(t.MaThan)))
    WHERE c.NamHT = ?
      AND c.ThangHT = ?
      AND c.MaKho IS NOT NULL
      AND c.MaThan IS NOT NULL
      AND LTRIM(RTRIM(c.MaKho)) <> ''
      AND LTRIM(RTRIM(c.MaThan)) <> ''
    GROUP BY
        c.NamHT,
        c.ThangHT,
        LTRIM(RTRIM(c.MaKho)),
        COALESCE(NULLIF(LTRIM(RTRIM(k.TenKho)), ''), LTRIM(RTRIM(c.MaKho))),
        LTRIM(RTRIM(c.MaThan)),
        COALESCE(NULLIF(LTRIM(RTRIM(t.TenThan)), ''), LTRIM(RTRIM(c.MaThan))),
        LTRIM(RTRIM(ISNULL(t.MaThanCha, '')))
    HAVING
        SUM(ISNULL(c.TonCK, 0)) <> 0
    ORDER BY
        LTRIM(RTRIM(c.MaKho)),
        COALESCE(NULLIF(LTRIM(RTRIM(t.TenThan)), ''), LTRIM(RTRIM(c.MaThan)))
    """

    cursor = conn.cursor()
    cursor.execute(sql, [nam, thang])
    return rows_to_dicts(cursor)


def group_ton_kho_rows(raw_rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[Tuple[str, str], Dict[str, Any]] = {}

    for row in raw_rows:
        ma_kho = compact_text(row.get("MaKho"))
        ten_kho = compact_text(row.get("TenKho"))
        ma_than_goc = compact_text(row.get("MaThan"))
        ten_than_db = compact_text(row.get("TenThanDB"))
        ma_than_cha = compact_text(row.get("MaThanCha"))

        ten_than_hien_thi = get_group_base_name_from_dmthan_name(ten_than_db)
        is_nhom_tong_hop = ten_than_hien_thi != ten_than_db

        if is_nhom_tong_hop:
            ma_than_hien_thi = build_group_code(ten_than_hien_thi)
        else:
            ma_than_hien_thi = ma_than_goc

        key = (ma_kho.upper(), normalize_for_compare(ten_than_hien_thi))

        if key not in grouped:
            grouped[key] = {
                "NamHT": row.get("NamHT"),
                "ThangHT": row.get("ThangHT"),
                "MaKho": ma_kho,
                "TenKho": ten_kho,
                "MaThan": ma_than_hien_thi,
                "TenThan": ten_than_hien_thi,
                "TonDauKy": 0.0,
                "NhapTrongKy": 0.0,
                "XuatTrongKy": 0.0,
                "TonCuoiKy": 0.0,
                "IsNhomTongHop": is_nhom_tong_hop,
                "NhomTongHopLoai": ten_than_hien_thi if is_nhom_tong_hop else "",
                "MaThanCha": ma_than_cha,
                "DanhSachMaThanGoc": [],
                "DanhSachTenThanGoc": [],
                "SoDongGop": 0,
            }

        item = grouped[key]

        item["TonDauKy"] += float(row.get("TonDauKy") or 0)
        item["NhapTrongKy"] += float(row.get("NhapTrongKy") or 0)
        item["XuatTrongKy"] += float(row.get("XuatTrongKy") or 0)
        item["TonCuoiKy"] += float(row.get("TonCuoiKy") or 0)
        item["SoDongGop"] += 1
        item["IsNhomTongHop"] = bool(item["IsNhomTongHop"] or is_nhom_tong_hop)

        if ma_than_goc and ma_than_goc not in item["DanhSachMaThanGoc"]:
            item["DanhSachMaThanGoc"].append(ma_than_goc)

        if ten_than_db and ten_than_db not in item["DanhSachTenThanGoc"]:
            item["DanhSachTenThanGoc"].append(ten_than_db)

        if not item["NhomTongHopLoai"] and item["IsNhomTongHop"]:
            item["NhomTongHopLoai"] = ten_than_hien_thi

    output = list(grouped.values())

    for item in output:
        item["TonDauKy"] = round(float(item["TonDauKy"]), 2)
        item["NhapTrongKy"] = round(float(item["NhapTrongKy"]), 2)
        item["XuatTrongKy"] = round(float(item["XuatTrongKy"]), 2)
        item["TonCuoiKy"] = round(float(item["TonCuoiKy"]), 2)
        item["DanhSachMaThanGoc"] = sorted(item["DanhSachMaThanGoc"])
        item["DanhSachTenThanGoc"] = sorted(item["DanhSachTenThanGoc"])

    output.sort(key=lambda x: (str(x["MaKho"]).upper(), normalize_for_compare(x["TenThan"])))
    return output


def build_lists(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    kho_by_code: Dict[str, Dict[str, str]] = {}
    than_by_key: Dict[str, Dict[str, str]] = {}
    loai_than_by_kho: Dict[str, List[Dict[str, str]]] = {}

    for item in data:
        ma_kho = item["MaKho"]
        ten_kho = item["TenKho"]
        ma_than = item["MaThan"]
        ten_than = item["TenThan"]

        kho_by_code[ma_kho] = {
            "MaKho": ma_kho,
            "TenKho": ten_kho,
            "Label": ten_kho,
        }

        than_by_key[f"{ma_than}::{ten_than}"] = {
            "MaThan": ma_than,
            "TenThan": ten_than,
            "Label": ten_than,
        }

        loai_than_by_kho.setdefault(ma_kho, [])

        exists = any(
            x["MaThan"] == ma_than and x["TenThan"] == ten_than
            for x in loai_than_by_kho[ma_kho]
        )

        if not exists:
            loai_than_by_kho[ma_kho].append({
                "MaThan": ma_than,
                "TenThan": ten_than,
                "Label": ten_than,
            })

    kho_list = sorted(kho_by_code.values(), key=lambda x: str(x["MaKho"]).upper())
    loai_than_list = sorted(than_by_key.values(), key=lambda x: normalize_for_compare(x["TenThan"]))

    for ma_kho in loai_than_by_kho:
        loai_than_by_kho[ma_kho].sort(key=lambda x: normalize_for_compare(x["TenThan"]))

    return {
        "khoList": kho_list,
        "loaiThanList": loai_than_list,
        "loaiThanByKho": loai_than_by_kho,
    }


def build_payload(config: Dict[str, str]) -> Dict[str, Any]:
    with get_connection(config) as conn:
        nam, thang = get_latest_period(conn)
        raw_rows = fetch_ton_kho_raw_with_dm_names(conn, nam, thang)

    grouped_data = group_ton_kho_rows(raw_rows)
    lists = build_lists(grouped_data)
    group_rows = [row for row in grouped_data if row.get("IsNhomTongHop")]

    return {
        "meta": {
            "source": "TTCOAPP",
            "database": config["DB_NAME"],
            "sourceTable": "TTCO_THONGKE.dbo.CDOTHAN",
            "khoDictionary": "TTCO_QTHT.dbo.DMKHO",
            "coalDictionary": "TTCO_QTHT.dbo.DMTHAN",
            "coalGroupMethod": "Group selected coal types by normalized base name from TTCO_QTHT.dbo.DMTHAN.TenThan",
            "version": APP_VERSION,
            "updatedAt": datetime.now().isoformat(sep=" ", timespec="seconds"),
            "NamHT": nam,
            "ThangHT": thang,
            "rawRecordCount": len(raw_rows),
            "recordCount": len(grouped_data),
            "groupedRecordCount": len(group_rows),
            "coalBaseNamesToGroup": COAL_BASE_NAMES_TO_GROUP,
            "note": "Các mã than chi tiết theo tàu của Cám 5a.10, Cám 5a.14, Cám 6a.10, Cám 6a.14 được cộng tổng theo tên chủng loại gốc trong DMTHAN.TenThan.",
        },
        "khoList": lists["khoList"],
        "loaiThanList": lists["loaiThanList"],
        "loaiThanByKho": lists["loaiThanByKho"],
        "data": grouped_data,
    }


def write_json(repo_dir: Path, relative_path: str, payload: Dict[str, Any]) -> Path:
    output_path = repo_dir / relative_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_path = output_path.with_suffix(output_path.suffix + ".tmp")
    temp_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temp_path.replace(output_path)

    return output_path


def run_command(command: List[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess:
    print(">>", " ".join(command))
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        text=True,
        capture_output=True,
        shell=False,
    )

    if completed.stdout:
        print(completed.stdout.strip())

    if completed.stderr:
        print(completed.stderr.strip())

    if check and completed.returncode != 0:
        raise RuntimeError(f"Lệnh bị lỗi: {' '.join(command)}")

    return completed


def is_git_repo(repo_dir: Path) -> bool:
    completed = run_command(["git", "rev-parse", "--is-inside-work-tree"], repo_dir, check=False)
    return completed.returncode == 0 and "true" in completed.stdout.lower()


def git_commit_and_push(repo_dir: Path, relative_path: str, message: str, do_push: bool) -> None:
    if not is_git_repo(repo_dir):
        print("CẢNH BÁO: Thư mục này chưa phải Git repo. Bỏ qua git commit/push.")
        print(f"Repo dir: {repo_dir}")
        return

    run_command(["git", "add", relative_path.replace("\\", "/")], repo_dir)

    diff_result = run_command(["git", "diff", "--cached", "--quiet"], repo_dir, check=False)

    if diff_result.returncode == 0:
        print("Không có thay đổi dữ liệu mới. Bỏ qua commit/push.")
        return

    run_command(["git", "commit", "-m", message], repo_dir)

    if do_push:
        run_command(["git", "push"], repo_dir)
    else:
        print("RUN_GIT_PUSH=0 nên chỉ commit, không push.")


def main() -> int:
    print("=" * 70)
    print("TTCO TON KHO → GITHUB SYNC")
    print("=" * 70)

    config = load_config()
    repo_dir = get_repo_dir(config)

    print("DB_SERVER:", config["DB_SERVER"])
    print("DB_NAME:", config["DB_NAME"])
    print("DB_AUTH:", config["DB_AUTH"])
    print("GIT_REPO_DIR:", repo_dir)
    print("OUTPUT_RELATIVE_PATH:", config["OUTPUT_RELATIVE_PATH"])
    print()

    if not repo_dir.exists():
        raise RuntimeError(f"Không tìm thấy thư mục Git repo: {repo_dir}")

    payload = build_payload(config)
    output_path = write_json(repo_dir, config["OUTPUT_RELATIVE_PATH"], payload)

    print(f"Đã ghi file JSON: {output_path}")
    print(f"Kỳ dữ liệu: {payload['meta']['NamHT']}/{payload['meta']['ThangHT']}")
    print(f"Số dòng tồn kho gốc: {payload['meta']['rawRecordCount']}")
    print(f"Số dòng tồn kho sau xử lý: {payload['meta']['recordCount']}")
    print(f"Số dòng nhóm tổng hợp: {payload['meta']['groupedRecordCount']}")
    print(f"Số kho: {len(payload['khoList'])}")
    print(f"Số loại than: {len(payload['loaiThanList'])}")
    print()

    do_push = config["RUN_GIT_PUSH"] not in {"0", "false", "False", "no", "NO"}
    git_commit_and_push(
        repo_dir=repo_dir,
        relative_path=config["OUTPUT_RELATIVE_PATH"],
        message=config["GIT_COMMIT_MESSAGE"],
        do_push=do_push,
    )

    print()
    print("HOÀN THÀNH ĐỒNG BỘ TỒN KHO LÊN GITHUB")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print()
        print("LỖI:", exc)
        print()
        raise SystemExit(1)
