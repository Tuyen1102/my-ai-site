import { describe, expect, it } from "vitest";
import stockSnapshot from "../public/data/ton_kho_latest.json";
import { getTtcoCoalTypesForWarehouse, parseTTCOGitHubJson } from "./App.jsx";

describe("TTCO inventory display", () => {
  it("keeps verified warehouse aliases available for stock comparison", () => {
    const data = [
      { kho: "Kho 26", rawKhoCode: "29", coal: "Cám 6a.1", ton: 101 },
      { kho: "Kho 29", rawKhoCode: "26", coal: "Cám 6b.1", ton: 202 },
      { kho: "Kho 30", rawKhoCode: "27", coal: "Cám 7a.1", ton: 303 },
    ];
    const { records } = parseTTCOGitHubJson({ data }, []);
    expect(records).toHaveLength(3);
    for (const row of data) {
      expect(records.find((item) => item.kho === row.kho)?.ton).toBe(row.ton);
      expect(getTtcoCoalTypesForWarehouse({ name: row.kho }, records, [])).toEqual([
        { name: row.coal, density: 0 },
      ]);
    }
  });

  it("continues rejecting unverified warehouse mismatches", () => {
    const { records } = parseTTCOGitHubJson({ data: [
      { kho: "Kho 26", rawKhoCode: "27", coal: "Cám 6a.1", ton: 100 },
      { kho: "Kho 29", rawKhoCode: "27", coal: "Cám 6a.1", ton: 200 },
      { kho: "Hồ 1", rawKhoCode: "29", coal: "Cám 6a.1", ton: 300 },
      { kho: "Kho 1", rawKhoCode: "01", coal: "Cám 6a.1", ton: 400 },
    ] }, []);
    expect(records.map((row) => row.kho)).toEqual(["Kho 1"]);
  });

  it("preserves nonzero product stocks from the rebuilt snapshot", () => {
    const expected = stockSnapshot.data.filter((row) => row.ton !== 0);
    const { records } = parseTTCOGitHubJson(stockSnapshot, []);
    for (const row of expected) {
      const actual = records.find((item) => item.kho === row.kho && item.coal === row.coal);
      expect(actual?.ton, `${row.kho} / ${row.coal}`).toBe(row.ton);
    }
  });
});
