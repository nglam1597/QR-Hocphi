/**
 * Preflight cho input/*.xlsx TRƯỚC khi chạy gen:data.
 *
 * Bắt sớm 2 lỗi hay gặp khi thêm danh sách mới:
 *   1) Thiếu cột bắt buộc (đổi tên header) -> hồ sơ ra rỗng.
 *   2) "Mã ngành" lạ (chưa map) -> rơi vào org fallback theo tên file => tạo org rác.
 *
 * Chạy: pnpm check:data   (exit != 0 nếu có lỗi)
 */
import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readdirSync, existsSync } from "node:fs";
import { MA_NGANH_TO_ORG, orgCodeForRow, COLUMN, matchCanonicalField } from "../lib/config";
import { isFreeOrEmpty, normalize } from "../lib/text";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = path.resolve(__dirname, "../../../input");

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
  }
  return "";
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

async function main() {
  const files = existsSync(INPUT_DIR)
    ? readdirSync(INPUT_DIR).filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith("~$")).sort()
    : [];

  if (files.length === 0) {
    console.error(`❌ Không có Excel nào trong ${INPUT_DIR}`);
    process.exit(1);
  }

  let errors = 0;

  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(INPUT_DIR, file));
    const ws = getActiveWorksheet(wb);
    if (!ws) { console.error(`❌ ${file}: không đọc được sheet`); errors++; continue; }

    const hdrIdx = findHeaderRow(ws);
    const header = ws.getRow(hdrIdx);

    let hoColIdx: number | null = null;
    let tenColIdx: number | null = null;
    let nameColIdx: number | null = null;
    let maNganhColIdx: number | null = null;
    let sotienColIdx: number | null = null;

    const maxCols = Math.max(ws.columnCount || 0, header.cellCount || 0, 30);

    for (let c = 1; c <= maxCols; c++) {
      const origName = cellToString(header.getCell(c).value);
      if (origName) {
        const n = normalize(origName);
        if (n === "ho" || n === "ho va ten dem") hoColIdx = c;
        else if (n === "ten") tenColIdx = c;
        else if (n.includes("ho va ten") || n.includes("ho ten") || n === "thi sinh") nameColIdx = c;

        if (n.includes("ma nganh") || n === "manganh") maNganhColIdx = c;
        if (n === "ky 2" || n.includes("ky 2") || n.includes("so tien") || n.includes("hoc phi") || n.includes("le phi")) {
          sotienColIdx = c;
        }
      }
    }

    const hasNameCol = hoColIdx != null || tenColIdx != null || nameColIdx != null;
    if (!hasNameCol) {
      console.error(`❌ ${file}: thiếu cột bắt buộc: Họ và Tên (hoặc 2 cột Họ + Tên)`);
      errors++;
    }

    // Mã ngành -> org
    const breakdown = new Map<string, number>();
    const unknown = new Map<string, number>();
    let nRows = 0;

    const lastRow = Math.max(ws.rowCount || 0, ws.actualRowCount || 0, hdrIdx + 1000);
    for (let r = hdrIdx + 1; r <= lastRow; r++) {
      const row = ws.getRow(r);
      if (!row || row.cellCount === 0) continue;

      let name = "";
      if (hoColIdx != null || tenColIdx != null) {
        const ho = hoColIdx ? cellToString(row.getCell(hoColIdx).value) : "";
        const ten = tenColIdx ? cellToString(row.getCell(tenColIdx).value) : "";
        name = [ho, ten].filter(Boolean).join(" ");
      }
      if (!name && nameColIdx != null) {
        name = cellToString(row.getCell(nameColIdx).value);
      }

      const mn = maNganhColIdx ? cellToString(row.getCell(maNganhColIdx).value) : "";
      if (!name && !mn) continue;

      const sotienVal = sotienColIdx ? cellToString(row.getCell(sotienColIdx).value) : "";
      if (isFreeOrEmpty(sotienVal)) continue;

      nRows++;
      const org = orgCodeForRow(mn, file);
      breakdown.set(org, (breakdown.get(org) ?? 0) + 1);
      if (mn && !(mn in MA_NGANH_TO_ORG)) unknown.set(mn, (unknown.get(mn) ?? 0) + 1);
    }

    const b = [...breakdown.entries()].map(([o, n]) => `${o}:${n}`).join(", ");
    console.log(`• ${file}: ${nRows} hồ sơ -> ${b || "(?)"}`);
    if (unknown.size) {
      for (const [mn, n] of unknown) {
        console.warn(`   ⚠️  Mã ngành chưa map: "${mn}" (${n} hồ sơ) -> suy org theo tên file.`);
      }
    }
  }

  if (errors) {
    console.error(`\n❌ Có ${errors} vấn đề cần xử lý trước khi chạy gen:data.`);
    process.exit(1);
  }
  console.log(`\n✅ ${files.length} file hợp lệ — sẵn sàng chạy: pnpm gen:data`);
}

main().catch((err) => { console.error(err); process.exit(1); });
