const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoDir = process.cwd();
const appPath = path.join(repoDir, 'src', 'App.jsx');
const jsonPath = path.join(repoDir, 'public', 'data', 'ton_kho_latest.json');

function die(msg) { console.error('\n[LOI] ' + msg); process.exit(1); }
function run(cmd) { console.log('\n> ' + cmd); execSync(cmd, { stdio: 'inherit', shell: true }); }
function backup(file) {
  if (!fs.existsSync(file)) return;
  const stamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const bak = file + '.bak_v146_' + stamp;
  fs.copyFileSync(file, bak);
  console.log('[OK] Backup: ' + bak);
}
function replaceOrWarn(label, regex, replacement) {
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
    console.log('[OK] ' + label);
  } else {
    console.log('[CANH BAO] Khong tim thay mau de sua: ' + label);
  }
}

if (!fs.existsSync(appPath)) die('Khong tim thay src/App.jsx. Hay chay BAT trong thu muc goc repo my-ai-site/TTCO_TonKho_App_Repo.');
backup(appPath);
let code = fs.readFileSync(appPath, 'utf8');

// Version marker
if (!code.includes('Fix v1.4.6')) {
  code = code.replace(
    '// ====================================================== // TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO',
    '// ====================================================== // TTCO - APP TÍNH KHỐI LƯỢNG THAN TỒN KHO // Fix v1.4.6: Đọc đúng trường kho/chủng loại/tồn CK từ JSON TTCO, ưu tiên tên kho hiện hành và TonCK để tránh lệch Kho 39.'
  );
}

// Add helper aliases after getKhoCompareCode, if missing.
if (!code.includes('const pickFirstTextField = (item, fieldNames) =>')) {
  const insertAfter = /function getKhoCompareCode\(value\) \{ const standard = getStandardKhoInfo\(value\); return standard\?\.code \|\| normalizeKhoCode\(value\); \}/;
  const helpers = `$&
const pickFirstTextField = (item, fieldNames) => {
  for (const name of fieldNames) {
    if (!item || !(name in item)) continue;
    const value = normalizeText(item[name]);
    if (value) return value;
  }
  return "";
};
const pickFirstNumberField = (item, fieldNames) => {
  for (const name of fieldNames) {
    if (!item || !(name in item)) continue;
    const raw = item[name];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;
    const value = toNumber(raw);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};
const getStrictTTCOStandardKho = (rawKhoName, rawKhoCode) => {
  const byName = getStandardKhoInfo(rawKhoName);
  if (byName) return byName;
  // MaKho chỉ dùng dự phòng khi JSON không có tên kho đọc được.
  return getStandardKhoInfo(rawKhoCode);
};`;
  replaceOrWarn('Them helper doc alias truong JSON TTCO', insertAfter, helpers);
}

