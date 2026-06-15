import { describe, expect, it } from "vitest";
import {
  classifyCalculationValidation,
  buildSaveMetadata,
  normalizeSavedHistoryRecord,
} from "../src/stockpileValidation.js";

describe("classifyCalculationValidation", () => {
  it("treats over-limit dimensions as non-blocking warnings", () => {
    const result = classifyCalculationValidation({
      density: 1.1,
      sectionSpacing: 2,
      maxLengthForSelectedCoal: 100,
      maxWidthForSelectedCoal: 20,
      blocks: [
        {
          length: 120,
          baseWidth: 25,
          topWidth: 10,
          height: 8,
        },
      ],
      formatNumber: (value) => String(value),
    });

    expect(result.blockingErrors).toEqual([]);
    expect(result.nonBlockingWarnings).toEqual([
      "Khối 1: chiều rộng chân không được lớn hơn 20 m.",
      "Khối 1: chiều dài không nên lớn hơn chiều dài kho 100 m.",
    ]);
  });

  it("keeps invalid numeric inputs as blocking errors", () => {
    const result = classifyCalculationValidation({
      density: 0,
      sectionSpacing: 0,
      maxLengthForSelectedCoal: 100,
      maxWidthForSelectedCoal: 20,
      blocks: [
        {
          length: 0,
          baseWidth: -1,
          topWidth: 4,
          height: 0,
        },
      ],
      formatNumber: (value) => String(value),
    });

    expect(result.blockingErrors).toContain(
      "Tỷ khối phải lớn hơn 0. Kiểm tra danh mục tỷ khối hoặc nhập thủ công."
    );
    expect(result.blockingErrors).toContain("Khoảng cách mặt cắt phải lớn hơn 0.");
    expect(result.nonBlockingWarnings).toEqual([]);
  });
});

describe("buildSaveMetadata", () => {
  it("marks records as limit_exceeded when non-blocking warnings exist", () => {
    expect(
      buildSaveMetadata([
        "Khối 1: chiều dài không nên lớn hơn chiều dài kho 100 m.",
      ])
    ).toEqual({
      saveStatus: "limit_exceeded",
      saveStatusLabel: "Vượt giới hạn",
      nonBlockingWarnings: [
        "Khối 1: chiều dài không nên lớn hơn chiều dài kho 100 m.",
      ],
    });
  });

  it("defaults to a valid status when no warning exists", () => {
    expect(buildSaveMetadata([])).toEqual({
      saveStatus: "valid",
      saveStatusLabel: "Hợp lệ",
      nonBlockingWarnings: [],
    });
  });
});

describe("normalizeSavedHistoryRecord", () => {
  it("adds safe defaults for legacy history rows", () => {
    expect(
      normalizeSavedHistoryRecord({
        warehouseName: "Kho 1",
        coalName: "Cám 6a.1",
      })
    ).toMatchObject({
      saveStatus: "valid",
      saveStatusLabel: "Hợp lệ",
      nonBlockingWarnings: [],
    });
  });
});
