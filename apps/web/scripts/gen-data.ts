/**
 * Build dữ liệu tĩnh từ /input/*.xlsx (cùng cấu trúc header).
 *
 * Đầu ra:
 *   data/records.json              -> bản ghi đầy đủ (server đọc cho trang chi tiết)
 *   public/index/<ORG>.json        -> index gọn để search phía client (theo org)
 *   public/qr/<id>.svg             -> mã VietQR pre-gen cho từng hồ sơ
 *
 * Chạy: pnpm gen:data  (trong apps/web)
 */
import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { buildVietQrSvg } from "../lib/vietqr";
import { RECEIVE, orgCodeForRow, COLUMN, buildCkContent, matchCanonicalField } from "../lib/config";
import { digitsOnly, isFreeOrEmpty, normalize } from "../lib/text";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.resolve(__dirname, "../../../input");
const DATA_DIR = path.resolve(__dirname, "../data");
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const INDEX_DIR = path.join(PUBLIC_DIR, "index");
const QR_DIR = path.join(PUBLIC_DIR, "qr");

type Cell = ExcelJS.CellValue;

function cellToString(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (typeof o.text === "string") return o.text.trim();
    if (Array.isArray(o.richText)) {
      return (o.richText as { text: string }[]).map((r) => r.text).join("").trim();
    }
    if ("result" in o) {
      const res = o.result;
      if (res == null || (typeof res === "object" && "error" in (res as object))) return "";
      return cellToString(res as Cell);
    }
    if ("error" in o) return "";
    if ("hyperlink" in o && typeof o.hyperlink === "string") return o.hyperlink.trim();
    return "";
  }
  return String(v).trim();
}

function getActiveWorksheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  for (const ws of wb.worksheets) {
    if (!ws) continue;
    if (ws.rowCount > 0 || ws.actualRowCount > 0) return ws;
    for (let r = 1; r <= 10; r++) {
      if (ws.getRow(r).cellCount > 0) return ws;
    }
  }
  return wb.worksheets[0];
}

/** Tìm dòng header: dòng chứa nhiều cột chuẩn nhất (Mã SV, Họ/Tên, Ngày sinh, Mã ngành...). */
function findHeaderRow(ws: ExcelJS.Worksheet): number {
  const totalRows = Math.max(ws.rowCount || 0, ws.actualRowCount || 0, 25);
  const max = Math.min(25, totalRows);
  let bestRow = 1;
  let maxScore = -1;

  for (let r = 1; r <= max; r++) {
    const row = ws.getRow(r);
    const uniqueFields = new Set<keyof typeof COLUMN>();
    const maxCols = Math.max(ws.columnCount || 0, row.cellCount || 0, 30);
    for (let c = 1; c <= maxCols; c++) {
      const val = cellToString(row.getCell(c).value);
      if (val) {
        const field = matchCanonicalField(val);
        if (field) uniqueFields.add(field);
      }
    }
    if (uniqueFields.size > maxScore) {
      maxScore = uniqueFields.size;
      bestRow = r;
    }
  }
  return maxScore > 0 ? bestRow : 1;
}

interface ParsedFile {
  columns: string[];
  rows: Record<string, string>[];
}

