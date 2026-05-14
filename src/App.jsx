// TTCO_APP_PERIOD_V18: app đọc public/data/ton_kho_latest.json; ton/ttcoApp = TonDK tháng hiện tại + SUM(NhapTK) - SUM(XuatTK).

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Upload,
  RefreshCw,
  Database,
  Ruler,
  Layers,
  History,
  Save,
  Download,
  FileSpreadsheet,
  Server,
  ListChecks,
  CloudUpload,
  Sheet,
} from "lucide-react";
import * as XLSX from "xlsx";

// ======================================================
// TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO
// Fix v1.3.6: Sắp xếp tên kho theo thứ tự tự nhiên: Kho 1, Kho 2, Kho 3...; kho ngoài chuẩn đưa xuống cuối.
// Fix v1.3.4: Danh sách chủng loại và khối lượng TTCO_APP lấy theo JSON; kích thước/tỷ khối vẫn lấy từ Excel.
// Fix v1.3.3: TTCO JSON chỉ cập nhật tồn kho, không ghi đè danh mục Excel; tự tải JSON sau khi Excel sẵn sàng.
// Fix v1.3.9: Nút Mặc định chỉ tải lại Excel public/data; nếu lỗi thì giữ dữ liệu hiện tại, không quay về hard-code.
// Fix v1.4.1: Bổ sung tên kho chuẩn TTCO_APP: Kho 1-T4, Kho 2-T4, Kho 3-T4, Kho 4-T4, Kho 28-1, Kho 32, Kho 33, Kho 37, Kho 40...; map mã phụ từ JSON về tên kho báo cáo.
// Fix v1.3.7: chuẩn hóa Kho 1/KHO01/01 cùng về mã 01 để tham số Excel khớp TTCO JSON
// Fix v1.2.3: Ép thứ tự hiển thị tuyến tính trên điện thoại: 1 -> 2 -> 3 -> 4; tối ưu giao diện dashboard gọn, chuyên nghiệp.
// Fix v1.2.1: Không tách tên chủng loại theo dấu phẩy trong AK, ví dụ Ak 35,01 - 40%.
// Bản này hỗ trợ:
// - Máy tính/local: lấy trực tiếp TTCO_APP và đồng bộ JSON lên GitHub
// - Điện thoại/GitHub Pages: tự tải tồn kho từ file JSON trên GitHub
// ======================================================

