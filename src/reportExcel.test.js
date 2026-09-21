import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import * as PlainXLSX from "xlsx";
import { createReportSheet } from "./reportExcel.js";

describe("saved coal-stock report worksheet", () => {
  it("matches the supplied 10-column report and uses saved measurement snapshots", () => {
    const sheet = createReportSheet([
      {
        savedAt: "2026-09-20T03:00:00.000Z",
        updatedAt: "2026-09-21T04:00:00.000Z",
        warehouseName: "Kho 35",
        unit: "PX Kho Bến",
        coalName: "Than NK Úc",
        totalVolume: 8000.25,
        actualMass: 10000.5,
        ttcoMass: 9500.25,
        diff: 500.25,
        nonBlockingWarnings: ["Chiều rộng vượt giới hạn"],
      },
      {
        savedAt: "2026-09-20T06:00:00.000Z",
        warehouseName: "Kho 5-T4",
        unit: "PX Kho 4",
        coalName: "Cám 6a.1",
        totalVolume: 0,
        actualMass: 0,
        ttcoMass: 0,
        diff: 0,
      },
    ], new Date(2026, 8, 21));

    expect(sheet["!ref"]).toBe("A1:J10");
    expect(sheet["!merges"]).toHaveLength(7);
    expect(sheet.A1.v).toBe("CÔNG TY TUYỂN THAN CỬA ÔNG - TKV");
    expect(sheet.A6.v).toContain("21 tháng 9 năm 2026");
    expect(sheet.D8.v).toBe("Chủng loại than");
    expect(sheet.J8.v).toBe("Ghi chú");
    expect([sheet.A9.v, sheet.B9.v, sheet.C9.v, sheet.D9.v]).toEqual([
      1, "Kho 35", "PX Kho Bến", "Than NK Úc",
    ]);
    expect([sheet.E9.v, sheet.F9.v, sheet.G9.v, sheet.H9.v]).toEqual([
      8000.25, 10000.5, 9500.25, 500.25,
    ]);
    expect(sheet.I9.v).toBe(new Date("2026-09-21T04:00:00.000Z").toLocaleString("vi-VN"));
    expect(sheet.J9.v).toContain("Chiều rộng vượt giới hạn");
    expect([sheet.A10.v, sheet.F10.v, sheet.G10.v, sheet.H10.v]).toEqual([2, 0, 0, 0]);
  });

  it("keeps header, borders and numeric formats when written to Excel", async () => {
    const XLSX = await import("xlsx-js-style");
    const sheet = createReportSheet([
      { savedAt: "2026-09-21T03:00:00Z", actualMass: 1234.56, ttcoMass: 34.5, diff: 1200.06 },
    ], new Date(2026, 8, 21));
    const book = PlainXLSX.utils.book_new();
    for (const name of ["Tong_hop", "Chi_tiet_khoi", "Du_lieu_TTCO_APP"]) {
      PlainXLSX.utils.book_append_sheet(book, PlainXLSX.utils.aoa_to_sheet([[name]]), name);
    }
    PlainXLSX.utils.book_append_sheet(book, sheet, "Bao cao");
    const bytes = XLSX.write(book, { bookType: "xlsx", type: "buffer" });
    const result = XLSX.read(bytes, { type: "buffer", cellStyles: true, cellNF: true });
    const stylesXml = strFromU8(unzipSync(bytes)["xl/styles.xml"]);
    expect(result.SheetNames).toEqual(["Tong_hop", "Chi_tiet_khoi", "Du_lieu_TTCO_APP", "Bao cao"]);
    expect(result.Sheets.Tong_hop.A1.v).toBe("Tong_hop");
    expect(stylesXml).toMatch(/<border><left style="thin">/);
    expect(result.Sheets["Bao cao"].F9.z).toBe("#,##0.00");
    expect(result.Sheets["Bao cao"].F9.v).toBe(1234.56);
    expect(result.Sheets["Bao cao"]["!merges"]).toHaveLength(7);
  });
});
