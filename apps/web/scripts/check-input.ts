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
import { MA_NGANH_TO_ORG, orgCodeForRow, COLUMN } from "../lib/config";
import { normalize } from "../lib/text";

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

function findHeaderRow(ws: ExcelJS.Worksheet): number {
  const max = Math.min(15, ws.rowCount);
  for (let r = 1; r <= max; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= ws.columnCount; c++) {
      const n = normalize(cellToString(row.getCell(c).value));
      if (n.includes("ho va ten") || n === "ho ten") return r;
    }
  }
  return 1;
}

async function main() {
  const files = existsSync(INPUT_DIR)
    ? readdirSync(INPUT_DIR).filter((f) => /\.xlsx?$/i.test(f) && !f.startsWith("~$")).sort()
    : [];

  if (files.length === 0) {
    console.error(`❌ Không có Excel nào trong ${INPUT_DIR}`);
    process.exit(1);
  }

  const required = [COLUMN.name, COLUMN.cccd, COLUMN.maNganh];
  let errors = 0;

  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.join(INPUT_DIR, file));
    const ws = wb.worksheets[0];
    if (!ws) { console.error(`❌ ${file}: không đọc được sheet`); errors++; continue; }

    const hdrIdx = findHeaderRow(ws);
    const header = ws.getRow(hdrIdx);
    const cols = new Set<string>();
    const colIdx = new Map<string, number>();
    for (let c = 1; c <= ws.columnCount; c++) {
      const name = cellToString(header.getCell(c).value);
      if (name) { cols.add(name); if (!colIdx.has(name)) colIdx.set(name, c); }
    }

    const missing = required.filter((r) => !cols.has(r));
    if (missing.length) {
      console.error(`❌ ${file}: thiếu cột bắt buộc: ${missing.join(", ")}`);
      errors++;
    }

    // Mã ngành -> org (đếm + cờ ngành lạ)
    const mnCol = colIdx.get(COLUMN.maNganh);
    const breakdown = new Map<string, number>();
    const unknown = new Map<string, number>();
    let nRows = 0;
    if (mnCol) {
      for (let r = hdrIdx + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const nameCol = colIdx.get(COLUMN.name);
        const hasName = nameCol ? cellToString(row.getCell(nameCol).value) : "";
        const mn = cellToString(row.getCell(mnCol).value);
        if (!hasName && !mn) continue;
        nRows++;
        const org = orgCodeForRow(mn, file);
        breakdown.set(org, (breakdown.get(org) ?? 0) + 1);
        if (!(mn in MA_NGANH_TO_ORG)) unknown.set(mn || "(rỗng)", (unknown.get(mn || "(rỗng)") ?? 0) + 1);
      }
    }

    const b = [...breakdown.entries()].map(([o, n]) => `${o}:${n}`).join(", ");
    console.log(`• ${file}: ${nRows} hồ sơ -> ${b || "(?)"}`);
    if (unknown.size) {
      for (const [mn, n] of unknown) {
        console.error(`   ⚠️  Mã ngành chưa map: "${mn}" (${n} hồ sơ) -> sẽ rơi vào org rác theo tên file.`);
        console.error(`       Thêm vào MA_NGANH_TO_ORG trong apps/web/lib/config.ts trước khi gen:data.`);
      }
      errors++;
    }
  }

  if (errors) {
    console.error(`\n❌ Có ${errors} vấn đề cần xử lý trước khi chạy gen:data.`);
    process.exit(1);
  }
  console.log(`\n✅ ${files.length} file hợp lệ — sẵn sàng chạy: pnpm gen:data`);
}

main().catch((err) => { console.error(err); process.exit(1); });