const GOOGLE_SHEET_ID = "17RcfVPQFa8haXEAuHQb7Cwl7Bi8VWJpeh4l_7xG6sX8";
const GOOGLE_SHEET_TAB = "ton_kho";
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
  GOOGLE_SHEET_TAB
)}`;

const BACKEND_BASE_URL = "http://127.0.0.1:8000";
const BACKEND_JSON_URL = `${BACKEND_BASE_URL}/api/ttco-g3-bc05-json`;
const BACKEND_EXPORT_GOOGLE_SHEET_URL = `${BACKEND_BASE_URL}/api/export-ttco-to-google-sheet`;

const HISTORY_KEY = "ttco_stockpile_history";
const DEFAULT_CATALOG_FILE = `${import.meta.env.BASE_URL}data/DS_kho_than_va_ty_khoi.xlsx`;
const GITHUB_TON_KHO_JSON_URL = "https://tuyen1102.github.io/my-ai-site/data/ton_kho_latest.json";

const DEFAULT_KHO_ROWS = [
  { ma_kho: "KHO01", ten_kho: "Kho 1", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 48.3, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO02", ten_kho: "Kho 2", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 78, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO03", ten_kho: "Kho 3", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 74, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO04", ten_kho: "Kho 4", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 84, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO05", ten_kho: "Kho 5", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 75.5, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO06", ten_kho: "Kho 6", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 48, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO07", ten_kho: "Kho 7", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 147.9, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO08", ten_kho: "Kho 8", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 182, chieu_rong_m: 36.5, chung_loai: "" },
  { ma_kho: "KHO09", ten_kho: "Kho 9", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 167.7, chieu_rong_m: 40.9, chung_loai: "Cám 6a.1" },
  { ma_kho: "KHO09", ten_kho: "Kho 9", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 40.7, chieu_rong_m: 40.9, chung_loai: "Cám 6a.14" },
  { ma_kho: "KHO10", ten_kho: "Kho 10", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 46.3, chieu_rong_m: 40.9, chung_loai: "Cám 5a.14" },
  { ma_kho: "KHO10", ten_kho: "Kho 10", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 131.84, chieu_rong_m: 40.9, chung_loai: "Cám 5a.1" },
  { ma_kho: "KHO11", ten_kho: "Kho 11", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 145.1, chieu_rong_m: 40.9, chung_loai: "" },
  { ma_kho: "KHO12", ten_kho: "Kho 12", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 93.4, chieu_rong_m: 40.9, chung_loai: "" },
  { ma_kho: "KHO13", ten_kho: "Kho 13", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 69.2, chieu_rong_m: 40.9, chung_loai: "" },
  { ma_kho: "KHO14", ten_kho: "Kho 14", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 0, chieu_rong_m: 40.9, chung_loai: "" },
  { ma_kho: "KHO15", ten_kho: "Kho 15", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 198.5, chieu_rong_m: 40.9, chung_loai: "" },
  { ma_kho: "KHO16", ten_kho: "Kho 16", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 108, chieu_rong_m: 41, chung_loai: "" },
  { ma_kho: "KHO17", ten_kho: "Kho 17", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 104, chieu_rong_m: 41, chung_loai: "Cám 2" },
  { ma_kho: "KHO17", ten_kho: "Kho 17", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 205.6, chieu_rong_m: 41, chung_loai: "Cám 1" },
  { ma_kho: "KHO18", ten_kho: "Kho 18", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 63.7, chieu_rong_m: 41, chung_loai: "" },
  { ma_kho: "KHO19", ten_kho: "Kho 19", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 39, chieu_rong_m: 41, chung_loai: "" },
  { ma_kho: "KHO20", ten_kho: "Kho 20", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 233, chieu_rong_m: 41, chung_loai: "" },
  { ma_kho: "KHO21", ten_kho: "Kho 21", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 55, chieu_rong_m: 41, chung_loai: "Cám 5a.1" },
  { ma_kho: "KHO21", ten_kho: "Kho 21", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 56, chieu_rong_m: 41, chung_loai: "Cám 6a.1" },
  { ma_kho: "KHO21", ten_kho: "Kho 21", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 56, chieu_rong_m: 41, chung_loai: "Cám 5b.1" },
  { ma_kho: "KHO22", ten_kho: "Kho 22", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 60, chieu_rong_m: 41, chung_loai: "" },
  { ma_kho: "KHO23", ten_kho: "Kho 23", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 116, chieu_rong_m: 35.2, chung_loai: "" },
  { ma_kho: "KHO24", ten_kho: "Kho 24", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 144, chieu_rong_m: 35.2, chung_loai: "" },
  { ma_kho: "KHO25", ten_kho: "Kho 25", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 122, chieu_rong_m: 35.2, chung_loai: "" },
  { ma_kho: "KHO29", ten_kho: "Kho 29", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 127.7, chieu_rong_m: 31.8, chung_loai: "" },
  { ma_kho: "KHO30", ten_kho: "Kho 30", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 143, chieu_rong_m: 31.8, chung_loai: "" },
  { ma_kho: "KHO31", ten_kho: "Kho 31", don_vi_quan_ly: "PX Tuyển than 2", chieu_dai_m: 190, chieu_rong_m: 35.8, chung_loai: "Nguyên khai / Cám đá" },
  { ma_kho: "KHO39", ten_kho: "Kho 39", don_vi_quan_ly: "PX Kho Bến", chieu_dai_m: 214, chieu_rong_m: 32.05, chung_loai: "" },
];

const DEFAULT_TY_KHOI_ROWS = [
  { chung_loai: "Cám đá", ty_khoi_tan_m3: 1.3766666667 },
  { chung_loai: "Bùn 3A", ty_khoi_tan_m3: 1.2583689423 },
  { chung_loai: "Bùn 3B", ty_khoi_tan_m3: 0.97825 },
  { chung_loai: "Cám 1", ty_khoi_tan_m3: 0.9084025137 },
  { chung_loai: "Cám 2a.1", ty_khoi_tan_m3: 0.9202704918 },
  { chung_loai: "Cám 3a.1", ty_khoi_tan_m3: 0.9394598907 },
  { chung_loai: "Cám 3b.1", ty_khoi_tan_m3: 0.9769903825 },
  { chung_loai: "Cám 4a.1", ty_khoi_tan_m3: 1.0131672131 },
  { chung_loai: "Cám 5a.1", ty_khoi_tan_m3: 1.104544153 },
  { chung_loai: "Cám 5a.14", ty_khoi_tan_m3: 1.0953590164 },
  { chung_loai: "Cám 5b.1", ty_khoi_tan_m3: 1.104544153 },
  { chung_loai: "Cám 6a.1", ty_khoi_tan_m3: 1.1842624044 },
  { chung_loai: "Cám 6a.1(sấy)", ty_khoi_tan_m3: 1.1512852459 },
  { chung_loai: "Cám 6a.10", ty_khoi_tan_m3: 1.1783234973 },
  { chung_loai: "Cám 6a.14", ty_khoi_tan_m3: 1.1783234973 },
  { chung_loai: "Cám 6b.1", ty_khoi_tan_m3: 1.206992459 },
  { chung_loai: "Cục 4a.1", ty_khoi_tan_m3: 0.8511712042 },
  { chung_loai: "Cục 4a.2", ty_khoi_tan_m3: 0.8711329843 },
  { chung_loai: "Cục 5a.1", ty_khoi_tan_m3: 0.8777629319 },
  { chung_loai: "Cục don 8C", ty_khoi_tan_m3: 1.2562172632 },
  { chung_loai: "Cục xô 1C", ty_khoi_tan_m3: 0.9325281675 },
  { chung_loai: "Nguyên khai", ty_khoi_tan_m3: 1.22525 },
  { chung_loai: "Đá thải", ty_khoi_tan_m3: 1.592 },
];

const normalizeText = (value) => String(value ?? "").trim();

const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const normalizeCoalBase = (value) => {
  const text = normalizeKey(value)
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const beforeParentheses = text.split("(")[0].trim();
  if (text.includes("sấy")) {
    return `${beforeParentheses} (sấy)`;
  }
  return beforeParentheses;
};

const normalizeCoalFull = (value) => normalizeKey(value)
  .replace(/\s*\(\s*/g, " (")
  .replace(/\s*\)\s*/g, ")")
  .replace(/\s+/g, " ")
  .trim();

const isDetailedCoalName = (value) => {
  const text = normalizeCoalFull(value);
  return text.includes("(") || /^nhk\./i.test(text);
};

const coalMatches = (selectedCoal, ttcoCoal) => {
  const fullA = normalizeCoalFull(selectedCoal);
  const fullB = normalizeCoalFull(ttcoCoal);
  if (!fullA || !fullB) return false;

  if (fullA === fullB) return true;
  if (isDetailedCoalName(fullA) || isDetailedCoalName(fullB)) return false;

  const a = normalizeCoalBase(selectedCoal);
  const b = normalizeCoalBase(ttcoCoal);
  if (!a || !b) return false;
  return a === b;
};

const splitCoalNames = (value) =>
  normalizeText(value)
    .split(/\s*\/\s*|\s*;\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

const toNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return 0;

  let normalized = text;

  if (text.includes(".") && text.includes(",")) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    normalized = text.replace(",", ".");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const getTtcoKhoSourcePriority = (record) => {
  const sourceFix = normalizeText(record?.sourceFix || record?.SourceFix).toUpperCase();
  if (sourceFix.includes("KHO39")) return 2000;
  const raw = normalizeKhoCode(record?.rawKhoCode || record?.sourceKhoCode || record?.maKho || record?.khoCodeRaw || record?.khoCode || record?.kho || "");
  // STRICT_V13: 46B không tự ưu tiên/map vào Kho 39; chỉ JSON chuẩn quyết định dữ liệu hiển thị.
  if (raw === "39") return 10;
  return 100;
};

const isTtcoDisplayStockRecord = (record) => {
  if (!record) return false;
  if (!normalizeText(record.khoCode || record.kho)) return false;
  if (!normalizeText(record.coal)) return false;
  const mass = toNumber(record.ton);
  if (Math.abs(mass) < 0.000001) return false;
  if (!isRecordKhoNameConsistent(record)) return false;

  const coalName = normalizeText(record.coal);
  const coalCode = normalizeText(record.coalCode || record.MaThan || record.ma_than);
  const isImportCoalLine =
    /^nhk\./i.test(coalCode) ||
    /\(.+\)/.test(coalName) ||
    normalizeText(record.sourceFix || record.SourceFix).toUpperCase().includes("KHO39");

  if (isGenericTtcoCoalGroupName(coalName) && !looksLikeSpecificCoalProductName(coalName) && !isImportCoalLine) {
    return false;
  }
  return true;
}; const toMaybeNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const n = toNumber(value);
  return Number.isFinite(n) ? n : null;
};

const formatNumber = (value, digits = 2) => {
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const getDiffClassName = (diff) => {
  const abs = Math.abs(diff);
  if (abs < 2000) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (abs < 5000) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (abs < 10000) return "bg-orange-50 text-orange-800 border-orange-200";
  return "bg-red-50 text-red-800 border-red-200";
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);

  return rows;
}

function parseGoogleSheetCSV(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    throw new Error("Google Sheet chưa có dữ liệu hoặc không đọc được CSV.");
  }

  const headers = rows[0].map((h) => normalizeKey(h));
  const indexOf = (names) => {
    for (const name of names) {
      const index = headers.findIndex((h) => h === normalizeKey(name));
      if (index >= 0) return index;
    }
    return -1;
  };

  const iKho = indexOf(["Kho than", "Kho", "Tên kho"]);
  const iCoal = indexOf(["Loại than", "Chủng loại", "Tên than"]);
  const iTon = indexOf(["Tồn CK", "Ton CK", "Tồn cuối kỳ", "Tồn kho"]);
  const iNam = indexOf(["NamHT", "Năm"]);
  const iThang = indexOf(["ThangHT", "Tháng"]);
  const iUpdatedAt = indexOf(["UpdatedAt", "Cập nhật"]);

  if (iKho < 0 || iCoal < 0 || iTon < 0) {
    throw new Error("Google Sheet cần có cột: Kho than, Loại than, Tồn CK.");
  }

  const records = rows
    .slice(1)
    .map((row) => ({
      kho: normalizeText(row[iKho]),
      coal: normalizeText(row[iCoal]),
      ton: toNumber(row[iTon]),
      nam: iNam >= 0 ? normalizeText(row[iNam]) : "",
      thang: iThang >= 0 ? normalizeText(row[iThang]) : "",
      updatedAt: iUpdatedAt >= 0 ? normalizeText(row[iUpdatedAt]) : "",
      sheetName: "Google Sheet ton_kho",
      rowNumber: "",
    }))
    .filter((item) => item.kho && item.coal);

  if (records.length === 0) {
    throw new Error("Không tìm thấy dòng tồn kho hợp lệ trong Google Sheet.");
  }

  return records;
}


function normalizeKhoCode(value) {
  const text = normalizeText(value);
  if (!text) return "";

  // Chuẩn hóa đồng nhất các dạng:
  // "01", "1", "Kho 1", "KHO01"        -> "01"
  // "Kho 1-T4", "1-T4", "01T4"         -> "01-T4"
  // "Kho 28-1", "28-1"                 -> "28-1"
  // "Kho 31B", "31B"                   -> "31B"
  const khoT4Match = text.match(/^kho\s*0*(\d+)\s*[-–]?\s*t\s*0*(\d+)$/i);
  if (khoT4Match) {
    return `${khoT4Match[1].padStart(2, "0")}-T${Number(khoT4Match[2])}`;
  }

  const bareT4Match = text.match(/^0*(\d+)\s*[-–]?\s*t\s*0*(\d+)$/i);
  if (bareT4Match) {
    return `${bareT4Match[1].padStart(2, "0")}-T${Number(bareT4Match[2])}`;
  }

  const khoSubMatch = text.match(/^kho\s*0*(\d+)\s*[-–]\s*0*(\d+)$/i);
  if (khoSubMatch) {
    return `${khoSubMatch[1].padStart(2, "0")}-${Number(khoSubMatch[2])}`;
  }

  const bareSubMatch = text.match(/^0*(\d+)\s*[-–]\s*0*(\d+)$/i);
  if (bareSubMatch) {
    return `${bareSubMatch[1].padStart(2, "0")}-${Number(bareSubMatch[2])}`;
  }

  const khoMatch = text.match(/^kho\s*0*(\d+)([a-zA-Z]*)$/i);
  if (khoMatch) {
    const numberPart = khoMatch[1].padStart(2, "0");
    const suffix = normalizeText(khoMatch[2]).toUpperCase();
    return `${numberPart}${suffix}`;
  }

  const withoutPrefix = text.replace(/^KHO\s*/i, "").trim();
  const codeMatch = withoutPrefix.match(/^0*(\d+)([a-zA-Z]*)$/);
  if (codeMatch) {
    const numberPart = codeMatch[1].padStart(2, "0");
    const suffix = normalizeText(codeMatch[2]).toUpperCase();
    return `${numberPart}${suffix}`;
  }

  return withoutPrefix.toUpperCase();
}

// Map các mã kho phụ trong DB/JSON về tên kho đúng như báo cáo TTCO_APP G3_BC05.
// Ví dụ: 71 -> Kho 1-T4, 31D -> Kho 28-1, 44 -> Kho 32.
const TTCO_KHO_CODE_OVERRIDES = {
  "30B": { code: "27", number: 27, suffix: "", name: "Kho 27" },
  "31C": { code: "28", number: 28, suffix: "", name: "Kho 28" },
  "31D": { code: "28-1", number: 28, suffix: "1", name: "Kho 28-1" },
  "31B": { code: "32", number: 32, suffix: "", name: "Kho 32" },
  "34A": { code: "34", number: 34, suffix: "", name: "Kho 34" },

  "43": { code: "31", number: 31, suffix: "", name: "Kho 31" },
  "44": { code: "32", number: 32, suffix: "", name: "Kho 32" },
  "45": { code: "33", number: 33, suffix: "", name: "Kho 33" },
  "36": { code: "37", number: 37, suffix: "", name: "Kho 37" },
  "46A": { code: "38", number: 38, suffix: "", name: "Kho 38" },
  "60": { code: "40", number: 40, suffix: "", name: "Kho 40" },

  "71": { code: "01-T4", number: 1, suffix: "T4", name: "Kho 1-T4" },
  "72": { code: "02-T4", number: 2, suffix: "T4", name: "Kho 2-T4" },
  "73": { code: "03-T4", number: 3, suffix: "T4", name: "Kho 3-T4" },
  "74": { code: "04-T4", number: 4, suffix: "T4", name: "Kho 4-T4" },
};

function getStandardKhoInfo(value) {
  const original = normalizeText(value);
  if (!original) return null;

  // Loại các kho kỹ thuật/ngoài báo cáo tồn kho chuẩn như K04, K60, k59.
  // Các mã 71-74 được giữ lại qua bảng override vì tương ứng Kho 1-T4...Kho 4-T4.
  if (/^k(?!ho)/i.test(original)) {
    return null;
  }

  const normalized = normalizeKhoCode(original);
  const override = TTCO_KHO_CODE_OVERRIDES[normalized.toUpperCase()];
  if (override) {
    return override;
  }

  const t4Match = normalized.match(/^(\d{2})-T(\d+)$/i);
  if (t4Match) {
    const number = Number(t4Match[1]);
    const tNumber = Number(t4Match[2]);
    if (Number.isFinite(number) && number >= 1 && number <= 40) {
      return {
        code: `${String(number).padStart(2, "0")}-T${tNumber}`,
        number,
        suffix: `T${tNumber}`,
        name: `Kho ${number}-T${tNumber}`,
      };
    }
  }

  const subMatch = normalized.match(/^(\d{2})-(\d+)$/i);
  if (subMatch) {
    const number = Number(subMatch[1]);
    const subNumber = Number(subMatch[2]);
    if (Number.isFinite(number) && number >= 1 && number <= 40) {
      return {
        code: `${String(number).padStart(2, "0")}-${subNumber}`,
        number,
        suffix: String(subNumber),
        name: `Kho ${number}-${subNumber}`,
      };
    }
  }

  const match = normalized.match(/^(\d{1,3})([A-Z]*)$/i);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isFinite(number) || number < 1 || number > 40) {
    return null;
  }

  const suffix = normalizeText(match[2]).toUpperCase();
  return {
    code: suffix ? `${String(number).padStart(2, "0")}${suffix}` : String(number).padStart(2, "0"),
    number,
    suffix,
    name: suffix ? `Kho ${number}${suffix}` : `Kho ${number}`,
  };
}

function getKhoCompareCode(value) {
  const standard = getStandardKhoInfo(value);
  return standard?.code || normalizeKhoCode(value);
}

function displayKhoName(maKho) {
  const standard = getStandardKhoInfo(maKho);
  if (standard) return standard.name;

  const code = normalizeKhoCode(maKho);
  return code ? `Kho ${Number.isFinite(Number(code)) ? Number(code) : code}` : "";
}



const getWarehouseSortInfo = (warehouse) => {
  const name = normalizeText(warehouse?.name || warehouse?.label || warehouse?.id || "");
  const code = normalizeText(warehouse?.id || warehouse?.code || "");

  const t4Match = name.match(/^Kho\s*(\d+)\s*-\s*T4$/i) || code.match(/^T4[-_]?(\d+)$/i);
  if (t4Match) {
    return {
      group: 2,
      number: Number(t4Match[1]),
      suffix: "T4",
      text: name,
    };
  }

  const normalMatch =
    name.match(/^Kho\s*(\d+)(?:\s*-\s*(\d+))?$/i) ||
    code.match(/^(\d+)(?:[-_](\d+))?$/i);

  if (normalMatch) {
    return {
      group: 1,
      number: Number(normalMatch[1]),
      suffix: normalMatch[2] ? Number(normalMatch[2]) : 0,
      text: name,
    };
  }

  return {
    group: 9,
    number: 9999,
    suffix: 9999,
    text: name,
  };
};

const compareWarehousesNatural = (a, b) => {
  const sa = getWarehouseSortInfo(a);
  const sb = getWarehouseSortInfo(b);

  if (sa.group !== sb.group) return sa.group - sb.group;
  if (sa.number !== sb.number) return sa.number - sb.number;

  const suffixA = typeof sa.suffix === "number" ? sa.suffix : 9999;
  const suffixB = typeof sb.suffix === "number" ? sb.suffix : 9999;
  if (suffixA !== suffixB) return suffixA - suffixB;

  return sa.text.localeCompare(sb.text, "vi", {
    numeric: true,
    sensitivity: "base",
  });
};

function parseTTCOGitHubJson(payload, currentKhoRows) {
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  if (rows.length === 0) {
    throw new Error("File GitHub JSON chưa có dữ liệu tồn kho.");
  }

  const dimensionByKhoCode = new Map();

  for (const row of currentKhoRows || []) {
    const code = normalizeKhoCode(row.ma_kho);
    if (!code || dimensionByKhoCode.has(code)) continue;
    dimensionByKhoCode.set(code, row);
  }

  const tenKhoByCode = new Map();

  if (Array.isArray(payload?.khoList)) {
    for (const item of payload.khoList) {
      const sourceCode =
        typeof item === "string"
          ? item
          : item?.MaKho ?? item?.ma_kho ?? item?.code ?? item?.TenKho ?? item?.ten_kho;
      const standard = getStandardKhoInfo(sourceCode);
      if (standard) {
        tenKhoByCode.set(standard.code, standard.name);
      }
    }
  }

  const rawRecords = rows
    .map((item) => {
      const rawKhoName = item.TenKho ?? item.ten_kho ?? item.kho ?? item.Kho ?? "";
      const rawKhoCode = item.MaKho ?? item.ma_kho ?? item.khoCode ?? item.code ?? "";
      // Ưu tiên TenKho/kho đã xuất ra từ nguồn TTCO_APP/JSON. MaKho chỉ dùng làm dự phòng.
      // Việc ưu tiên MaKho trước có thể làm các kho 26-30 bị map nhầm chủng loại/tồn kho.
      const standardKho = getStandardKhoInfo(rawKhoName) || getStandardKhoInfo(rawKhoCode);
      if (!standardKho) return null;
      const maKho = standardKho.code;
      const tenKho = standardKho.name;
      const maThan = normalizeText(item.MaThan ?? item.ma_than ?? item.coalCode);
      const tenThan =
        normalizeText(item.TenThan ?? item.ten_than ?? item.coal ?? item.LoaiThan) || maThan;
      const ton = toNumber(item.TonCuoiKy ?? item.TonCK ?? item.ton ?? item.ton_cuoi_ky);

      return {
        kho: tenKho,
        khoCode: maKho,
        coal: tenThan,
        coalCode: maThan,
        ton,
        nam: normalizeText(item.NamHT ?? payload?.meta?.NamHT),
        thang: normalizeText(item.ThangHT ?? payload?.meta?.ThangHT),
        updatedAt: normalizeText(payload?.meta?.updatedAt),
        sheetName: "GitHub JSON CDOTHAN",
        rowNumber: "", rawKhoCode: normalizeKhoCode(rawKhoCode), rawKhoName: normalizeText(rawKhoName), isNhomTongHop: Boolean(item.IsNhomTongHop),
        nhomTongHopLoai: normalizeText(item.NhomTongHopLoai),
        danhSachMaThanGoc: Array.isArray(item.DanhSachMaThanGoc)
          ? item.DanhSachMaThanGoc
          : [],
        danhSachTenThanGoc: Array.isArray(item.DanhSachTenThanGoc)
          ? item.DanhSachTenThanGoc
          : [],
      };
    })
    .filter((item) => item?.khoCode && item.coal && isTtcoDisplayStockRecord(item));

  const recordMap = new Map();

  for (const record of rawRecords) {
    const key = `${record.khoCode}__${normalizeKey(record.coal)}`;
    const oldRecord = recordMap.get(key);

    if (!oldRecord) {
      recordMap.set(key, { ...record });
      continue;
    }

    recordMap.set(key, {
      ...oldRecord,
      ton: toNumber(oldRecord.ton) + toNumber(record.ton),
      danhSachMaThanGoc: Array.from(
        new Set([...(oldRecord.danhSachMaThanGoc || []), ...(record.danhSachMaThanGoc || [])])
      ),
      danhSachTenThanGoc: Array.from(
        new Set([...(oldRecord.danhSachTenThanGoc || []), ...(record.danhSachTenThanGoc || [])])
      ),
    });
  }

  const records = Array.from(recordMap.values());

  if (records.length === 0) {
    throw new Error("Không tìm thấy dòng tồn kho hợp lệ trong GitHub JSON.");
  }

  const khoCoalMap = new Map();
  const khoNameMap = new Map();

  for (const record of records) {
    if (!khoCoalMap.has(record.khoCode)) {
      khoCoalMap.set(record.khoCode, new Set());
    }

    khoCoalMap.get(record.khoCode).add(record.coal);
    khoNameMap.set(record.khoCode, record.kho);
  }

  const khoRows = [];

  for (const [maKho, coalSet] of khoCoalMap.entries()) {
    const dimension = dimensionByKhoCode.get(maKho) || {};
    const coalNames = Array.from(coalSet).sort((a, b) => a.localeCompare(b, "vi"));

    for (const coalName of coalNames) {
      khoRows.push({
        ma_kho: maKho,
        ten_kho: khoNameMap.get(maKho) || displayKhoName(maKho),
        don_vi_quan_ly: normalizeText(dimension.don_vi_quan_ly) || "TTCO_APP",
        chieu_dai_m: dimension.chieu_dai_m || 0,
        chieu_rong_m: dimension.chieu_rong_m || 0,
        chung_loai: coalName,
      });
    }
  }

  return { records, khoRows };
}

const findCatalogCoalType = (coalMap, coalName) => {
  const exact = coalMap.get(normalizeKey(coalName));
  if (exact) return exact;

  for (const item of coalMap.values()) {
    if (coalMatches(coalName, item.name)) return item;
  }

  return null;
};

const buildDataModel = (khoRows, tyKhoiRows) => {
  const coalMap = new Map();

  for (const row of tyKhoiRows) {
    const name = normalizeText(row.chung_loai);
    if (!name) continue;

    coalMap.set(normalizeKey(name), {
      name,
      density: toNumber(row.ty_khoi_tan_m3),
    });
  }

  const warehouseMap = new Map();

  for (const row of khoRows) {
    const id = normalizeText(row.ma_kho);
    const name = normalizeText(row.ten_kho);
    if (!id || !name) continue;

    if (!warehouseMap.has(id)) {
      warehouseMap.set(id, {
        id,
        name,
        unit: normalizeText(row.don_vi_quan_ly),
        maxLength: 0,
        maxWidth: 0,
        areas: [],
        activeCoalNames: [],
      });
    }

    const warehouse = warehouseMap.get(id);
    warehouse.unit = warehouse.unit || normalizeText(row.don_vi_quan_ly);
    warehouse.maxLength = Math.max(warehouse.maxLength, toNumber(row.chieu_dai_m));
    warehouse.maxWidth = Math.max(warehouse.maxWidth, toNumber(row.chieu_rong_m));

    const coalNames = splitCoalNames(row.chung_loai);

    warehouse.areas.push({
      coalNames,
      length: toNumber(row.chieu_dai_m),
      width: toNumber(row.chieu_rong_m),
      note: normalizeText(row.chung_loai),
    });

    for (const coalName of coalNames) {
      if (!warehouse.activeCoalNames.includes(coalName)) {
        warehouse.activeCoalNames.push(coalName);
      }

      if (!coalMap.has(normalizeKey(coalName))) {
        const catalogCoalType = findCatalogCoalType(coalMap, coalName);

        coalMap.set(normalizeKey(coalName), {
          name: coalName,
          density: catalogCoalType?.density ?? 0,
        });
      }
    }
  }

  return {
    warehouses: Array.from(warehouseMap.values()).sort(compareWarehousesNatural),
    coalTypes: Array.from(coalMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "vi")
    ),
  };
};

const getWarehouseCoalArea = (warehouse, coalName) => {
  const key = normalizeKey(coalName);
  return warehouse?.areas?.find((area) =>
    area.coalNames.some((name) => normalizeKey(name) === key)
  );
};

const getDensityFromCatalog = (coalTypes, coalName) => {
  const exact = coalTypes.find(
    (item) => normalizeKey(item.name) === normalizeKey(coalName)
  );

  if (exact && toNumber(exact.density) > 0) return toNumber(exact.density);

  const sameBase = coalTypes.find(
    (item) => coalMatches(coalName, item.name) && toNumber(item.density) > 0
  );

  return sameBase ? toNumber(sameBase.density) : 0;
};

const mergeCoalTypeLists = (...lists) => {
  const map = new Map();

  for (const list of lists) {
    for (const item of list || []) {
      const name = normalizeText(item?.name);
      if (!name) continue;

      const key = normalizeKey(name);
      const oldItem = map.get(key);
      const nextDensity = toNumber(item?.density);

      if (!oldItem) {
        map.set(key, { name, density: nextDensity });
        continue;
      }

      if (toNumber(oldItem.density) <= 0 && nextDensity > 0) {
        map.set(key, { name: oldItem.name, density: nextDensity });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi")
  );
};


// Fix v1.4.2: Lọc dữ liệu tồn kho hiện hành trước khi dựng danh sách chủng loại.
// Không hard-code Kho 26/Kho 28; kho nào có chủng loại tồn thực tế > 0 thì tự hiện.
const stripVietnameseMarks = (value) =>
  normalizeKey(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d");


const isRawTtcoKhoNameAllowed = (value) => {
  const raw = normalizeText(value);
  if (!raw) return true;
  const key = stripVietnameseMarks(raw);
  // Chỉ cho phép tên kho chuẩn. Không cho fallback MaKho khi TenKho là Hồ/Bãi/khu kỹ thuật.
  // Lỗi Kho 39 trước đây: MaKho=39 nhưng TenKho=Hồ 1, bị hiểu nhầm thành Kho 39.
  if (/^kho\s*\d+/i.test(key)) return true;
  if (/^\d{1,3}[a-z]?$/i.test(key)) return true;
  if (/^\d{1,3}\s*[-–]\s*\d+$/i.test(key)) return true;
  if (/^\d{1,3}\s*[-–]?\s*t\s*\d+$/i.test(key)) return true;
  return false;
};
const looksLikeSpecificCoalProductName = (value) => {
  const key = stripVietnameseMarks(normalizeCoalBase(value));
  if (!key) return false;
  return (
    key.startsWith("cam ") ||
    key.startsWith("cuc ") ||
    key.startsWith("bun ") ||
    key.startsWith("da ") ||
    key.startsWith("nguyen khai") ||
    key.startsWith("ba ") ||
    key.includes(" ntc")
  );
};

const isGenericTtcoCoalGroupName = (value) => {
  const key = stripVietnameseMarks(normalizeCoalBase(value));
  if (!key) return true;
  return (
    key === "than nk" ||
    key === "than nhk" ||
    key === "than nhap khau" ||
    key.startsWith("than anthracite")
  );
};

const isRecordKhoNameConsistent = (record) => {
  const rawName = normalizeText(record?.rawKhoName);
  const rawCode = normalizeText(record?.rawKhoCode || record?.khoCode);
  const finalStandard = getStandardKhoInfo(record?.kho) || getStandardKhoInfo(record?.khoCode);

  // Nếu JSON có TenKho nhưng TenKho không phải dạng kho chuẩn thì loại luôn.
  // Không được dùng MaKho để bẻ "Hồ 1" thành "Kho 39".
  if (rawName && !isRawTtcoKhoNameAllowed(rawName)) return false;

  const rawNameStandard = rawName ? getStandardKhoInfo(rawName) : null;
  const rawCodeStandard = rawCode ? getStandardKhoInfo(rawCode) : null;

  if (rawNameStandard && finalStandard && rawNameStandard.code !== finalStandard.code) return false;

  // Nếu cả TenKho và MaKho đều có chuẩn, chúng phải cùng chỉ một kho sau chuẩn hóa.
  if (rawNameStandard && rawCodeStandard && rawNameStandard.code !== rawCodeStandard.code) return false;

  return true;
}; const isValidCurrentTtcoStockRecord = (record) => {
  if (!record) return false;
  if (!getStandardKhoInfo(record.kho) && !getStandardKhoInfo(record.khoCode)) return false;
  const coalName = normalizeText(record.coal);
  if (!coalName) return false;
  const mass = toNumber(record.ton);
  if (Math.abs(mass) < 0.000001) return false;
  if (!isRecordKhoNameConsistent(record)) return false;

  const coalCode = normalizeText(record.coalCode || record.MaThan || record.ma_than);
  const isImportCoalLine =
    /^nhk\./i.test(coalCode) ||
    /\(.+\)/.test(coalName) ||
    normalizeText(record.sourceFix || record.SourceFix).toUpperCase().includes("KHO39");

  if (isGenericTtcoCoalGroupName(coalName) && !looksLikeSpecificCoalProductName(coalName) && !isImportCoalLine) {
    return false;
  }
  return true;
}; const getTtcoCoalTypesForWarehouse = (warehouse, ttcoRecords, coalTypes) => {
  if (!warehouse || !Array.isArray(ttcoRecords) || ttcoRecords.length === 0) {
    return [];
  }

  const warehouseCode = getKhoCompareCode(warehouse.id || warehouse.name);
  const warehouseNameKey = normalizeKey(warehouse.name);
  const map = new Map();

  for (const item of ttcoRecords) {
    if (!isValidCurrentTtcoStockRecord(item)) continue;
    const itemCode = getKhoCompareCode(item.khoCode || item.kho);
    const sameKho =
      itemCode === warehouseCode ||
      normalizeKey(item.kho) === warehouseNameKey;

    if (!sameKho) continue;

    const name = normalizeText(item.coal);
    if (!name) continue;

    const key = normalizeKey(name);
    if (!map.has(key)) {
      map.set(key, {
        name,
        density: getDensityFromCatalog(coalTypes, name),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "vi")
  );
};

const buildWarehouseListFromTTCO = (ttcoRecords, excelWarehouses) => {
  if (!Array.isArray(ttcoRecords) || ttcoRecords.length === 0) {
    return excelWarehouses;
  }

  const excelByCode = new Map();
  const excelByName = new Map();

  for (const warehouse of excelWarehouses || []) {
    const code = getKhoCompareCode(warehouse.id || warehouse.name);
    const nameKey = normalizeKey(warehouse.name);

    if (code && !excelByCode.has(code)) {
      excelByCode.set(code, warehouse);
    }

    if (nameKey && !excelByName.has(nameKey)) {
      excelByName.set(nameKey, warehouse);
    }
  }

  const map = new Map();

  for (const record of ttcoRecords) {
    if (!isValidCurrentTtcoStockRecord(record)) continue;
    const standardKho = getStandardKhoInfo(record.kho) || getStandardKhoInfo(record.khoCode);
    if (!standardKho) continue;

    const code = standardKho.code;
    const name = standardKho.name;
    const key = code;
    const coal = normalizeText(record.coal);

    if (!key || !name) continue;

    const excelWarehouse =
      excelByCode.get(code) || excelByName.get(normalizeKey(name)) || null;

    if (!map.has(key)) {
      map.set(key, {
        id: code || name,
        name,
        unit: normalizeText(excelWarehouse?.unit) || "",
        maxLength: toNumber(excelWarehouse?.maxLength),
        maxWidth: toNumber(excelWarehouse?.maxWidth),
        areas: Array.isArray(excelWarehouse?.areas) ? excelWarehouse.areas : [],
        activeCoalNames: [],
      });
    }

    const item = map.get(key);

    if (!item.unit && excelWarehouse?.unit) {
      item.unit = normalizeText(excelWarehouse.unit);
    }

    if (toNumber(item.maxLength) <= 0 && toNumber(excelWarehouse?.maxLength) > 0) {
      item.maxLength = toNumber(excelWarehouse.maxLength);
    }

    if (toNumber(item.maxWidth) <= 0 && toNumber(excelWarehouse?.maxWidth) > 0) {
      item.maxWidth = toNumber(excelWarehouse.maxWidth);
    }

    if ((!item.areas || item.areas.length === 0) && Array.isArray(excelWarehouse?.areas)) {
      item.areas = excelWarehouse.areas;
    }

    if (coal && !item.activeCoalNames.some((name) => coalMatches(name, coal))) {
      item.activeCoalNames.push(coal);
    }
  }

  // Bổ sung các kho chuẩn có trong Excel nhưng chưa có dòng tồn kho trong JSON.
  // Trường hợp thực tế: Kho 30, Kho 35 có trong danh mục/báo cáo TTCO_APP nhưng tháng hiện tại có thể chưa có tồn,
  // nếu chỉ dựng danh sách từ JSON thì sẽ bị mất khỏi combobox.
  for (const excelWarehouse of excelWarehouses || []) {
    const standardKho =
      getStandardKhoInfo(excelWarehouse.id) || getStandardKhoInfo(excelWarehouse.name);

    if (!standardKho) continue;

    const key = standardKho.code;
    if (!key || map.has(key)) continue;

    map.set(key, {
      id: key,
      name: standardKho.name,
      unit: normalizeText(excelWarehouse.unit) || "",
      maxLength: toNumber(excelWarehouse.maxLength),
      maxWidth: toNumber(excelWarehouse.maxWidth),
      areas: Array.isArray(excelWarehouse.areas) ? excelWarehouse.areas : [],
      activeCoalNames: Array.isArray(excelWarehouse.activeCoalNames)
        ? excelWarehouse.activeCoalNames
        : [],
    });
  }

  return Array.from(map.values()).sort(compareWarehousesNatural);
};

const emptyBlock = () => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now() + Math.random()),
  lengthMode: "roller",
  rollerFrom: "",
  rollerTo: "",
  manualLength: "",
  baseWidth: "",
  topWidth: "",
  height: "",
});

function getWarning(diff) {
  const abs = Math.abs(diff);

  if (abs < 2000) {
    return {
      label: "Bình thường",
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (abs < 5000) {
    return {
      label: "Cần chú ý",
      color: "bg-yellow-50 text-yellow-800 border-yellow-200",
      icon: AlertTriangle,
    };
  }

  if (abs < 10000) {
    return {
      label: "Cảnh báo cao",
      color: "bg-orange-50 text-orange-800 border-orange-200",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Cảnh báo nghiêm trọng",
    color: "bg-red-50 text-red-800 border-red-200",
    icon: AlertTriangle,
  };
}

function calculateBlock(block) {
  const baseWidth = toNumber(block.baseWidth);
  const topWidth = toNumber(block.topWidth);
  const height = toNumber(block.height);

  const length =
    block.lengthMode === "roller"
      ? 1.2 * Math.abs(toNumber(block.rollerTo) - toNumber(block.rollerFrom))
      : toNumber(block.manualLength);

  const sectionArea = ((baseWidth + topWidth) * height) / 2;
  const volume = sectionArea * length;

  return {
    length,
    sectionArea,
    volume,
    baseWidth,
    topWidth,
    height,
  };
}

function findHeaderIndex(headers, candidates) {
  const normalized = headers.map((h) => normalizeKey(h).replace(/_/g, " "));

  for (const candidate of candidates) {
    const target = normalizeKey(candidate).replace(/_/g, " ");
    const index = normalized.findIndex((h) => h === target);
    if (index >= 0) return index;
  }

  return -1;
}

function getCellValueWithMerges(sheet, rowIndex, colIndex) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  const direct = sheet[address]?.v;

  if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
    return direct;
  }

  const merges = sheet["!merges"] || [];

  for (const merge of merges) {
    if (
      rowIndex >= merge.s.r &&
      rowIndex <= merge.e.r &&
      colIndex >= merge.s.c &&
      colIndex <= merge.e.c
    ) {
      const topLeftAddress = XLSX.utils.encode_cell({
        r: merge.s.r,
        c: merge.s.c,
      });
      const mergedValue = sheet[topLeftAddress]?.v;

      if (
        mergedValue !== undefined &&
        mergedValue !== null &&
        String(mergedValue).trim() !== ""
      ) {
        return mergedValue;
      }
    }
  }

  return "";
}

function parseExcelWorkbook(workbook) {
  const khoSheet = workbook.Sheets.dm_kho || workbook.Sheets["dm_kho"];
  const tyKhoiSheet = workbook.Sheets.dm_ty_khoi || workbook.Sheets["dm_ty_khoi"];

  if (!khoSheet || !tyKhoiSheet) {
    throw new Error("File Excel phải có 2 sheet: dm_kho và dm_ty_khoi.");
  }

  const khoArray = XLSX.utils.sheet_to_json(khoSheet, {
    header: 1,
    defval: "",
  });

  const tyKhoiArray = XLSX.utils.sheet_to_json(tyKhoiSheet, {
    header: 1,
    defval: "",
  });

  if (khoArray.length < 2 || tyKhoiArray.length < 2) {
    throw new Error("File Excel chưa có đủ dữ liệu danh mục.");
  }

  const khoHeaders = khoArray[0];

  const iMaKho = findHeaderIndex(khoHeaders, ["ma_kho", "mã kho", "ma kho"]);
  const iTenKho = findHeaderIndex(khoHeaders, ["ten_kho", "tên kho", "ten kho"]);
  const iUnit = findHeaderIndex(khoHeaders, [
    "Don vi quan ly",
    "don_vi_quan_ly",
    "đơn vị quản lý",
  ]);
  const iLength = findHeaderIndex(khoHeaders, [
    "Chieu_dai_m",
    "chiều dài m",
    "chieu dai m",
  ]);
  const iWidth = findHeaderIndex(khoHeaders, [
    "Chieu_rong_m",
    "chiều rộng m",
    "chieu rong m",
  ]);
  const iCoal = findHeaderIndex(khoHeaders, [
    "chung_loai",
    "chủng loại",
    "ghi_chu",
    "ghi chú",
  ]);

  const tyHeaders = tyKhoiArray[0];

  const iCoalName = findHeaderIndex(tyHeaders, [
    "chung_loai",
    "chủng loại",
    "chung loai",
  ]);
  const iDensity = findHeaderIndex(tyHeaders, [
    "ty_khoi_tan_m3",
    "tỷ khối",
    "ty khoi tan m3",
  ]);

  if ([iTenKho, iLength, iWidth].some((i) => i < 0)) {
    throw new Error(
      "Sheet dm_kho thiếu cột bắt buộc: ten_kho, Chieu_dai_m, Chieu_rong_m. Cột ma_kho là tùy chọn; nếu thiếu app sẽ tự suy ra mã kho từ ten_kho."
    );
  }

  if ([iCoalName, iDensity].some((i) => i < 0)) {
    throw new Error(
      "Sheet dm_ty_khoi thiếu cột bắt buộc: chung_loai, ty_khoi_tan_m3."
    );
  }

  const khoRows = khoArray
    .slice(1)
    .map((row) => ({
      ma_kho: iMaKho >= 0 ? normalizeKhoCode(row[iMaKho]) : normalizeKhoCode(row[iTenKho]),
      ten_kho: row[iTenKho],
      don_vi_quan_ly: iUnit >= 0 ? row[iUnit] : "",
      chieu_dai_m: row[iLength],
      chieu_rong_m: row[iWidth],
      chung_loai: iCoal >= 0 ? row[iCoal] : "",
    }))
    .filter((row) => normalizeText(row.ma_kho) && normalizeText(row.ten_kho));

  const tyKhoiRows = tyKhoiArray
    .slice(1)
    .map((row) => ({
      chung_loai: row[iCoalName],
      ty_khoi_tan_m3: row[iDensity],
    }))
    .filter((row) => normalizeText(row.chung_loai));

  return { khoRows, tyKhoiRows };
}

function parseTTCOWorkbook(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet || !sheet["!ref"]) {
    throw new Error("File TTCO_APP không có dữ liệu.");
  }

  const range = XLSX.utils.decode_range(sheet["!ref"]);

  const headers = [];

  for (let c = range.s.c; c <= range.e.c; c += 1) {
    headers.push(getCellValueWithMerges(sheet, range.s.r, c));
  }

  const iCoal = findHeaderIndex(headers, ["Loại than", "Chủng loại", "Tên than"]);
  const iKho = findHeaderIndex(headers, ["Kho than", "Tên kho", "Kho"]);
  const iTon = findHeaderIndex(headers, [
    "Tồn CK",
    "Ton CK",
    "Tồn cuối kỳ",
    "Tồn kho",
    "Khối lượng tồn",
    "Klg_Tan",
    "Khối lượng",
  ]);

  if ([iCoal, iKho, iTon].some((i) => i < 0)) {
    throw new Error("File TTCO_APP thiếu cột: Loại than, Kho than, Tồn CK.");
  }

  const coalLabelRows = [];

  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    const coal = normalizeText(getCellValueWithMerges(sheet, r, iCoal));

    if (coal) {
      coalLabelRows.push({
        rowIndex: r,
        coal,
      });
    }
  }

  const findNearestCoalLabel = (rowIndex) => {
    const current = coalLabelRows.find((item) => item.rowIndex === rowIndex);
    if (current) return current.coal;

    let before = null;
    let after = null;

    for (const item of coalLabelRows) {
      if (item.rowIndex < rowIndex) before = item;
      if (item.rowIndex > rowIndex) {
        after = item;
        break;
      }
    }

    if (!before && !after) return "";
    if (!before) return after.coal;
    if (!after) return before.coal;

    const distanceBefore = rowIndex - before.rowIndex;
    const distanceAfter = after.rowIndex - rowIndex;

    return distanceAfter < distanceBefore ? after.coal : before.coal;
  };

  const records = [];

  for (let r = range.s.r + 1; r <= range.e.r; r += 1) {
    const kho = normalizeText(getCellValueWithMerges(sheet, r, iKho));
    const ton = toMaybeNumber(getCellValueWithMerges(sheet, r, iTon));

    if (!kho || ton === null) continue;

    const coal = findNearestCoalLabel(r);
    if (!coal) continue;

    records.push({
      kho,
      coal,
      ton,
      sheetName,
      rowNumber: r + 1,
    });
  }

  if (records.length === 0) {
    throw new Error("Không đọc được dòng tồn kho nào từ file TTCO_APP.");
  }

  return records;
}

function Field({ label, children, note }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      {children}
      {note ? (
        <div className="mt-1 text-xs leading-5 text-slate-500">{note}</div>
      ) : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
    />
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

function SmallButton({ children, onClick, variant = "light", disabled = false }) {
  const styles =
    variant === "dark"
      ? "bg-slate-950 text-white hover:bg-slate-800"
      : variant === "green"
      ? "bg-emerald-700 text-white hover:bg-emerald-800"
      : variant === "blue"
      ? "bg-blue-700 text-white hover:bg-blue-800"
      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {children}
    </button>
  );
}

function ResultBox({ label, value, dark = false }) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        dark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${
          dark ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function ResultSummaryPanel({
  totalVolume,
  density,
  blockCount,
  actualMass,
  appMass,
  diff,
  diffRate,
  warning,
  WarningIcon,
  onSave,
}) {
  return (
    <Panel className="overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
              <Calculator size={20} />
            </span>
            3. Kết quả tổng hợp
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Theo dõi nhanh thể tích, khối lượng thực tế và chênh lệch với TTCO_APP.
          </p>
        </div>

        <div className={`inline-flex w-fit items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-black ${warning.color}`}>
          <WarningIcon size={17} />
          {warning.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ResultBox label="Tổng thể tích" value={`${formatNumber(totalVolume)} m³`} />
        <ResultBox label="Tỷ khối" value={formatNumber(density, 4)} />
        <ResultBox label="Số khối" value={String(blockCount)} />
        <ResultBox label="TTCO_APP" value={`${formatNumber(appMass)} tấn`} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <ResultBox label="Khối lượng thực tế" value={`${formatNumber(actualMass)} tấn`} dark />

        <div className={`rounded-2xl border p-4 ${warning.color}`}>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide">
            <WarningIcon size={17} />
            Chênh lệch
          </div>

          <div className="mt-2 text-3xl font-black tracking-tight">
            {diff >= 0 ? "+" : ""}
            {formatNumber(diff)} tấn
          </div>

          <div className="mt-1 text-sm font-semibold">
            {diff > 0
              ? "Thực tế lớn hơn TTCO_APP"
              : diff < 0
              ? "Thực tế nhỏ hơn TTCO_APP"
              : "Thực tế bằng TTCO_APP"}
          </div>

          {appMass > 0 ? (
            <div className="mt-1 text-sm font-semibold">
              Tỷ lệ chênh lệch: {diffRate >= 0 ? "+" : ""}
              {formatNumber(diffRate, 2)}%
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
      >
        <Save size={17} />
        Lưu kết quả
      </button>
    </Panel>
  );
}

function SavedResultsTable({ history, onDelete, onExport }) {
  const totalActualMass = history.reduce((sum, item) => sum + toNumber(item.actualMass), 0);
  const totalTtcoMass = history.reduce((sum, item) => sum + toNumber(item.ttcoMass), 0);
  const totalDiff = totalActualMass - totalTtcoMass;

  return (
    <Panel className="overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <ListChecks size={20} />
            </span>
            4. Danh sách kho đã tính
          </h2>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Tổng hợp các kết quả đã bấm “Lưu kết quả”, dùng để rà soát, so sánh và xuất Excel.
          </p>
        </div>

        <SmallButton onClick={onExport} variant="dark">
          <Download size={16} />
          Xuất Excel
        </SmallButton>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Số lượt lưu</div>
          <div className="mt-2 text-3xl font-black text-slate-950">{history.length}</div>
        </div>

        <div className={`rounded-2xl border p-4 ${getDiffClassName(totalDiff)}`}>
          <div className="text-xs font-black uppercase tracking-wide">Tổng chênh lệch</div>
          <div className="mt-2 text-3xl font-black">
            {totalDiff >= 0 ? "+" : ""}
            {formatNumber(totalDiff)} tấn
          </div>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <ListChecks size={26} />
          </div>
          <div className="mt-4 text-base font-black text-slate-800">Chưa có kho nào được lưu</div>
          <div className="mt-1 text-sm font-medium leading-6 text-slate-500">
            Sau khi nhập số liệu, bấm “Lưu kết quả” để đưa vào danh sách này.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-[1100px] w-full border-collapse bg-white text-sm">
            <thead className="bg-slate-950 text-white">
              <tr>
                <th className="px-3 py-3 text-left font-black">STT</th>
                <th className="px-3 py-3 text-left font-black">Thời gian lưu</th>
                <th className="px-3 py-3 text-left font-black">Kho</th>
                <th className="px-3 py-3 text-left font-black">Loại than</th>
                <th className="px-3 py-3 text-right font-black">Số khối</th>
                <th className="px-3 py-3 text-right font-black">Thể tích m³</th>
                <th className="px-3 py-3 text-right font-black">Thực tế tấn</th>
                <th className="px-3 py-3 text-right font-black">TTCO_APP tấn</th>
                <th className="px-3 py-3 text-right font-black">Chênh lệch tấn</th>
                <th className="px-3 py-3 text-left font-black">Cảnh báo</th>
                <th className="px-3 py-3 text-center font-black">Xóa</th>
              </tr>
            </thead>

            <tbody>
              {history.map((item, index) => {
                const diff = toNumber(item.diff);
                const warningClass = getDiffClassName(diff);

                return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-slate-700">{index + 1}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {new Date(item.savedAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-3 font-black text-slate-900">{item.warehouseName}</td>
                    <td className="px-3 py-3 font-semibold text-slate-700">{item.coalName}</td>
                    <td className="px-3 py-3 text-right font-semibold">{item.blocks?.length || 0}</td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatNumber(item.totalVolume)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatNumber(item.actualMass)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {formatNumber(item.ttcoMass)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={`inline-flex rounded-xl border px-2 py-1 font-black ${warningClass}`}>
                        {diff >= 0 ? "+" : ""}
                        {formatNumber(diff)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex rounded-xl border px-2 py-1 text-xs font-black ${warningClass}`}>
                        {item.warningLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                        title="Xóa dòng này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function TTCOCoalStockpileApp() {
  const [rawKhoRows, setRawKhoRows] = useState(DEFAULT_KHO_ROWS);
  const [rawTyKhoiRows, setRawTyKhoiRows] = useState(DEFAULT_TY_KHOI_ROWS);
  const [uploadError, setUploadError] = useState("");
  const [catalogSourceName, setCatalogSourceName] = useState("Đang tải Excel danh mục từ public/data...");
  const [catalogReady, setCatalogReady] = useState(false);
  const rawKhoRowsRef = useRef(DEFAULT_KHO_ROWS);
  const rawTyKhoiRowsRef = useRef(DEFAULT_TY_KHOI_ROWS);

  useEffect(() => {
    rawKhoRowsRef.current = rawKhoRows;
  }, [rawKhoRows]);

  useEffect(() => {
    rawTyKhoiRowsRef.current = rawTyKhoiRows;
  }, [rawTyKhoiRows]);

  const [ttcoRecords, setTtcoRecords] = useState([]);
  const [ttcoSourceName, setTtcoSourceName] = useState("");
  const [ttcoError, setTtcoError] = useState("");
  const [isLoadingTTCO, setIsLoadingTTCO] = useState(false);
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isLoadingGitHub, setIsLoadingGitHub] = useState(false);

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isGithubPages = typeof window !== "undefined" && window.location.hostname.includes("github.io");
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth <= 768;
  const isMobileOrPublicMode = isGithubPages || isSmallScreen;

  const dataModel = useMemo(
    () => buildDataModel(rawKhoRows, rawTyKhoiRows),
    [rawKhoRows, rawTyKhoiRows]
  );

  const { warehouses: excelWarehouses, coalTypes } = dataModel;

  const warehouses = useMemo(
    () => buildWarehouseListFromTTCO(ttcoRecords, excelWarehouses),
    [ttcoRecords, excelWarehouses]
  );

  const [warehouseId, setWarehouseId] = useState("KHO09");
  const [coalName, setCoalName] = useState("Cám 6a.14");
  const [allowAllCoalTypes, setAllowAllCoalTypes] = useState(false);
  const [densityOverride, setDensityOverride] = useState("");
  const [ttcoMass, setTtcoMass] = useState("");
  const [sectionSpacing, setSectionSpacing] = useState("2");
  const [warehouseLengthOverride, setWarehouseLengthOverride] = useState("");
  const [blocks, setBlocks] = useState([emptyBlock()]);

  const warehouse = useMemo(
    () => warehouses.find((item) => item.id === warehouseId) || warehouses[0],
    [warehouseId, warehouses]
  );

  useEffect(() => {
    if (warehouses.length === 0) return;

    const currentWarehouseExists = warehouses.some((item) => item.id === warehouseId);

    if (!currentWarehouseExists) {
      const nextWarehouse = warehouses[0];
      setWarehouseId(nextWarehouse.id);
      setCoalName(nextWarehouse.activeCoalNames?.[0] || coalTypes[0]?.name || "");
      setDensityOverride("");
      setWarehouseLengthOverride("");
    }
  }, [warehouses, warehouseId, coalTypes]);

  const selectedCoalType = useMemo(() => {
    const exact = coalTypes.find(
      (item) => normalizeKey(item.name) === normalizeKey(coalName)
    );

    if (exact && toNumber(exact.density) > 0) return exact;

    const sameBase = coalTypes.find(
      (item) => coalMatches(coalName, item.name) && toNumber(item.density) > 0
    );

    return sameBase || exact || coalTypes[0];
  }, [coalName, coalTypes]);

  const selectedArea = useMemo(
    () => getWarehouseCoalArea(warehouse, coalName),
    [warehouse, coalName]
  );

  const ttcoCoalTypesForWarehouse = useMemo(
    () => getTtcoCoalTypesForWarehouse(warehouse, ttcoRecords, coalTypes),
    [warehouse, ttcoRecords, coalTypes]
  );

  const availableCoalTypes = useMemo(() => {
    if (!warehouse) return coalTypes;

    // Khi đã có dữ liệu TTCO_APP, danh sách chủng loại trong kho phải lấy theo TTCO_APP.
    // Excel chỉ cung cấp kích thước kho và tỷ khối, không quyết định chủng loại đang tồn.
    if (!allowAllCoalTypes && ttcoCoalTypesForWarehouse.length > 0) {
      return ttcoCoalTypesForWarehouse;
    }

    if (allowAllCoalTypes) {
      return mergeCoalTypeLists(ttcoCoalTypesForWarehouse, coalTypes);
    }

    if (warehouse.activeCoalNames.length === 0) {
      return coalTypes;
    }

    const activeKeys = new Set(warehouse.activeCoalNames.map(normalizeKey));

    return coalTypes.filter((item) => activeKeys.has(normalizeKey(item.name)));
  }, [allowAllCoalTypes, warehouse, coalTypes, ttcoCoalTypesForWarehouse, ttcoRecords.length]);

  useEffect(() => {
    if (!warehouse || ttcoCoalTypesForWarehouse.length === 0) return;

    const currentStillExists = ttcoCoalTypesForWarehouse.some((item) =>
      coalMatches(coalName, item.name)
    );

    if (!currentStillExists) {
      setCoalName(ttcoCoalTypesForWarehouse[0].name);
      setDensityOverride("");
      setWarehouseLengthOverride("");
    }
  }, [warehouse, coalName, ttcoCoalTypesForWarehouse, ttcoRecords.length]);

  const matchedTtcoMass = useMemo(() => {
    if (!warehouse || !coalName || ttcoRecords.length === 0) return null;

    const warehouseCode = getKhoCompareCode(warehouse.id || warehouse.name);
    const warehouseNameKey = normalizeKey(warehouse.name);

    const matched = ttcoRecords.filter((item) => { if (!isTtcoDisplayStockRecord(item)) return false; const itemCode = getKhoCompareCode(item.khoCode || item.kho);
      const sameKho =
        itemCode === warehouseCode ||
        normalizeKey(item.kho) === warehouseNameKey;

      return sameKho && coalMatches(coalName, item.coal);
    });

    if (matched.length === 0) return null;

    return matched.reduce((sum, item) => sum + item.ton, 0);
  }, [warehouse, coalName, ttcoRecords]);

  useEffect(() => { if (matchedTtcoMass !== null) { setTtcoMass(String(Math.round(matchedTtcoMass * 100) / 100)); } else { setTtcoMass(""); } }, [matchedTtcoMass, warehouseId, coalName]);

  useEffect(() => {
    const loadDefaultCatalog = async () => {
      try {
        const response = await fetch(`${DEFAULT_CATALOG_FILE}?_=${Date.now()}`, { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const { khoRows, tyKhoiRows } = parseExcelWorkbook(workbook);
        const nextModel = buildDataModel(khoRows, tyKhoiRows);

        if (
          nextModel.warehouses.length === 0 ||
          nextModel.coalTypes.length === 0
        ) {
          return;
        }

        rawKhoRowsRef.current = khoRows;
        rawTyKhoiRowsRef.current = tyKhoiRows;
        setRawKhoRows(khoRows);
        setRawTyKhoiRows(tyKhoiRows);
        setCatalogSourceName("GitHub Excel: public/data/DS_kho_than_va_ty_khoi.xlsx");
      } catch {
        // Không tải được file Excel thì giữ trạng thái hiện tại và báo sẵn sàng để app không treo.
      } finally {
        setCatalogReady(true);
      }
    };

    loadDefaultCatalog();
  }, []);

  const density =
    densityOverride === ""
      ? toNumber(selectedCoalType?.density)
      : toNumber(densityOverride);

  const maxLengthFromCatalog = selectedArea?.length || warehouse?.maxLength || 0;
  const maxLengthForSelectedCoal =
    warehouseLengthOverride === ""
      ? maxLengthFromCatalog
      : toNumber(warehouseLengthOverride);
  const maxWidthForSelectedCoal = selectedArea?.width || warehouse?.maxWidth || 0;

  const blockResults = useMemo(() => blocks.map(calculateBlock), [blocks]);

  const totalVolume = blockResults.reduce((sum, item) => sum + item.volume, 0);
  const actualMass = totalVolume * density;
  const appMass = toNumber(ttcoMass);
  const diff = actualMass - appMass;
  const diffRate = appMass > 0 ? (diff / appMass) * 100 : 0;

  const warning = getWarning(diff);
  const WarningIcon = warning.icon;

  const validationErrors = useMemo(() => {
    const errors = [];

    if (density <= 0) {
      errors.push(
        "Tỷ khối phải lớn hơn 0. Kiểm tra danh mục tỷ khối hoặc nhập thủ công."
      );
    }

    if (toNumber(sectionSpacing) <= 0) {
      errors.push("Khoảng cách mặt cắt phải lớn hơn 0.");
    }

    blocks.forEach((block, index) => {
      const result = calculateBlock(block);
      const name = `Khối ${index + 1}`;

      if (result.length <= 0) errors.push(`${name}: chiều dài phải lớn hơn 0.`);
      if (result.baseWidth <= 0) {
        errors.push(`${name}: chiều rộng chân phải lớn hơn 0.`);
      }

      if (
        maxWidthForSelectedCoal > 0 &&
        result.baseWidth > maxWidthForSelectedCoal
      ) {
        errors.push(
          `${name}: chiều rộng chân không được lớn hơn ${formatNumber(
            maxWidthForSelectedCoal
          )} m.`
        );
      }

      if (result.topWidth < 0) {
        errors.push(`${name}: chiều rộng đỉnh không được âm.`);
      }

      if (result.topWidth > result.baseWidth) {
        errors.push(`${name}: chiều rộng đỉnh không được lớn hơn chiều rộng chân.`);
      }

      if (result.height <= 0) errors.push(`${name}: chiều cao phải lớn hơn 0.`);

      if (
        maxLengthForSelectedCoal > 0 &&
        result.length > maxLengthForSelectedCoal
      ) {
        errors.push(
          `${name}: chiều dài không nên lớn hơn chiều dài kho ${formatNumber(
            maxLengthForSelectedCoal
          )} m.`
        );
      }
    });

    return errors;
  }, [
    blocks,
    density,
    sectionSpacing,
    maxLengthForSelectedCoal,
    maxWidthForSelectedCoal,
  ]);

  const resetSelectionAfterDataChange = (nextWarehouses, nextCoalTypes) => {
    const firstWarehouse = nextWarehouses[0];

    setWarehouseId(firstWarehouse?.id || "");
    setAllowAllCoalTypes(false);

    const firstCoalName =
      firstWarehouse?.activeCoalNames?.[0] || nextCoalTypes[0]?.name || "";

    setCoalName(firstCoalName);
    setDensityOverride("");
    setWarehouseLengthOverride("");
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const { khoRows, tyKhoiRows } = parseExcelWorkbook(workbook);
      const nextModel = buildDataModel(khoRows, tyKhoiRows);

      if (
        nextModel.warehouses.length === 0 ||
        nextModel.coalTypes.length === 0
      ) {
        throw new Error("Không đọc được danh mục kho hoặc danh mục tỷ khối.");
      }

      rawKhoRowsRef.current = khoRows;
      rawTyKhoiRowsRef.current = tyKhoiRows;
      setRawKhoRows(khoRows);
      setRawTyKhoiRows(tyKhoiRows);
      setCatalogSourceName(file.name);
      setCatalogReady(true);
      resetSelectionAfterDataChange(nextModel.warehouses, nextModel.coalTypes);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Không đọc được file Excel."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleTTCOUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTtcoError("");

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const records = parseTTCOWorkbook(workbook);

      setTtcoRecords(records);
      setTtcoSourceName(file.name);

      alert(`Đã đọc ${records.length} dòng tồn kho từ file Excel tồn kho xuất từ TTCO_APP.`);
    } catch (error) {
      setTtcoRecords([]);
      setTtcoSourceName("");
      setTtcoError(
        error instanceof Error ? error.message : "Không đọc được file Excel tồn kho xuất từ TTCO_APP."
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleAutoLoadTTCOFromDatabase = async () => {
    setTtcoError("");
    setIsLoadingTTCO(true);

    try {
      const response = await fetch(BACKEND_JSON_URL, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Backend chưa chạy hoặc không lấy được dữ liệu từ database.");
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Không lấy được dữ liệu TTCO_APP từ database.");
      }

      const records = (data.rows || []).map((item) => ({
        kho: item.kho,
        coal: item.coal,
        ton: Number(item.ton || 0),
        sheetName: "CDOTHAN",
        rowNumber: "",
      }));

      if (records.length === 0) {
        throw new Error("Backend trả về dữ liệu rỗng.");
      }

      setTtcoRecords(records);
      setTtcoSourceName(`Database CDOTHAN tháng ${data.thang}/${data.nam}`);

      alert(
        `Đã tải tự động ${records.length} dòng tồn kho từ database TTCO_APP.\nKỳ dữ liệu: tháng ${data.thang}/${data.nam}`
      );
    } catch (error) {
      setTtcoRecords([]);
      setTtcoSourceName("");
      setTtcoError(
        error instanceof Error
          ? error.message
          : "Không tải được dữ liệu TTCO_APP từ database."
      );
    } finally {
      setIsLoadingTTCO(false);
    }
  };

  const handleExportTTCOToGoogleSheet = async () => {
    setTtcoError("");
    setIsExportingSheet(true);

    try {
      const response = await fetch(BACKEND_EXPORT_GOOGLE_SHEET_URL, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Backend chưa chạy hoặc chưa xuất được dữ liệu lên Google Sheet.");
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Không xuất được dữ liệu lên Google Sheet.");
      }

      alert(
        `Đã xuất dữ liệu TTCO_APP lên Google Sheet.\nKỳ dữ liệu: tháng ${data.thang}/${data.nam}\nSố dòng: ${data.count}`
      );

      await handleLoadTTCOFromGitHub();
    } catch (error) {
      setTtcoError(
        error instanceof Error
          ? error.message
          : "Không xuất được dữ liệu lên Google Sheet."
      );
    } finally {
      setIsExportingSheet(false);
    }
  };

  const handleLoadTTCOFromGoogleSheet = async () => {
    setTtcoError("");
    setIsLoadingSheet(true);

    try {
      const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&_=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không đọc được Google Sheet. Kiểm tra quyền Người xem cho link.");
      }

      const csvText = await response.text();
      const records = parseGoogleSheetCSV(csvText);

      const period = records.find((item) => item.nam || item.thang);
      const updated = records.find((item) => item.updatedAt);

      setTtcoRecords(records);
      setTtcoSourceName(
        `Google Sheet ton_kho${
          period?.thang || period?.nam ? ` tháng ${period.thang}/${period.nam}` : ""
        }${updated?.updatedAt ? ` | Cập nhật: ${updated.updatedAt}` : ""}`
      );

      alert(`Đã tải ${records.length} dòng tồn kho từ Google Sheet.`);
    } catch (error) {
      setTtcoRecords([]);
      setTtcoSourceName("");
      setTtcoError(
        error instanceof Error ? error.message : "Không tải được dữ liệu từ Google Sheet."
      );
    } finally {
      setIsLoadingSheet(false);
    }
  };


  const handleLoadTTCOFromGitHub = async ({ silent = false } = {}) => {
    setTtcoError("");
    setIsLoadingGitHub(true);

    try {
      const response = await fetch(`${GITHUB_TON_KHO_JSON_URL}?_=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không đọc được file ton_kho_latest.json trên GitHub Pages.");
      }

      const payload = await response.json();
      const { records } = parseTTCOGitHubJson(payload, rawKhoRowsRef.current);

      // Quan trọng: TTCO JSON chỉ là nguồn tồn kho để so sánh.
      // Không dùng JSON để ghi đè rawKhoRows, vì kích thước kho/tỷ khối phải luôn lấy từ Excel danh mục.
      setTtcoRecords(records);
      setTtcoSourceName(
        `GitHub JSON CDOTHAN tháng ${payload?.meta?.ThangHT || ""}/${
          payload?.meta?.NamHT || ""
        } | Bản: ${payload?.meta?.version || ""} | Cập nhật: ${payload?.meta?.updatedAt || ""}`
      );

      if (!silent) {
        alert(
          `Đã tải ${records.length} dòng tồn kho từ GitHub.\nKỳ dữ liệu: tháng ${
            payload?.meta?.ThangHT || ""
          }/${payload?.meta?.NamHT || ""}`
        );
      }
    } catch (error) {
      setTtcoError(
        error instanceof Error ? error.message : "Không tải được dữ liệu tồn kho từ GitHub."
      );
    } finally {
      setIsLoadingGitHub(false);
    }
  };

  useEffect(() => {
    if (!catalogReady) return undefined;

    const timer = window.setTimeout(() => {
      handleLoadTTCOFromGitHub({ silent: true });
    }, 300);

    return () => window.clearTimeout(timer);
    // Chỉ tự tải TTCO JSON sau khi danh mục Excel đã sẵn sàng.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogReady]);

  const restoreDefaultData = async () => {
    setUploadError("");

    try {
      const response = await fetch(`${DEFAULT_CATALOG_FILE}?_=${Date.now()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không tải được file Excel danh mục từ GitHub Pages.");
      }

      const buffer = await response.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const { khoRows, tyKhoiRows } = parseExcelWorkbook(workbook);
      const nextModel = buildDataModel(khoRows, tyKhoiRows);

      if (
        nextModel.warehouses.length === 0 ||
        nextModel.coalTypes.length === 0
      ) {
        throw new Error("File Excel danh mục không có đủ dữ liệu kho hoặc tỷ khối.");
      }

      rawKhoRowsRef.current = khoRows;
      rawTyKhoiRowsRef.current = tyKhoiRows;
      setRawKhoRows(khoRows);
      setRawTyKhoiRows(tyKhoiRows);
      setCatalogSourceName("GitHub Excel: public/data/DS_kho_than_va_ty_khoi.xlsx");
      setCatalogReady(true);
      resetSelectionAfterDataChange(nextModel.warehouses, nextModel.coalTypes);
    } catch (error) {
      // Không quay về dữ liệu hard-code nữa.
      // Nếu file Excel tải lỗi, giữ nguyên danh mục hiện tại để tránh làm Kho 1 quay về 36.5.
      setCatalogSourceName("Giữ nguyên danh mục hiện tại - lỗi tải Excel public/data");
      setCatalogReady(true);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Không tải được file Excel danh mục từ public/data."
      );
    }
  };

  const updateBlock = (id, patch) => {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, ...patch } : block))
    );
  };

  const addBlock = () => {
    setBlocks((prev) => [...prev, emptyBlock()]);
  };

  const removeBlock = (id) => {
    setBlocks((prev) =>
      prev.length <= 1 ? prev : prev.filter((block) => block.id !== id)
    );
  };

  const handleWarehouseChange = (nextWarehouseId) => {
    const nextWarehouse =
      warehouses.find((item) => item.id === nextWarehouseId) || warehouses[0];

    const ttcoCoalTypes = getTtcoCoalTypesForWarehouse(
      nextWarehouse,
      ttcoRecords,
      coalTypes
    );

    setWarehouseId(nextWarehouseId);
    setAllowAllCoalTypes(false);
    setCoalName(
      ttcoCoalTypes[0]?.name || nextWarehouse?.activeCoalNames?.[0] || coalTypes[0]?.name || ""
    );
    setDensityOverride("");
    setWarehouseLengthOverride("");
  };

  const handleCoalChange = (nextCoalName) => {
    setCoalName(nextCoalName);
    setDensityOverride("");
    setWarehouseLengthOverride("");
  };

  const saveCurrentResult = () => {
    if (validationErrors.length > 0) {
      alert("Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại trước khi lưu.");
      return;
    }

    const record = {
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),

      warehouseId,
      warehouseName: warehouse?.name || "",
      unit: warehouse?.unit || "",

      coalName,
      density,
      ttcoMass: appMass,

      sectionSpacing: toNumber(sectionSpacing),
      warehouseLength: maxLengthForSelectedCoal,
      maxWidth: maxWidthForSelectedCoal,

      blocks: blocks.map((block, index) => {
        const result = blockResults[index];

        return {
          index: index + 1,
          lengthMode: block.lengthMode,
          rollerFrom: block.rollerFrom,
          rollerTo: block.rollerTo,
          manualLength: block.manualLength,
          baseWidth: block.baseWidth,
          topWidth: block.topWidth,
          height: block.height,

          calculatedLength: result.length,
          sectionArea: result.sectionArea,
          volume: result.volume,
        };
      }),

      totalVolume,
      actualMass,
      diff,
      diffRate,
      warningLabel: warning.label,
      ttcoSourceName,
      catalogSourceName,
    };

    const nextHistory = [record, ...history].slice(0, 300);

    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));

    alert("Đã lưu kết quả tính toán.");
  };

  const deleteHistoryItem = (id) => {
    const nextHistory = history.filter((item) => item.id !== id);

    setHistory(nextHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
  };

  const exportHistoryToExcel = () => {
    if (history.length === 0) {
      alert("Chưa có lịch sử tính toán để xuất Excel.");
      return;
    }

    const summaryRows = history.map((item, index) => ({
      STT: index + 1,
      "Ngày lưu": new Date(item.savedAt).toLocaleString("vi-VN"),
      "Tên kho": item.warehouseName,
      "Đơn vị quản lý": item.unit,
      "Loại than": item.coalName,
      "Tỷ khối": item.density,
      "Số khối": item.blocks?.length || 0,
      "Chiều dài kho (m)": item.warehouseLength,
      "Chiều rộng tối đa (m)": item.maxWidth,
      "Khoảng cách mặt cắt (m)": item.sectionSpacing,
      "Tổng thể tích (m3)": item.totalVolume,
      "Khối lượng thực tế (tấn)": item.actualMass,
      "Khối lượng TTCO_APP (tấn)": item.ttcoMass,
      "Chênh lệch (tấn)": item.diff,
      "Tỷ lệ chênh lệch (%)": item.diffRate,
      "Mức cảnh báo": item.warningLabel,
      "Nguồn TTCO_APP": item.ttcoSourceName || "",
      "Nguồn danh mục": item.catalogSourceName || "",
    }));

    const detailRows = history.flatMap((item, historyIndex) =>
      (item.blocks || []).map((block) => ({
        "STT lần tính": historyIndex + 1,
        "Ngày lưu": new Date(item.savedAt).toLocaleString("vi-VN"),
        "Tên kho": item.warehouseName,
        "Loại than": item.coalName,
        "Khối số": block.index,
        "Cách nhập chiều dài":
          block.lengthMode === "roller" ? "Theo giá con lăn" : "Nhập trực tiếp",
        "Từ giá con lăn": block.rollerFrom,
        "Đến giá con lăn": block.rollerTo,
        "Chiều dài nhập tay (m)": block.manualLength,
        "Chiều dài tính được (m)": block.calculatedLength,
        "Chiều rộng chân (m)": block.baseWidth,
        "Chiều rộng đỉnh (m)": block.topWidth,
        "Chiều cao (m)": block.height,
        "Diện tích mặt cắt (m2)": block.sectionArea,
        "Thể tích khối (m3)": block.volume,
      }))
    );

    const ttcoRows = ttcoRecords.map((item, index) => ({
      STT: index + 1,
      "Kho than": item.kho,
      "Loại than": item.coal,
      "Loại than chuẩn hóa": normalizeCoalBase(item.coal),
      "Tồn CK": item.ton,
      Sheet: item.sheetName,
      "Dòng Excel": item.rowNumber,
    }));

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    const detailSheet = XLSX.utils.json_to_sheet(detailRows);
    const ttcoSheet = XLSX.utils.json_to_sheet(ttcoRows);

    summarySheet["!cols"] = [
      { wch: 6 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 24 },
      { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
      { wch: 18 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 22 },
      { wch: 22 }, { wch: 26 }, { wch: 28 },
    ];

    detailSheet["!cols"] = [
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 10 },
      { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 22 },
      { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 18 },
    ];

    ttcoSheet["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 42 }, { wch: 24 }, { wch: 14 },
      { wch: 14 }, { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Tong_hop");
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Chi_tiet_khoi");
    XLSX.utils.book_append_sheet(workbook, ttcoSheet, "Du_lieu_TTCO_APP");

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `TTCO_Xuat_khoi_luong_than_ton_kho_${today}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  if (!warehouse) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
        Chưa có dữ liệu danh mục kho.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl p-3 sm:p-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-xl sm:p-7"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-300">
                TTCO INVENTORY TOOL
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
                Tính khối lượng than tồn kho
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Tính nhanh thể tích, khối lượng thực tế và chênh lệch so với số liệu TTCO_APP.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-80">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-xs text-slate-300">Kho đang chọn</div>
                <div className="mt-1 text-lg font-black">{warehouse.name}</div>
              </div>

              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-xs text-slate-300">Loại than</div>
                <div className="mt-1 text-lg font-black">{coalName || "-"}</div>
              </div>
            </div>
          </div>
        </motion.header>

        {isMobileOrPublicMode ? (
          <div className="mb-4 rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800">
            Chế độ điện thoại/GitHub Pages: app tự tải tồn kho từ file JSON trên GitHub. Bấm “Tải dữ liệu từ GitHub” để cập nhật lại số liệu mới nhất.
          </div>
        ) : null}

        <main className="space-y-4">
          <section className="space-y-4">
            <Panel className="p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black">
                    <Database size={19} />
                    1. Thông tin chung
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Chọn kho, loại than và thông số đối chiếu.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800">
                    <Upload size={16} />
                    Tải danh mục
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800">
                    <FileSpreadsheet size={16} />
                    Tải file Excel tồn kho xuất từ TTCO_APP
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleTTCOUpload}
                      className="hidden"
                    />
                  </label>

                  <SmallButton
                    onClick={handleLoadTTCOFromGitHub}
                    variant="blue"
                    disabled={isLoadingGitHub}
                  >
                    <Sheet size={16} />
                    {isLoadingGitHub ? "Đang tải GitHub..." : "Tải dữ liệu từ GitHub"}
                  </SmallButton>

                  {!isMobileOrPublicMode ? (
                    <>
                      <SmallButton
                        onClick={handleAutoLoadTTCOFromDatabase}
                        variant="green"
                        disabled={isLoadingTTCO}
                      >
                        <Server size={16} />
                        {isLoadingTTCO ? "Đang tải..." : "Tải tự động TTCO_APP"}
                      </SmallButton>

                      <SmallButton
                        onClick={handleExportTTCOToGoogleSheet}
                        variant="dark"
                        disabled={isExportingSheet}
                      >
                        <CloudUpload size={16} />
                        {isExportingSheet ? "Đang xuất..." : "Xuất TTCO_APP lên Google Sheet"}
                      </SmallButton>
                    </>
                  ) : null}

                  <SmallButton onClick={restoreDefaultData}>
                    <RefreshCw size={16} />
                    Mặc định
                  </SmallButton>
                </div>
              </div>

              {uploadError ? (
                <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {uploadError}
                </div>
              ) : null}

              {ttcoError ? (
                <div className="mb-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {ttcoError}
                </div>
              ) : null}

              <div className="mb-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                Nguồn danh mục: {catalogSourceName}
              </div>

              {ttcoSourceName ? (
                <div className="mb-4 rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                  Đã tải TTCO_APP: {ttcoSourceName} | Đọc được {ttcoRecords.length} dòng tồn kho.
                  {matchedTtcoMass !== null
                    ? ` Đã tự điền: ${formatNumber(matchedTtcoMass)} tấn.`
                    : " Chưa tìm thấy dòng khớp kho/loại than đang chọn."}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Tên kho">
                  <Select
                    value={warehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                  >
                    {warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Đơn vị quản lý">
                  <Input value={warehouse.unit} readOnly />
                </Field>

                <Field
                  label="Chiều dài kho"
                  note={`Mặc định danh mục: ${formatNumber(maxLengthFromCatalog)} m`}
                >
                  <Input
                    inputMode="decimal"
                    value={
                      warehouseLengthOverride === ""
                        ? maxLengthFromCatalog
                        : warehouseLengthOverride
                    }
                    onChange={(e) => setWarehouseLengthOverride(e.target.value)}
                  />
                </Field>

                <Field label="Chiều rộng chân tối đa">
                  <Input value={`${formatNumber(maxWidthForSelectedCoal)} m`} readOnly />
                </Field>

                <div className="block">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Loại than
                    </div>

                    <button
                      type="button"
                      onClick={() => setAllowAllCoalTypes((prev) => !prev)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      {allowAllCoalTypes ? "Theo kho" : "+ Chủng loại khác"}
                    </button>
                  </div>

                  <Select
                    value={coalName}
                    onChange={(e) => handleCoalChange(e.target.value)}
                  >
                    {availableCoalTypes.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </Select>

                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {allowAllCoalTypes
                      ? "Hiển thị toàn bộ chủng loại trong danh mục."
                      : "Hiển thị chủng loại đang khai báo trong kho."}
                  </div>
                </div>

                <Field label="Tỷ khối" note="Tự động theo loại than, có thể sửa nếu cần.">
                  <Input
                    inputMode="decimal"
                    value={
                      densityOverride === ""
                        ? selectedCoalType?.density ?? 0
                        : densityOverride
                    }
                    onChange={(e) => setDensityOverride(e.target.value)}
                  />
                </Field>

                <Field
                  label="Khối lượng TTCO_APP"
                  note={
                    ttcoSourceName
                      ? "Tự động lấy từ nguồn TTCO_APP. Vẫn có thể sửa tay nếu cần."
                      : "Có thể nhập tay, tải file Excel tồn kho xuất từ TTCO_APP hoặc tải dữ liệu JSON từ GitHub."
                  }
                >
                  <Input
                    inputMode="decimal"
                    placeholder="Ví dụ: 6500"
                    value={ttcoMass}
                    onChange={(e) => setTtcoMass(e.target.value)}
                  />
                </Field>

                <Field label="Khoảng cách mặt cắt">
                  <Input
                    inputMode="decimal"
                    value={sectionSpacing}
                    onChange={(e) => setSectionSpacing(e.target.value)}
                  />
                </Field>
              </div>
            </Panel>

            <Panel className="p-4 sm:p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black">
                    <Layers size={19} />
                    2. Các khối than cần tính
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Có thể chia nhỏ cùng một loại than thành nhiều khối để tăng độ chính xác.
                  </p>
                </div>

                <SmallButton onClick={addBlock} variant="dark">
                  <Plus size={16} />
                  Thêm khối
                </SmallButton>
              </div>

              <div className="space-y-4">
                {blocks.map((block, index) => {
                  const result = blockResults[index];

                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-base font-black">
                            Khối than {index + 1}
                          </div>

                          <div className="text-xs text-slate-500">
                            Nhập kích thước hình học của khối than.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          disabled={blocks.length <= 1}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Xóa
                        </button>
                      </div>

                      <div className="mb-4 grid gap-3 sm:grid-cols-2">
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                            block.lengthMode === "roller"
                              ? "border-slate-950 bg-white text-slate-950"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`lengthMode-${block.id}`}
                            checked={block.lengthMode === "roller"}
                            onChange={() => updateBlock(block.id, { lengthMode: "roller" })}
                          />
                          Theo giá con lăn
                        </label>

                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                            block.lengthMode === "manual"
                              ? "border-slate-950 bg-white text-slate-950"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`lengthMode-${block.id}`}
                            checked={block.lengthMode === "manual"}
                            onChange={() => updateBlock(block.id, { lengthMode: "manual" })}
                          />
                          Nhập chiều dài trực tiếp
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        {block.lengthMode === "roller" ? (
                          <>
                            <Field label="Từ giá con lăn">
                              <Input
                                inputMode="decimal"
                                value={block.rollerFrom}
                                onChange={(e) =>
                                  updateBlock(block.id, {
                                    rollerFrom: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field label="Đến giá con lăn">
                              <Input
                                inputMode="decimal"
                                value={block.rollerTo}
                                onChange={(e) =>
                                  updateBlock(block.id, {
                                    rollerTo: e.target.value,
                                  })
                                }
                              />
                            </Field>

                            <Field label="Chiều dài tính được">
                              <Input value={`${formatNumber(result.length)} m`} readOnly />
                            </Field>
                          </>
                        ) : (
                          <Field label="Chiều dài khối than">
                            <Input
                              inputMode="decimal"
                              value={block.manualLength}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  manualLength: e.target.value,
                                })
                              }
                            />
                          </Field>
                        )}

                        <Field label="Chiều rộng chân">
                          <Input
                            inputMode="decimal"
                            value={block.baseWidth}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                baseWidth: e.target.value,
                              })
                            }
                            placeholder={`≤ ${formatNumber(maxWidthForSelectedCoal)} m`}
                          />
                        </Field>

                        <Field label="Chiều rộng đỉnh">
                          <Input
                            inputMode="decimal"
                            value={block.topWidth}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                topWidth: e.target.value,
                              })
                            }
                          />
                        </Field>

                        <Field label="Chiều cao">
                          <Input
                            inputMode="decimal"
                            value={block.height}
                            onChange={(e) =>
                              updateBlock(block.id, {
                                height: e.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <ResultBox
                          label="Diện tích mặt cắt"
                          value={`${formatNumber(result.sectionArea)} m²`}
                        />

                        <ResultBox
                          label="Thể tích khối"
                          value={`${formatNumber(result.volume)} m³`}
                        />

                        <ResultBox
                          label="Số đoạn 2m ước tính"
                          value={
                            toNumber(sectionSpacing) > 0
                              ? formatNumber(result.length / toNumber(sectionSpacing), 1)
                              : "0"
                          }
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Panel>
          </section>

          <ResultSummaryPanel
            totalVolume={totalVolume}
            density={density}
            blockCount={blocks.length}
            actualMass={actualMass}
            appMass={appMass}
            diff={diff}
            diffRate={diffRate}
            warning={warning}
            WarningIcon={WarningIcon}
            onSave={saveCurrentResult}
          />

          <SavedResultsTable
            history={history}
            onDelete={deleteHistoryItem}
            onExport={exportHistoryToExcel}
          />

            <Panel className="p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                <Ruler size={19} />
                Kiểm tra dữ liệu
              </h2>

              {validationErrors.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
                  Dữ liệu hợp lệ để tính toán.
                </div>
              ) : (
                <div className="space-y-2">
                  {validationErrors.map((error, index) => (
                    <div
                      key={index}
                      className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              )}
            </Panel>

        </main>
      </div>
    </div>
  );
}