// Replace raw field extraction in parseTTCOGitHubJson.
const oldParseBlock = /const rawKhoName = item\.TenKho \?\? item\.ten_kho \?\? item\.kho \?\? item\.Kho \?\? "";\s*const rawKhoCode = item\.MaKho \?\? item\.ma_kho \?\? item\.khoCode \?\? item\.code \?\? "";[\s\S]*?const standardKho = getStandardKhoInfo\(rawKhoName\) \|\| getStandardKhoInfo\(rawKhoCode\); if \(!standardKho\) return null; const maKho = standardKho\.code; const tenKho = standardKho\.name; const maThan = normalizeText\(item\.MaThan \?\? item\.ma_than \?\? item\.coalCode\); const tenThan = normalizeText\(item\.TenThan \?\? item\.ten_than \?\? item\.coal \?\? item\.LoaiThan\) \|\| maThan; const ton = toNumber\(item\.TonCuoiKy \?\? item\.TonCK \?\? item\.ton \?\? item\.ton_cuoi_ky\);/;
const newParseBlock = `const rawKhoName = pickFirstTextField(item, [
        "TenKho", "tenKho", "ten_kho", "TENKHO", "Kho", "kho", "KhoThan", "TenKhoThan", "Tên kho", "Kho than", "ttinKho"
      ]);
      const rawKhoCode = pickFirstTextField(item, [
        "MaKho", "maKho", "ma_kho", "MAKHO", "khoCode", "code", "Mã kho"
      ]);
      // V146: ưu tiên tên kho hiện hành TTCO_APP. MaKho chỉ là dự phòng.
      // Lý do: một số MaKho phụ/DB có thể làm lệch Kho 27/29/30/39 nếu map theo mã trước.
      const standardKho = getStrictTTCOStandardKho(rawKhoName, rawKhoCode);
      if (!standardKho) return null;
      const maKho = standardKho.code;
      const tenKho = standardKho.name;
      const maThan = pickFirstTextField(item, ["MaThan", "maThan", "ma_than", "MATHAN", "coalCode", "Mã than"]);
      const tenThan = pickFirstTextField(item, [
        "TenThanChuan", "tenThanChuan", "ChungLoai", "chung_loai", "TenThan", "tenThan", "ten_than", "TENTHAN", "coal", "LoaiThan", "loaiThan", "Tên than", "Loại than", "ttinThan"
      ]) || maThan;
      // V146: TonCK là tồn cuối kỳ đang hiển thị trên TTCO_APP; không ưu tiên TonCuoiKy nếu JSON đồng thời có nhiều cột tồn.
      const ton = pickFirstNumberField(item, [
        "TonCK", "Ton_CK", "ton_ck", "TonCuoiKy", "ton_cuoi_ky", "TonKho", "ton", "Klg_Tan", "KlgTan", "KhoiLuong", "Khối lượng", "ttcoApp"
      ]);`;
replaceOrWarn('Sua parseTTCOGitHubJson doc TenKho/TenThan/TonCK bang alias chat che', oldParseBlock, newParseBlock);

// Make raw debug fields use normalized raw names after parse block (support if not already present).
code = code.replace(/rawKhoCode: normalizeKhoCode\(rawKhoCode\), rawKhoName: normalizeText\(rawKhoName\),/g,
  'rawKhoCode: normalizeKhoCode(rawKhoCode), rawKhoName: normalizeText(rawKhoName),');

// Make validator prefer record.kho name first.
code = code.replace(/if \(!getStandardKhoInfo\(record\.khoCode \|\| record\.kho\)\) return false;/g,
  'if (!getStandardKhoInfo(record.kho) && !getStandardKhoInfo(record.khoCode)) return false;');

// In buildWarehouseListFromTTCO, prefer record.kho name first (if previous v145 didn't fully apply).
code = code.replace(/const standardKho = getStandardKhoInfo\(record\.khoCode\) \|\| getStandardKhoInfo\(record\.kho\);/g,
  'const standardKho = getStandardKhoInfo(record.kho) || getStandardKhoInfo(record.khoCode);');

// In dropdown and matched mass, compare both exact name and code but do not let a wrong code override exact name.
code = code.replace(/const itemCode = getKhoCompareCode\(item\.khoCode \|\| item\.kho\); const sameKho = itemCode === warehouseCode \|\| normalizeKey\(item\.kho\) === warehouseNameKey;/g,
  'const itemCode = getKhoCompareCode(item.kho || item.khoCode); const sameKho = normalizeKey(item.kho) === warehouseNameKey || itemCode === warehouseCode;');