async function parseFile(file: string): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = getActiveWorksheet(wb);
  if (!ws) return { columns: [], rows: [] };

  const headerRowIdx = findHeaderRow(ws);
  const headerRow = ws.getRow(headerRowIdx);

  const colNameMap = new Map<number, string>();
  const columns: string[] = [];

  let hoColIdx: number | null = null;
  let tenColIdx: number | null = null;
  let nameColIdx: number | null = null;
  let masvColIdx: number | null = null;
  let dobColIdx: number | null = null;
  let maNganhColIdx: number | null = null;
  let nganhColIdx: number | null = null;
  let sotienColIdx: number | null = null;

  const maxCols = Math.max(ws.columnCount || 0, headerRow.cellCount || 0, 30);
  for (let c = 1; c <= maxCols; c++) {
    const origName = cellToString(headerRow.getCell(c).value);
    if (!origName) continue;

    colNameMap.set(c, origName);
    if (!columns.includes(origName)) columns.push(origName);

    const n = normalize(origName);
    if (n === "ho" || n === "ho va ten dem") hoColIdx = c;
    else if (n === "ten") tenColIdx = c;
    else if (n.includes("ho va ten") || n.includes("ho ten") || n === "thi sinh") nameColIdx = c;

    if (n === "ma sv" || n === "msv" || n.includes("ma sinh vien") || n.includes("cccd") || n.includes("sbd")) {
      masvColIdx = c;
    }
    if (n.includes("ngay sinh") || n === "dob" || n === "ns") dobColIdx = c;
    if (n.includes("ma nganh") || n === "manganh") maNganhColIdx = c;
    if (n.includes("ten nganh") || n === "nganh") nganhColIdx = c;
    if (n === "ky 2" || n.includes("ky 2") || n.includes("so tien") || n.includes("hoc phi") || n.includes("le phi")) {
      sotienColIdx = c;
    }
  }

  // Đảm bảo có cột "Họ và Tên" trong danh sách columns hiển thị
  if (!columns.includes(COLUMN.name)) {
    columns.unshift(COLUMN.name);
  }

  const rows: Record<string, string>[] = [];
  const lastRow = Math.max(ws.rowCount || 0, ws.actualRowCount || 0, headerRowIdx + 1000);

  for (let r = headerRowIdx + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    if (!row || row.cellCount === 0) continue;
    const obj: Record<string, string> = {};
    let hasValue = false;

    for (const [c, origName] of colNameMap) {
      const val = cellToString(row.getCell(c).value);
      if (val) hasValue = true;
      obj[origName] = val;
    }

    if (!hasValue) continue;

    // Bỏ qua nếu cột "Kỳ 2" bị rỗng, 0 hoặc miễn phí
    const sotienVal = sotienColIdx ? cellToString(row.getCell(sotienColIdx).value) : (obj[COLUMN.sotien] ?? obj["Kỳ 2"] ?? obj["Ky 2"] ?? "");
    if (isFreeOrEmpty(sotienVal)) continue;

    // Gộp "Họ" + "Tên" nếu tách biệt
    let fullName = "";
    if (hoColIdx != null || tenColIdx != null) {
      const ho = hoColIdx ? cellToString(row.getCell(hoColIdx).value) : "";
      const ten = tenColIdx ? cellToString(row.getCell(tenColIdx).value) : "";
      fullName = [ho, ten].filter(Boolean).join(" ");
    }
    if (!fullName && nameColIdx != null) {
      fullName = cellToString(row.getCell(nameColIdx).value);
    }

    obj[COLUMN.name] = fullName || obj[COLUMN.name] || "";
    if (masvColIdx != null) obj[COLUMN.cccd] = cellToString(row.getCell(masvColIdx).value);
    if (dobColIdx != null) obj[COLUMN.dob] = cellToString(row.getCell(dobColIdx).value);
    if (maNganhColIdx != null) obj[COLUMN.maNganh] = cellToString(row.getCell(maNganhColIdx).value);
    if (nganhColIdx != null) obj[COLUMN.nganh] = cellToString(row.getCell(nganhColIdx).value);
    if (sotienColIdx != null) obj[COLUMN.sotien] = sotienVal;

    rows.push(obj);
  }
  return { columns, rows };
}

/** Id ổn định, không lộ CCCD trực tiếp. */
function makeId(org: string, seed: string): string {
  return createHash("sha1").update(`${org}|${seed}`).digest("hex").slice(0, 10);
}

interface Record_ {
  org: string;
  content: string;
  photoUrl: string;
  data: Record<string, string>;
}

interface IndexItem {
  id: string;
  name: string;
  nganh: string;
  dob: string;
  cccd: string;
}

