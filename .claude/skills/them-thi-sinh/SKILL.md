---
name: them-thi-sinh
description: >-
  Thêm danh sách thí sinh mới (file Excel DS_*.xlsx) vào qr-finder và regenerate
  toàn bộ dữ liệu tĩnh (records.json, index theo ngành, QR). Tự gộp đúng ngành
  theo "Mã ngành" từng dòng. Dùng khi user nói "thêm người", "thêm thí sinh",
  "thêm data", "thêm hồ sơ", "có file mới DS_...", "thêm danh sách mới".
---

# them-thi-sinh — thêm danh sách thí sinh & regenerate dữ liệu

Mục tiêu: nạp một (hoặc nhiều) file Excel danh sách mới vào hệ thống, phân bổ
**đúng ngành theo `Mã ngành` từng dòng**, rồi sinh lại toàn bộ `records.json`,
index theo ngành và QR. Pipeline đã tự động — KHÔNG sửa tay JSON.

## Bối cảnh cần nhớ
- Mọi xử lý chạy trong `apps/web`. Dùng `pnpm` (workspace).
- Nguồn dữ liệu: mọi `input/*.xlsx` (file `.xlsx` nằm trong `input/`, **gitignore** —
  không commit Excel; chỉ commit JSON + QR đã sinh).
- Org (ngành) suy theo **`Mã ngành` từng dòng** qua `MA_NGANH_TO_ORG`
  (`apps/web/lib/config.ts`), KHÔNG theo tên file → một file trộn nhiều ngành vẫn vào đúng org.
  Hiện map: `7140201→GDMN`, `7140206→SPTC`, `7140221→SPAN`, `7140222→SPMT`.
- ID hồ sơ ổn định theo `org|CCCD` → thêm người mới **không đổi** id/QR của hồ sơ cũ.

## Quy trình

### 1. Đặt file vào input/
Xác nhận file Excel mới đã nằm trong `input/` (tên dạng `DS_*.xlsx`). Nếu user
mới chỉ nhắc tên file, kiểm tra `ls input/`. Nếu chưa có, nhờ user copy vào
`input/` (vd kéo thả, hoặc `cp <đường-dẫn> input/`).

### 2. Preflight — bắt lỗi trước khi sinh
```
cd apps/web && pnpm check:data
```
Script in breakdown `Mã ngành -> org` cho từng file và **chặn (exit≠0)** nếu:
- **Thiếu cột bắt buộc** (`Họ và Tên`, `Số CCCD`, `Mã ngành`) — thường do header bị đổi tên.
- **`Mã ngành` lạ** chưa có trong map → sẽ tạo org rác theo tên file.

Nếu báo **Mã ngành chưa map**: hỏi user mã đó là ngành nào, rồi thêm 1 dòng vào
`MA_NGANH_TO_ORG` trong `apps/web/lib/config.ts` (org code in HOA, vd `SPTH`),
chạy lại `pnpm check:data` đến khi sạch. Đừng gen khi còn cảnh báo.

### 3. Ghi lại số liệu TRƯỚC (để đối chiếu)
```
cd apps/web && node -e "const d=require('./data/records.json');console.log('records:',Object.keys(d.records).length, d.orgs)"
```

### 4. Regenerate
```
cd apps/web && pnpm gen:data
```
Đọc kỹ output: dòng `✓ <file>: N hồ sơ -> ORG:n, ...` và tổng cuối
`✅ <tổng> hồ sơ | QR: <n> ok`. **Mọi org phải nằm trong {GDMN, SPTC, SPAN, SPMT}** —
xuất hiện org lạ (vd `BOSUNG14`) nghĩa là lọt Mã ngành chưa map ở bước 2, dừng và quay lại.

### 5. Xác minh delta
- `records` mới − cũ phải bằng **đúng** số hồ sơ trong (các) file mới.
- Mỗi org tăng đúng phần của nó.
- `QR: ... ok` không có `lỗi`; `git status --short` cho thấy `data/records.json`
  + `public/index/*.json` đổi và đúng số file `public/qr/*.svg` mới (= số hồ sơ mới).

```
cd apps/web && git status --short public/qr | grep -c '^??'   # số QR mới
```

### 6. Báo cáo & commit
Tóm tắt bảng: trước → sau cho từng ngành + tổng. Hỏi user có commit không (đừng
tự commit trừ khi được yêu cầu). Khi commit, theo phong cách repo (conventional,
tiếng Việt) — dùng skill `commit`. Stage `data/`, `public/index/`, `public/qr/`
(và `lib/config.ts` nếu có thêm mã ngành). KHÔNG stage file `.xlsx` (đã gitignore).

## Lỗi thường gặp
- **Org rác xuất hiện** (vd `BOSUNG…`): Mã ngành chưa map — về bước 2.
- **Hồ sơ ra 0 / thiếu**: header file lệch tên cột → `check:data` sẽ chỉ ra cột thiếu.
- **`gen:data` báo thiếu Excel**: file chưa nằm trong `input/` hoặc sai đuôi.
- **CCCD trùng nhiều ngành**: đúng kỳ vọng — mỗi (org, CCCD) là 1 hồ sơ + QR riêng.
