import { describe, expect, it } from "vitest";
import stockSnapshot from "../public/data/ton_kho_latest.json";
import {
  buildWarehouseListFromTTCO,
  getStandardKhoInfo,
  getTtcoCoalTypesForWarehouse,
  parseTTCOGitHubJson,
} from "./App.jsx";

describe("TTCO warehouse aliases", () => {
  it("maps verified raw DB codes without changing canonical warehouse labels", () => {
    for (const [source, expected] of [
      ["34", "Kho 35"], ["34A", "Kho 34"], ["35", "Kho 36"],
      ["36", "Kho 37"], ["75", "Kho 5-T4"], ["74", "Kho 4-T4"],
      ["Kho 34", "Kho 34"], ["Kho 35", "Kho 35"],
      ["Kho 36", "Kho 36"], ["Kho 5-T4", "Kho 5-T4"],
      ["KHO34", "Kho 34"], ["KHO35", "Kho 35"],
    ]) {
      expect(getStandardKhoInfo(source)?.name, source).toBe(expected);
    }
  });

  it("rejects technical and invalid warehouse codes", () => {
    expect(getStandardKhoInfo("K04")).toBeNull();
    expect(getStandardKhoInfo("46B")).toBeNull();
  });

  it("merges TTCO stocks into the right catalog warehouse without swapping 34, 35, 36 or 5 and 5-T4", () => {
    const excelWarehouses = [
      { id: "34", name: "Kho 34", maxLength: 34, areas: [], activeCoalNames: [] },
      { id: "35", name: "Kho 35", maxLength: 35, areas: [], activeCoalNames: [] },
      { id: "36", name: "Kho 36", maxLength: 36, areas: [], activeCoalNames: [] },
      { id: "05", name: "Kho 5", maxLength: 5, areas: [], activeCoalNames: [] },
      { id: "05-T4", name: "Kho 5-T4", maxLength: 55, areas: [], activeCoalNames: [] },
    ];
    const payload = { data: [
      { kho: "Kho 35", khoCode: "Kho 35", rawKhoCode: "34", coal: "Than NK (Úc - Tầu MV LIME MIA)", coalCode: "NHK.299", ton: 5848.84 },
      { kho: "Kho 5-T4", khoCode: "Kho 5-T4", rawKhoCode: "75", coal: "Cám 6a.1", coalCode: "11a.1", ton: 20213 },
    ] };
    const { records } = parseTTCOGitHubJson(payload, []);
    expect(records).toHaveLength(2);
    const warehouses = buildWarehouseListFromTTCO(records, excelWarehouses);
    expect(warehouses).toHaveLength(5);
    for (const [name, expectedLength, expectedCoalCount] of [
      ["Kho 34", 34, 0], ["Kho 35", 35, 1], ["Kho 36", 36, 0],
      ["Kho 5", 5, 0], ["Kho 5-T4", 55, 1],
    ]) {
      const warehouse = warehouses.find((item) => item.name === name);
      expect(warehouse, name).toBeDefined();
      expect(warehouse.maxLength, name).toBe(expectedLength);
      expect(warehouse.activeCoalNames, name).toHaveLength(expectedCoalCount);
    }
    const warehouse35 = warehouses.find((item) => item.name === "Kho 35");
    expect(getTtcoCoalTypesForWarehouse(warehouse35, records, [])).toEqual([
      { name: "Than NK (Úc - Tầu MV LIME MIA)", density: 0 },
    ]);
  });

  it("displays verified DB warehouse 28 as Kho 39 without accepting a technical pond or zero stock", () => {
    const payload = { data: [
      { kho: "Kho 39", khoCode: "Kho 39", rawKhoCode: "28", sourceFix: "KHO39_NHK_DETAIL", coal: "Than Anthracite Lào Tầu TRƯỜNG NGUYÊN OCEAN", coalCode: "NHK.305", ton: 1.89 },
      { kho: "Kho 39", khoCode: "Kho 39", rawKhoCode: "28", sourceFix: "KHO39_NHK_DETAIL", coal: "Than Anthracite Lào Tầu SKY", coalCode: "NHK.307", ton: 0 },
      { kho: "Hồ 1", khoCode: "Kho 39", rawKhoCode: "39", coal: "Than hồ kỹ thuật", coalCode: "NHK.999", ton: 200 },
      { kho: "Kho 28", khoCode: "Kho 28", rawKhoCode: "31C", coal: "Cám 6a.1", coalCode: "11a.1", ton: 50 },
    ] };

    const { records } = parseTTCOGitHubJson(payload, []);
    expect(records).toHaveLength(2);
    const warehouses = buildWarehouseListFromTTCO(records, []);
    const kho39 = warehouses.find((warehouse) => warehouse.name === "Kho 39");
    expect(kho39?.activeCoalNames).toEqual(["Than Anthracite Lào Tầu TRƯỜNG NGUYÊN OCEAN"]);
    expect(getTtcoCoalTypesForWarehouse(kho39, records, [])).toEqual([
      { name: "Than Anthracite Lào Tầu TRƯỜNG NGUYÊN OCEAN", density: 0 },
    ]);
    expect(records.find((record) => record.kho === "Kho 39")?.ton).toBe(1.89);
    expect(warehouses.find((warehouse) => warehouse.name === "Kho 28")?.activeCoalNames).toEqual(["Cám 6a.1"]);
  });

  it("retains all nonzero Kho 39 lines from the published stock snapshot", () => {
    const expected = stockSnapshot.data.filter((item) => item.kho === "Kho 39" && item.ton !== 0);
    expect(expected.length).toBeGreaterThan(0);

    const { records } = parseTTCOGitHubJson(stockSnapshot, []);
    const actual = records.filter((item) => item.kho === "Kho 39");
    expect(actual).toHaveLength(expected.length);
    expect(actual.reduce((total, item) => total + item.ton, 0)).toBeCloseTo(
      expected.reduce((total, item) => total + item.ton, 0), 5
    );
  });
});
