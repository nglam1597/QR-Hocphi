/**
 * Chuẩn hoá chuỗi tiếng Việt: bỏ dấu, đ→d, lowercase, gộp khoảng trắng.
 * Dùng cho tìm kiếm không phân biệt dấu / hoa thường.
 */
export function normalize(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

/** Kiểm tra nếu ô số tiền (Kỳ 2) bị để trống, bằng 0 hoặc ghi "miễn" / "miễn phí". */
export function isFreeOrEmpty(input: unknown): boolean {
  const str = String(input ?? "").trim();
  if (!str) return true;
  const n = normalize(str);
  if (!n || n === "0" || n.includes("mien") || n.includes("khong")) return true;
  const digits = digitsOnly(str);
  if (!digits || Number(digits) <= 0) return true;
  return false;
}
