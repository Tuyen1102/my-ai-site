const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoDir = process.cwd();
const appPath = path.join(repoDir, 'src', 'App.jsx');
const jsonPath = path.join(repoDir, 'public', 'data', 'ton_kho_latest.json');

function die(msg) {
  console.error('\n[LOI] ' + msg);
  process.exit(1);
}
function run(cmd) {
  console.log('\n> ' + cmd);
  execSync(cmd, { stdio: 'inherit', shell: true });
}
function backup(file) {
  if (!fs.existsSync(file)) return;
  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const bak = file + '.bak_v145_' + stamp;
  fs.copyFileSync(file, bak);
  console.log('[OK] Backup: ' + bak);
}

if (!fs.existsSync(appPath)) die('Khong tim thay src/App.jsx. Hay chay file BAT trong thu muc goc repo.');
backup(appPath);
let code = fs.readFileSync(appPath, 'utf8');

// 1) Mark version comment.
if (!code.includes('Fix v1.4.5')) {
  code = code.replace(
    '// ====================================================== // TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO',
    '// ====================================================== // TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO // Fix v1.4.5: Rà soát nguồn tồn kho theo TenKho/TonCK TTCO_JSON, không ưu tiên mã kho phụ gây lệch chủng loại.'
  );
}

// 2) Make parseTTCOGitHubJson trust TenKho/kho first, MaKho only as fallback.
const oldKhoBlock = /const\s+standardKho\s*=\s*getStandardKhoInfo\(\s*item\.MaKho\s*\?\?\s*item\.ma_kho\s*\?\?\s*item\.khoCode\s*\?\?\s*item\.TenKho\s*\?\?\s*item\.ten_kho\s*\?\?\s*item\.kho\s*\);\s*if\s*\(!standardKho\)\s*return\s+null;\s*const\s+maKho\s*=\s*standardKho\.code;\s*const\s+tenKho\s*=\s*tenKhoByCode\.get\(maKho\)\s*\|\|\s*standardKho\.name;/;
const newKhoBlock = `const rawKhoName = item.TenKho ?? item.ten_kho ?? item.kho ?? item.Kho ?? "";
      const rawKhoCode = item.MaKho ?? item.ma_kho ?? item.khoCode ?? item.code ?? "";
      // Ưu tiên TenKho/kho đã xuất ra từ nguồn TTCO_APP/JSON. MaKho chỉ dùng làm dự phòng.
      // Việc ưu tiên MaKho trước có thể làm các kho 26-30 bị map nhầm chủng loại/tồn kho.
      const standardKho = getStandardKhoInfo(rawKhoName) || getStandardKhoInfo(rawKhoCode);
      if (!standardKho) return null;
      const maKho = standardKho.code;
      const tenKho = standardKho.name;`;
if (oldKhoBlock.test(code)) {
  code = code.replace(oldKhoBlock, newKhoBlock);
  console.log('[OK] Sua parseTTCOGitHubJson: uu tien TenKho/kho truoc MaKho.');
} else {
  console.log('[CANH BAO] Khong tim thay block parse kho dung mau. Co the da duoc sua truoc do.');
}

// 3) Add raw source fields for audit/debug.
if (!code.includes('rawKhoCode: normalizeKhoCode(rawKhoCode)')) {
  code = code.replace(
    /rowNumber:\s*"",\s*isNhomTongHop:/,
    'rowNumber: "", rawKhoCode: normalizeKhoCode(rawKhoCode), rawKhoName: normalizeText(rawKhoName), isNhomTongHop:'
  );
  console.log('[OK] Bo sung rawKhoCode/rawKhoName de audit.');
}

// 4) Add common stock record validator after toNumber.
if (!code.includes('const isTtcoDisplayStockRecord = (record) =>')) {
  const toNumberPattern = /const\s+toNumber\s*=\s*\(value\)\s*=>\s*\{[\s\S]*?return\s+Number\.isFinite\(n\)\s*\?\s*n\s*:\s*0;\s*\};/;
  const validator = `$&
const isTtcoDisplayStockRecord = (record) => {
  if (!record) return false;
  if (!normalizeText(record.khoCode || record.kho)) return false;
  if (!normalizeText(record.coal)) return false;
  if (toNumber(record.ton) <= 0) return false;

  const coalBase = normalizeCoalBase(record.coal);
  const genericCoalNames = new Set([
    "than nk",
    "than nhập khẩu",
    "than nhap khau",
    "than anthracite",
  ]);
  if (genericCoalNames.has(coalBase)) return false;
  if (coalBase.startsWith("than anthracite")) return false;

  return true;
};`;
  if (toNumberPattern.test(code)) {
    code = code.replace(toNumberPattern, validator);
    console.log('[OK] Them bo loc ban ghi ton kho hop le.');
  } else {
    console.log('[CANH BAO] Khong chen duoc bo loc isTtcoDisplayStockRecord.');
  }
}

