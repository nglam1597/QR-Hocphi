/**
 * Chuẩn hoá chuỗi tiếng Việt: bỏ dấu, đ→d, lowercase, gộp khoảng trắng.
 * Dùng cho tìm kiếm không phân biệt dấu / hoa thường.
 */
export function normalize(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d") // đ
    .replace(/Đ/g, "d") // Đ
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Chỉ giữ chữ số (dùng cho số tiền "1.000.000 đ" -> "1000000"). */
export function digitsOnly(input: unknown): string {
  return String(input ?? "").replace(/[^\d]/g, "");
}
