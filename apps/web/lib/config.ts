import { normalize } from "./text";

/**
 * Cấu hình tập trung toàn hệ thống.
 */

/** Công tắc đóng/mở cổng tra cứu & nộp lệ phí (false = Mở cổng bình thường). */
export const PORTAL_CLOSED = false;

/** Tài khoản nhận lệ phí/học phí cố định. */
export const RECEIVE = {
  bankBin: "970405", // Agribank
  bankName: "Agribank",
  accountNumber: "2700668838899",
  /** Số tiền mặc định (đồng). Nếu rỗng sẽ lấy từ file Excel hoặc người chuyển tự nhập. */
  amount: "300000",
} as const;

/** Tên các cột chuẩn mà ứng dụng sử dụng. */
export const COLUMN = {
  name: "Họ và Tên",
  cccd: "Mã SV",
  dob: "Ngày Sinh",
  maNganh: "Mã ngành",
  nganh: "Tên ngành",
  content: "Nội dung CK",
  photo: "anh dai dien",
  sotien: "Kỳ 2",
} as const;

/** Suy ra mã org từ tên file Excel: CCYT.xlsx -> CCYT. */
export function orgCodeFromFile(filename: string): string {
  const m = filename.match(/^DS[_-]?([A-Za-z0-9]+)/i);
  const code = m?.[1] ?? filename.replace(/\.[^.]+$/, "");
  return code.toUpperCase();
}

/** Map Mã ngành -> Tên viết tắt Org. */
export const MA_NGANH_TO_ORG: Record<string, string> = {
  "7140201": "VLTL",
  "7140206": "TCSP",
  "7140221": "ANSP",
  "7140222": "SPMT",
};

export function orgCodeForRow(maNganh: string, filename: string): string {
  const code = (maNganh ?? "").trim();
  return MA_NGANH_TO_ORG[code] ?? orgCodeFromFile(filename);
}

/** Tiền tố cố định cho nội dung chuyển khoản. */
export const CK_PREFIX = "NK26";

/** Nội dung CK chuẩn: <Mã SV>NK26<Mã ngành> */
export function buildCkContent(masv: string, maNganh: string): string {
  const parts = [masv, CK_PREFIX, maNganh].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.join("");
}

export function matchCanonicalField(name: string): keyof typeof COLUMN | null {
  const n = normalize(name);
  if (!n) return null;
  if (n === "ho" || n === "ho va ten dem" || n === "ten" || n.includes("ho va ten") || n.includes("ho ten") || n === "thi sinh") {
    return "name";
  }
  if (n === "ma sv" || n === "msv" || n.includes("ma sinh vien") || n.includes("cccd") || n.includes("sbd")) {
    return "cccd";
  }
  if (n.includes("ngay sinh") || n === "dob" || n === "ns") {
    return "dob";
  }
  if (n.includes("ma nganh") || n === "manganh") {
    return "maNganh";
  }
  if (n.includes("ten nganh") || n === "nganh") {
    return "nganh";
  }
  if (n.includes("noi dung") || n.includes("ck") || n.includes("chuyen khoan")) {
    return "content";
  }
  if (n.includes("anh") || n.includes("photo")) {
    return "photo";
  }
  if (n === "ky 2" || n.includes("ky 2") || n.includes("so tien") || n.includes("le phi") || n.includes("hoc phi")) {
    return "sotien";
  }
  return null;
}