async function main() {
  const dataExists = existsSync(path.join(DATA_DIR, "records.json"));
  const files = existsSync(INPUT_DIR)
    ? readdirSync(INPUT_DIR)
      .filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith("~$"))
      .sort()
    : [];

  // Không có Excel: nếu đã có dữ liệu commit sẵn (vd khi build trên CI/Vercel)
  // thì giữ nguyên; chỉ báo lỗi khi vừa thiếu Excel vừa chưa có dữ liệu.
  if (files.length === 0) {
    if (dataExists) {
      console.warn("⚠️  Không có Excel trong input/ — giữ nguyên dữ liệu đã có (data/records.json).");
      return;
    }
    console.error(`❌ Chưa có Excel trong ${INPUT_DIR} và cũng chưa có data/records.json để dùng.`);
    process.exit(1);
  }

  // reset thư mục đầu ra
  rmSync(QR_DIR, { recursive: true, force: true });
  rmSync(INDEX_DIR, { recursive: true, force: true });
  mkdirSync(QR_DIR, { recursive: true });
  mkdirSync(INDEX_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  const records: Record<string, Record_> = {};
  const allColumns: string[] = [];
  const seenCol = new Set<string>();

  // Gộp theo org (org suy từ Mã ngành từng dòng — một file có thể trộn nhiều ngành).
  const indexByOrg = new Map<string, IndexItem[]>();
  const nganhCountByOrg = new Map<string, Map<string, number>>();

  let qrCount = 0;
  let qrFail = 0;
  const usedIds = new Set<string>();

  for (const file of files) {
    const { columns, rows } = await parseFile(path.join(INPUT_DIR, file));
    for (const c of columns) if (!seenCol.has(c)) (seenCol.add(c), allColumns.push(c));

    const perOrgInFile = new Map<string, number>();

    for (let i = 0; i < rows.length; i++) {
      const data = rows[i];
      const name = data[COLUMN.name] ?? "";
      const cccd = data[COLUMN.cccd] ?? "";
      const maNganh = data[COLUMN.maNganh] ?? "";
      const org = orgCodeForRow(maNganh, file);
      // Nội dung CK chuẩn mới: <CCCD>.NK26.<Mã ngành>; fallback giữ cột gốc
      const content = buildCkContent(cccd, maNganh) || (data[COLUMN.content] ?? "");
      const photoUrl = normalizeDriveUrl(data[COLUMN.photo] ?? "");
      const nganh = data[COLUMN.nganh] ?? "";
      const dob = data[COLUMN.dob] ?? "";
      const rawAmount = data[COLUMN.sotien] ?? "";
      const amount = Number(String(rawAmount).replace(/\D/g, "")) || 0;

      // id: ưu tiên CCCD, fallback name+index để luôn duy nhất.
      // org đã suy từ Mã ngành nên một thí sinh đăng ký nhiều ngành -> nhiều id khác nhau.
      let id = makeId(org, cccd || `${name}#${i}`);
      while (usedIds.has(id)) id = makeId(org, `${cccd || name}#${i}#${id}`);
      usedIds.add(id);

      records[id] = { org, content, photoUrl, data };

      const items = indexByOrg.get(org) ?? (indexByOrg.set(org, []).get(org)!);
      items.push({ id, name, nganh, dob, cccd });
      perOrgInFile.set(org, (perOrgInFile.get(org) ?? 0) + 1);

      if (nganh) {
        const nc = nganhCountByOrg.get(org) ?? (nganhCountByOrg.set(org, new Map()).get(org)!);
        nc.set(nganh, (nc.get(nganh) ?? 0) + 1);
      }

      // QR pre-gen
      const qr = await buildVietQrSvg({
        bank: RECEIVE.bankBin,
        account: RECEIVE.accountNumber,
        amount: amount,
        content,
      });
      if (qr) {
        writeFileSync(path.join(QR_DIR, `${id}.svg`), qr.svg, "utf8");
        qrCount++;
      } else {
        qrFail++;
      }
    }

    const breakdown = [...perOrgInFile.entries()]
      .map(([o, n]) => `${o}:${n}`)
      .join(", ");
    console.log(`✓ ${file}: ${rows.length} hồ sơ -> ${breakdown}`);
  }

  // Ghi index + thông tin org sau khi gộp toàn bộ file.
  const orgs: Record<string, { name: string; count: number }> = {};
  for (const [org, items] of indexByOrg) {
    const nganhCount = nganhCountByOrg.get(org) ?? new Map<string, number>();
    const orgName =
      [...nganhCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? org;
    orgs[org] = { name: orgName, count: items.length };
    writeFileSync(
      path.join(INDEX_DIR, `${org}.json`),
      JSON.stringify(items),
      "utf8",
    );
    console.log(`  org ${org} (${orgName}): ${items.length} hồ sơ`);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    receive: RECEIVE,
    columns: allColumns,
    orgs,
    records,
  };
  writeFileSync(path.join(DATA_DIR, "records.json"), JSON.stringify(out), "utf8");

  console.log(
    `\n✅ ${Object.keys(records).length} hồ sơ | QR: ${qrCount} ok${qrFail ? `, ${qrFail} lỗi` : ""} | ${Object.keys(orgs).length} org`,
  );
  console.log(`   Cột: ${allColumns.join(" | ")}`);
}

/** Đưa link Google Drive về dạng ảnh thumbnail nhúng được. */
function normalizeDriveUrl(url: string): string {
  if (!url) return "";
  const idMatch = url.match(/[?&]id=([\w-]+)/) || url.match(/\/d\/([\w-]+)/);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w600`;
  }
  return url;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
