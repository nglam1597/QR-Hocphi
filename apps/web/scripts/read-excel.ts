import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.resolve(__dirname, "../../../input/CCYT.xlsx");

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(inputPath);
  console.log("=== EXCEL FILE INSPECTION: input/CCYT.xlsx ===");
  console.log("Worksheets:", wb.worksheets.map((w) => w.name));

  for (const ws of wb.worksheets) {
    console.log(`\n--- Sheet: "${ws.name}" (Rows: ${ws.rowCount}, Cols: ${ws.columnCount}) ---`);
    for (let r = 1; r <= Math.min(25, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const cells: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const val = row.getCell(c).value;
        if (val != null) {
          cells.push(`[Col ${c}]: ${JSON.stringify(val)}`);
        }
      }
      if (cells.length > 0) {
        console.log(`Row ${r}:`, cells.join(" | "));
      }
    }
  }
}

main().catch(console.error);
