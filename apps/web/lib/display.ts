/**
 * Cấu hình hiển thị trang chi tiết: 1 section thông tin thí sinh,
 * theo thứ tự dưới đây; trường có dữ liệu nhưng không liệt kê sẽ xếp cuối.
 */

/** Cột không hiển thị trong danh sách (đã render ở chỗ khác / không cần). */
export const HIDDEN_KEYS = new Set<string>([
  "Họ và Tên",
  "anh dai dien",
  "QR",
  "Nội dung CK",
  "Tên ngành", // đã hiển thị ở đầu trang
]);

/** Nhãn hiển thị thân thiện cho một số cột viết tắt. */
export const FIELD_LABELS: Record<string, string> = {
  TT: "Số thứ tự",
  KHTC: "Mã KHTC",
  "TS xác nhận": "Thí sinh xác nhận",
  "Thứ tự NV": "Thứ tự nguyện vọng",
};

export function labelOf(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

/** Thứ tự ưu tiên các trường trong section thông tin thí sinh. */
export const FIELD_ORDER: string[] = [
  "Số CCCD",
  "Ngày Sinh",
  "Giới tính",
  "Điện thoại",
  "Email",
  "Mã ngành",
  "Thứ tự NV",
  "Trạng thái hồ sơ",
  "TS xác nhận",
  "Ghi chú",
];
