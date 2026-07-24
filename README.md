# QR Finder — Tra cứu thí sinh & QR lệ phí dự thi

Web **mobile-first** cho thí sinh tự tra cứu thông tin đăng ký thi năng khiếu và lấy **mã VietQR** nộp lệ phí (chuyển khoản về tài khoản cố định của trường).

- **Monorepo**: Turborepo + pnpm workspaces
- **App**: Next.js 16 (App Router, Turbopack), Tailwind v4
- **QR**: VietQR EMVCo sinh **local** bằng `vietnam-qr-pay` + `qrcode`, **pre-generate thành file SVG tĩnh** lúc build (0 chi phí runtime, cache CDN tốt)

## Cấu trúc

```
qr-finder/
├─ input/                     # 4 file Excel nguồn (PII — KHÔNG commit)
├─ apps/web/
│  ├─ scripts/gen-data.ts     # đọc input/*.xlsx -> records.json + index + QR svg
│  ├─ lib/
│  │  ├─ config.ts            # ⬅ tài khoản nhận, số tiền, map cột Excel
│  │  ├─ vietqr.ts            # build payload + SVG VietQR
│  │  ├─ banks.ts             # resolve tên/mã ngân hàng -> BIN
│  │  ├─ data.ts              # đọc records.json (server)
│  │  ├─ display.ts           # nhóm trường + nhãn trang chi tiết
│  │  └─ text.ts              # chuẩn hoá tiếng Việt (bỏ dấu)
│  ├─ app/
│  │  ├─ page.tsx             # TRANG 1: chào hỏi + chọn ngành + thanh search
│  │  ├─ search-client.tsx    # search client-side trên index tĩnh
│  │  └─ p/[id]/page.tsx      # TRANG 2: chi tiết hồ sơ + QR to rõ (SSG)
│  ├─ data/records.json       # (sinh ra) bản ghi đầy đủ — server đọc
│  └─ public/
│     ├─ index/<ORG>.json     # (sinh ra) index search theo ngành
│     └─ qr/<id>.svg          # (sinh ra) QR pre-gen mỗi hồ sơ
```

## Luồng hoạt động

1. `pnpm gen:data` đọc 4 file Excel, tự **dò dòng header** (dòng chứa "Họ và Tên"), gộp theo **org** (suy từ tên file: `GDMN`, `SPAN`, `SPMT`, `SPTC`), sinh:
   - QR VietQR cho từng hồ sơ (TK `2700201005338` · Agribank · 300.000đ · nội dung = cột "Nội dung CK")
   - index search gọn (id, tên, ngành, ngày sinh) — không lộ toàn bộ PII xuống client
   - `records.json` đầy đủ cho trang chi tiết
2. **Trang 1** `/?org=GDMN` — search theo tên (không phân biệt dấu/hoa thường), giới hạn trong ngành đó. Không có `?org` → hiện danh sách ngành để chọn.
3. **Trang 2** `/p/<id>` — trang tĩnh hiển thị đầy đủ thông tin + QR lớn + nút sao chép STK/nội dung.

## Lệnh

```bash
pnpm install
pnpm gen:data            # sinh dữ liệu từ input/  (chạy trong apps/web, hoặc pnpm --filter @qr-finder/web gen:data)
pnpm dev                 # chạy dev (Turborepo)
pnpm build               # build (đã tự chạy gen:data trước)
pnpm start               # chạy production
```

## Khi cập nhật danh sách

Thay file trong `input/` rồi chạy lại `pnpm gen:data` (hoặc `pnpm build`). URL `?org=<mã>` lấy theo phần đầu tên file `DS_<MÃ>_...`.

## Cấu hình nhanh (`apps/web/lib/config.ts`)

- `RECEIVE`: ngân hàng / số TK / số tiền nhận lệ phí.
- `COLUMN`: tên cột Excel mà app phụ thuộc (tên, CCCD, ngày sinh, ngành, nội dung CK, ảnh).

## ⚠️ Lưu ý PII

`input/*.xlsx`, `data/records.json`, `public/qr`, `public/index` chứa **CCCD, SĐT, email** của thí sinh và đã được `.gitignore`. Trang chi tiết hiển thị các thông tin này công khai theo yêu cầu — cân nhắc đặt sau xác thực nếu triển khai rộng.
# nop-phi-thi
