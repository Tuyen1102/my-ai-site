const assert = require("node:assert/strict");
const { chromium } = require(process.argv[2] || "playwright");

// Run against the local Vite server; the real component consumes controlled JSON.
const payload = { meta: { NamHT: 2026, ThangTu: 10, ThangDen: 10 }, data: [
  { kho: "Kho 10", rawKhoCode: "10", coal: "Cám 5a.14", ton: 3808 },
  { kho: "Kho 26", rawKhoCode: "29", coal: "Cám 6a.1", ton: 101 },
  { kho: "Kho 29", rawKhoCode: "26", coal: "Cám 6b.1", ton: 202 },
  { kho: "Kho 30", rawKhoCode: "27", coal: "Cám 7a.1", ton: 303 },
] };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: process.argv[3] || undefined });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route("**/data/ton_kho_latest.json*", (route) => route.fulfill({ status: 503 }));
      await page.goto("http://127.0.0.1:5188/my-ai-site/");
      await page.waitForLoadState("networkidle");
      await page.getByText("Không đọc được file ton_kho_latest.json trên GitHub Pages.").waitFor();
      assert.equal(await page.getByPlaceholder("Ví dụ: 6500").inputValue(), "", "Failed loads must not imply zero stock");
      await page.unroute("**/data/ton_kho_latest.json*");
      await page.route("**/data/ton_kho_latest.json*", (route) => route.fulfill({ json: payload }));
      await page.goto("http://127.0.0.1:5188/my-ai-site/");
      await page.waitForLoadState("networkidle");
      await page.getByText(/Đã tải TTCO_APP:/).waitFor();
      const warehouse = page.locator("select").nth(0);
      const mass = page.getByPlaceholder("Ví dụ: 6500");
      for (const [name, expected] of [
        ["Kho 1", "0"], ["Kho 10", "3808"], ["Kho 26", "101"],
        ["Kho 29", "202"], ["Kho 30", "303"], ["Kho 1", "0"],
      ]) {
        await warehouse.selectOption({ label: name });
        // React selection and autofill effects run after the select event.
        await page.waitForFunction((value) =>
          document.querySelector('input[placeholder="Ví dụ: 6500"]').value === value,
        expected, { timeout: 5000 });
        assert.equal(await mass.inputValue(), expected, `${viewport.width}px / ${name}`);
      }
      await warehouse.selectOption({ label: "Kho 10" });
      await page.waitForFunction(() => document.querySelector('input[placeholder="Ví dụ: 6500"]').value === "3808");
      await page.unroute("**/data/ton_kho_latest.json*");
      await page.route("**/data/ton_kho_latest.json*", (route) => route.fulfill({ status: 503 }));
      await page.getByRole("button", { name: "Tải dữ liệu từ GitHub", exact: true }).click();
      await page.getByText("Không đọc được file ton_kho_latest.json trên GitHub Pages.").waitFor();
      assert.equal(await mass.inputValue(), "", "Failed refresh must clear prior positive stock");
      assert.equal(await page.getByText(/Đã tải TTCO_APP:/).count(), 0, "Failed refresh must clear prior source");
      await warehouse.selectOption({ label: "Kho 1" });
      assert.equal(await mass.inputValue(), "", "Stale snapshots must not imply zero stock");
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${viewport.width}px: missing stock = 0; positive stocks and warehouse aliases autofill correctly.`);
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