// 5) Apply validator in parse rawRecords.
code = code.replace(
  /\.filter\(\(item\)\s*=>\s*item\?\.khoCode\s*&&\s*item\.coal\);/,
  '.filter((item) => item?.khoCode && item.coal && isTtcoDisplayStockRecord(item));'
);

// 6) Apply validator in dropdown / warehouse list / matched mass loops.
code = code.replace(
  /for \(const item of ttcoRecords\) \{\s*const itemCode = getKhoCompareCode\(item\.khoCode \|\| item\.kho\);/g,
  'for (const item of ttcoRecords) { if (!isTtcoDisplayStockRecord(item)) continue; const itemCode = getKhoCompareCode(item.khoCode || item.kho);'
);
code = code.replace(
  /const matched = ttcoRecords\.filter\(\(item\) => \{\s*const itemCode = getKhoCompareCode\(item\.khoCode \|\| item\.kho\);/,
  'const matched = ttcoRecords.filter((item) => { if (!isTtcoDisplayStockRecord(item)) return false; const itemCode = getKhoCompareCode(item.khoCode || item.kho);'
);
code = code.replace(
  /for \(const record of ttcoRecords\) \{\s*const standardKho = getStandardKhoInfo\(record\.khoCode\) \|\| getStandardKhoInfo\(record\.kho\);/g,
  'for (const record of ttcoRecords) { if (!isTtcoDisplayStockRecord(record)) continue; const standardKho = getStandardKhoInfo(record.kho) || getStandardKhoInfo(record.khoCode);'
);

fs.writeFileSync(appPath, code, 'utf8');
console.log('[OK] Da ghi src/App.jsx');

// 7) Optional local audit CSV from current JSON.
function normText(v) { return String(v ?? '').trim(); }
function toNum(v) {
  const t = String(v ?? '').trim();
  if (!t) return 0;
  let s = t;
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }
if (fs.existsSync(jsonPath)) {
  try {
    const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const auditRows = rows.map((r) => ({
      MaKho: normText(r.MaKho ?? r.ma_kho ?? r.khoCode),
      TenKho: normText(r.TenKho ?? r.ten_kho ?? r.kho),
      MaThan: normText(r.MaThan ?? r.ma_than ?? r.coalCode),
      TenThan: normText(r.TenThan ?? r.ten_than ?? r.coal),
      TonCK: toNum(r.TonCK ?? r.TonCuoiKy ?? r.ton ?? r.ttcoApp),
      TonDK: toNum(r.TonDK),
      NhapTK: toNum(r.NhapTK),
      XuatTK: toNum(r.XuatTK),
      TenThanGoc: normText(r.TenThanGoc),
      ttinKho: normText(r.ttinKho),
      ttinThan: normText(r.ttinThan),
    })).filter(r => r.TenKho && r.TenThan && r.TonCK > 0);
    const out = ['MaKho,TenKho,MaThan,TenThan,TonCK,TonDK,NhapTK,XuatTK,TenThanGoc,ttinKho,ttinThan']
      .concat(auditRows.map(r => [r.MaKho,r.TenKho,r.MaThan,r.TenThan,r.TonCK,r.TonDK,r.NhapTK,r.XuatTK,r.TenThanGoc,r.ttinKho,r.ttinThan].map(csvCell).join(',')))
      .join('\r\n');
    const auditPath = path.join(repoDir, 'TTCO_AUDIT_TON_KHO_FROM_JSON.csv');
    fs.writeFileSync(auditPath, out, 'utf8');
    console.log('[OK] Da tao file audit: ' + auditPath);
  } catch (err) {
    console.log('[CANH BAO] Khong tao duoc audit CSV: ' + err.message);
  }
}

// 8) Build and push.
run('npm run build');
try { run('git status --short'); } catch {}
try { run('git add src/App.jsx TTCO_AUDIT_TON_KHO_FROM_JSON.csv'); } catch { run('git add src/App.jsx'); }
try { run('git commit -m "Fix TTCO stock warehouse coal source parsing v145"'); }
catch (err) { console.log('[INFO] Khong co thay doi moi de commit hoac commit bi bo qua.'); }
run('git push origin main');
console.log('\n[HOAN TAT] Da sua logic lay TenKho tu JSON va push len GitHub. Hay mo web va bam Ctrl+F5.');
