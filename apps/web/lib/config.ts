/**
 * Cấu hình tập trung — đổi ở đây là đổi toàn hệ thống.
 */

/**
 * Công tắc đóng cổng nộp lệ phí cho TẤT CẢ các ngành.
 * Đặt true khi đã hết hạn nộp — mọi trang tìm kiếm & QR sẽ hiện màn "đã đóng".
 * Đặt lại false để mở cổng bình thường.
 */
export const PORTAL_CLOSED = true;

/** Tài khoản nhận lệ phí (cố định cho mọi thí sinh). */
export const RECEIVE = {
  bankBin: "970405", // Agribank
  bankName: "Agribank",
  accountNumber: "2700201005338",
  /** Số tiền cố định (đồng). Để "" nếu muốn người chuyển tự nhập. */
  amount: "300000",
} as const;

/** Suy ra mã org từ tên file Excel: DS_GDMN_CK.xlsx -> GDMN, DS_SPAN_v2.xlsx -> SPAN. */
export function orgCodeFromFile(filename: string): string {
  const m = filename.match(/^DS[_-]?([A-Za-z]+)/i);
  const code = m?.[1] ?? filename.replace(/\.[^.]+$/, "");
  return code.toUpperCase();
}

/**
 * Map Mã ngành -> org. Cho phép file danh sách trộn nhiều ngành (vd DS_Bosung)
 * vẫn gộp đúng từng hồ sơ vào ngành của nó thay vì tạo org mới theo tên file.
 */
export const MA_NGANH_TO_ORG: Record<string, string> = {
  "7140201": "MNGD", // Giáo dục Mầm non
  "7140206": "TCSP", // Giáo dục Thể chất
  "7140221": "ANSP", // Sư phạm Âm nhạc
  "7140222": "SPMT", // Sư phạm Mỹ thuật
  "QR":"QR Agribank",// QR Ngân hàng
};

/**
 * Org của một hồ sơ: ưu tiên theo Mã ngành; nếu mã lạ/rỗng thì fallback về org
 * suy từ tên file (giữ tương thích với các file đơn-ngành cũ).
 */
export function orgCodeForRow(maNganh: string, filename: string): string {
  const code = (maNganh ?? "").trim();
  return MA_NGANH_TO_ORG[code] ?? orgCodeFromFile(filename);
}

/** Tên cột trong Excel mà app phụ thuộc (đã là tên thật ở dòng header). */
export const COLUMN = {
  name: "Họ và Tên",
  cccd: "Số CCCD",
  dob: "Ngày Sinh",
  maNganh: "Mã ngành",
  nganh: "Tên ngành",
  content: "Nội dung CK",
  photo: "anh dai dien",
  sotien:"soTienThanhToan",
} as const;

/** Tiền tố cố định cho nội dung chuyển khoản. */
export const CK_PREFIX = "NK26";

/** Nội dung CK chuẩn: <CCCD>NK26<Mã ngành> — viết liền, không dấu chấm. */
export function buildCkContent(cccd: string, maNganh: string): string {
  const parts = [cccd, CK_PREFIX, maNganh].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.join("");
}