// Extra filter: reject ambiguous rows where rawKhoName exists but normalized name contradicts computed display name.
if (!code.includes('const isRecordKhoNameConsistent = (record) =>')) {
  const anchor = /const isValidCurrentTtcoStockRecord = \(record\) => \{/;
  const helper = `const isRecordKhoNameConsistent = (record) => {
  const rawName = normalizeText(record?.rawKhoName);
  if (!rawName) return true;
  const rawStandard = getStandardKhoInfo(rawName);
  const finalStandard = getStandardKhoInfo(record?.kho);
  if (!rawStandard || !finalStandard) return true;
  return rawStandard.code === finalStandard.code;
};
$&`;
  replaceOrWarn('Them kiem tra nhat quan raw TenKho', anchor, helper);
}
code = code.replace(/if \(toNumber\(record\.ton\) <= 0\) return false;/g,
  'if (toNumber(record.ton) <= 0) return false; if (!isRecordKhoNameConsistent(record)) return false;');

fs.writeFileSync(appPath, code, 'utf8');
console.log('[OK] Da ghi src/App.jsx');

// Generate local audit files from JSON with the same v146 field aliases (independent of React helpers).
function norm(v) { return String(v ?? '').trim(); }
function num(v) {
  const t = String(v ?? '').trim();
  if (!t) return 0;
  let s = t;
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function firstText(obj, names) { for (const n of names) { if (obj && Object.prototype.hasOwnProperty.call(obj,n) && norm(obj[n])) return norm(obj[n]); } return ''; }
function firstNum(obj, names) { for (const n of names) { if (obj && Object.prototype.hasOwnProperty.call(obj,n) && norm(obj[n]) !== '') return num(obj[n]); } return 0; }
function csv(v) { return '"' + String(v ?? '').replace(/"/g,'""') + '"'; }
if (fs.existsSync(jsonPath)) {
  try {
    const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const rows = Array.isArray(payload.data) ? payload.data : [];
    const audit = rows.map((r, idx) => {
      const TenKho = firstText(r,["TenKho","tenKho","ten_kho","TENKHO","Kho","kho","KhoThan","TenKhoThan","Tên kho","Kho than","ttinKho"]);
      const MaKho = firstText(r,["MaKho","maKho","ma_kho","MAKHO","khoCode","code","Mã kho"]);
      const TenThan = firstText(r,["TenThanChuan","tenThanChuan","ChungLoai","chung_loai","TenThan","tenThan","ten_than","TENTHAN","coal","LoaiThan","loaiThan","Tên than","Loại than","ttinThan"]);
      const MaThan = firstText(r,["MaThan","maThan","ma_than","MATHAN","coalCode","Mã than"]);
      const TonCK = firstNum(r,["TonCK","Ton_CK","ton_ck","TonCuoiKy","ton_cuoi_ky","TonKho","ton","Klg_Tan","KlgTan","KhoiLuong","Khối lượng","ttcoApp"]);
      return {idx: idx+1, MaKho, TenKho, MaThan, TenThan, TonCK, keys: Object.keys(r).join('|')};
    }).filter(x => x.TenKho || x.MaKho || x.TenThan || x.TonCK);
    const header = 'STT_JSON,MaKho,TenKho,MaThan,TenThan,TonCK,Keys';
    fs.writeFileSync(path.join(repoDir,'TTCO_AUDIT_TON_KHO_V146.csv'), [header].concat(audit.map(r => [r.idx,r.MaKho,r.TenKho,r.MaThan,r.TenThan,r.TonCK,r.keys].map(csv).join(','))).join('\r\n'), 'utf8');
    const k39 = audit.filter(r => /(^|\D)39(\D|$)/.test(r.TenKho) || /(^|\D)39(\D|$)/.test(r.MaKho));
    fs.writeFileSync(path.join(repoDir,'TTCO_AUDIT_KHO39_V146.csv'), [header].concat(k39.map(r => [r.idx,r.MaKho,r.TenKho,r.MaThan,r.TenThan,r.TonCK,r.keys].map(csv).join(','))).join('\r\n'), 'utf8');
    console.log('[OK] Da tao audit: TTCO_AUDIT_TON_KHO_V146.csv va TTCO_AUDIT_KHO39_V146.csv');
  } catch (e) { console.log('[CANH BAO] Khong tao duoc audit JSON: ' + e.message); }
}

run('npm run build');
try { run('git status --short'); } catch {}
try { run('git add src/App.jsx TTCO_AUDIT_TON_KHO_V146.csv TTCO_AUDIT_KHO39_V146.csv'); } catch { run('git add src/App.jsx'); }
try { run('git commit -m "Fix strict TTCO stock fields and Kho39 parsing v146"'); }
catch (e) { console.log('[INFO] Khong co thay doi moi de commit hoac commit bi bo qua.'); }
run('git push origin main');
console.log('\n[HOAN TAT] Da sua V146 va push GitHub. Mo web, bam Ctrl+F5, sau do kiem tra lai Kho 39.');
