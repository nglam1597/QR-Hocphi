import { QRPay } from "vietnam-qr-pay";
import QRCode from "qrcode";
import { resolveBankBin } from "./banks";
import { digitsOnly } from "./text";

export interface QrInput {
  bank?: unknown;
  account?: unknown;
  amount?: unknown;
  content?: unknown;
}

/**
 * Tạo chuỗi VietQR EMVCo từ thông tin ngân hàng.
 * Trả null nếu thiếu ngân hàng hợp lệ hoặc số tài khoản.
 */
export function buildVietQrPayload(input: QrInput): { payload: string; bin: string; account: string } | null {
  const bin = resolveBankBin(input.bank);
  const account = String(input.account ?? "").replace(/\s+/g, "");
  if (!bin || !account) return null;

  const amount = digitsOnly(input.amount);
  const purpose = String(input.content ?? "").trim();

  const qr = QRPay.initVietQR({
    bankBin: bin,
    bankNumber: account,
    amount: amount || undefined,
    purpose: purpose || undefined,
  });
  return { payload: qr.build(), bin, account };
}

/**
 * Tạo VietQR dạng SVG (vector, nét tại mọi kích thước, file rất nhẹ).
 * Dùng để pre-generate & lưu thành file tĩnh lúc build.
 */
export async function buildVietQrSvg(
  input: QrInput,
): Promise<{ payload: string; svg: string } | null> {
  const built = buildVietQrPayload(input);
  if (!built) return null;
  const svg = await QRCode.toString(built.payload, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });
  return { payload: built.payload, svg };
}
