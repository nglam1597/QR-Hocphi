import { BanksObject } from "vietnam-qr-pay";
import { normalize } from "./text";

interface BankInfo {
  key: string;
  code: string;
  name: string;
  bin: string;
  shortName: string;
  keywords?: string;
}

const BANKS = Object.values(BanksObject) as unknown as BankInfo[];

/**
 * Resolve giá trị ngân hàng trong Excel (tên / mã / BIN) -> mã BIN 6 số.
 * Trả null nếu không nhận diện được.
 */
export function resolveBankBin(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  // Đã là BIN 6 số
  if (/^\d{6}$/.test(value)) return value;

  const n = normalize(value);
  if (!n) return null;

  // 1) Khớp chính xác theo code / shortName / key
  for (const b of BANKS) {
    if (
      normalize(b.code) === n ||
      normalize(b.shortName) === n ||
      normalize(b.key) === n
    ) {
      return b.bin;
    }
  }

  // 2) Khớp một phần theo tên đầy đủ / từ khoá
  let best: { bin: string; score: number } | null = null;
  for (const b of BANKS) {
    const short = normalize(b.shortName);
    const hay = normalize(
      [b.name, b.shortName, b.code, b.key, b.keywords].filter(Boolean).join(" "),
    );
    let score = 0;
    if (short && (n.includes(short) || short.includes(n))) score = 80 + short.length;
    else if (hay.includes(n)) score = 40 + n.length;
    if (score > 0 && (!best || score > best.score)) best = { bin: b.bin, score };
  }
  return best?.bin ?? null;
}
