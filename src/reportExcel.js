import * as XLSX from "xlsx-js-style";
import { warningReasonsText } from "./stockpileValidation.js";

const REPORT_HEADERS = [
  "STT",
  "Tên kho",
  "Đơn vị quản lý",
  "Chủng loại than",
  "Thể tích than thực tế\n(m3)",
  "Khối lượng than thực tế (tấn)",
  "Khối lượng tồn kho thống kê\n(tấn)",
  "Chênh lệch (tấn)",
  "Thời gian tính toán",
  "Ghi chú",
];

const border = {
  top: { style: "thin", color: { rgb: "000000" } },
  bottom: { style: "thin", color: { rgb: "000000" } },
  left: { style: "thin", color: { rgb: "000000" } },
  right: { style: "thin", color: { rgb: "000000" } },
};
const font = { name: "Times New Roman", sz: 12 };
const bodyStyle = {
  font,
  border,
  alignment: { vertical: "center", wrapText: true },
};

const savedNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const savedDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("vi-VN");
};

export function createReportSheet(history, reportDate = new Date()) {
  const rows = [
    ["CÔNG TY TUYỂN THAN CỬA ÔNG - TKV", null, null, null, null, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"],
    ["PHÒNG KỸ THUẬT CÔNG NGHỆ", null, null, null, null, "Độc lập - Tự do - Hạnh phúc"],
    [],
    ["BÁO CÁO"],
    ["Tính toán khối lượng than tồn kho"],
    [`(Ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()})`],
    [],
    REPORT_HEADERS,
    ...history.map((item, index) => [
      index + 1,
      item.warehouseName || "",
      item.unit || "",
      item.coalName || "",
      savedNumber(item.totalVolume),
      savedNumber(item.actualMass),
      savedNumber(item.ttcoMass),
      savedNumber(item.diff),
      savedDate(item.updatedAt || item.savedAt),
      warningReasonsText(item),
    ]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
    ...[3, 4, 5].map((r) => ({ s: { r, c: 0 }, e: { r, c: 9 } })),
  ];
  sheet["!cols"] = [6.86, 17.5, 17.5, 14.79, 12.07, 12.86, 15.43, 13.79, 18.79, 12.86]
    .map((wch) => ({ wch }));
  sheet["!rows"] = rows.map((_, index) => ({
    hpt: index === 7 ? 72.75 : index === 0 ? 27 : index > 7 ? 30 : 18.75,
  }));

  for (const [address, size] of [["A1", 12], ["F1", 12], ["A2", 12], ["F2", 12], ["A4", 16], ["A5", 14], ["A6", 12]]) {
    sheet[address].s = {
      font: { ...font, sz: size, bold: address !== "A6" },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    };
  }

  for (let row = 8; row <= rows.length; row += 1) {
    for (let col = 0; col < REPORT_HEADERS.length; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row - 1, c: col });
      const cell = sheet[address] || (sheet[address] = { t: "z" });
      cell.s = row === 8
        ? { ...bodyStyle, font: { ...font, bold: true }, alignment: { horizontal: "center", vertical: "center", wrapText: true } }
        : { ...bodyStyle, alignment: { ...bodyStyle.alignment, horizontal: col === 0 || col === 8 ? "center" : col >= 4 && col <= 7 ? "right" : "left" } };
      if (row > 8 && col >= 4 && col <= 7) cell.z = "#,##0.00";
    }
  }

  return sheet;
}
