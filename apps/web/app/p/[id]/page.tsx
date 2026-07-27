import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecord, getAllIds, getOrg, columns, receive } from "@/lib/data";
import { FIELD_ORDER, HIDDEN_KEYS, labelOf } from "@/lib/display";
import { COLUMN, PORTAL_CLOSED } from "@/lib/config";
import Avatar from "../../avatar";
import CopyButton from "../../copy-button";
import PortalClosed from "../../portal-closed";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllIds().map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const rec = getRecord(id);
  const name = rec?.data[COLUMN.name];
  return {
    title: name ? `${name} — Thông tin & QR lệ phí` : "Không tìm thấy hồ sơ",
  };
}

function formatAmount(amount: string): string {
  const n = Number(amount);
  return n > 0 ? n.toLocaleString("vi-VN") + " ₫" : "Tự nhập";
}

export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rec = getRecord(id);
  if (!rec) notFound();

  // Cổng đã đóng -> hiện màn cảm ơn thay cho QR lệ phí
  if (PORTAL_CLOSED) {
    return <PortalClosed orgName={getOrg(rec.org)?.name} />;
  }

  const name = rec.data[COLUMN.name] || "(không có tên)";
  const nganh = rec.data[COLUMN.nganh] || "";
  const org = getOrg(rec.org);

  const cccd = rec.data[COLUMN.cccd] || "";
  const dob = rec.data[COLUMN.dob] || "";
  const sotien = rec.data[COLUMN.sotien] || "";

  // CCCD + ngày sinh hiển thị ở section đầu nên loại khỏi danh sách chi tiết
  const HEADER_KEYS: string[] = [COLUMN.cccd, COLUMN.dob];
  const ordered = [
    ...FIELD_ORDER,
    ...columns.filter((c) => !HIDDEN_KEYS.has(c) && !FIELD_ORDER.includes(c)),
  ];
  const fields = ordered.filter(
    (k) => !HEADER_KEYS.includes(k) && (rec.data[k] ?? "").trim(),
  );

  return (
    <div className="min-h-dvh bg-slate-100">
      {/* App bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4">
          <Link
            href={`/?org=${rec.org}`}
            aria-label="Quay lại tìm kiếm"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          >
            <ArrowLeft />
          </Link>
          <span className="truncate text-sm font-medium text-slate-500">
            {org?.name ?? "Chi tiết hồ sơ"}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 pt-4">
        {/* Section 1: Hồ sơ + định danh (CCCD, ngày sinh) */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar
              src={rec.photoUrl}
              name={name}
              className="h-20 w-20 shrink-0 rounded-2xl text-2xl ring-1 ring-slate-100"
            />
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight text-slate-900">{name}</h1>
              {nganh && <p className="mt-0.5 truncate text-sm text-slate-500">{nganh}</p>}
            </div>
          </div>
          {(cccd || dob) && (
            <dl className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
              {cccd && <InfoRow label="Số CCCD" value={cccd} />}
              {dob && <InfoRow label="Ngày sinh" value={dob} />}
            </dl>
          )}
        </section>

        {/* Section 2: QR lệ phí */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-center">
            <h2 className="text-base font-semibold text-slate-900">Quét QR để nộp lệ phí</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Mở app ngân hàng bất kỳ và quét mã bên dưới
            </p>
          </div>

          <div className="mx-auto mt-4 w-fit rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/qr/${id}.svg`}
              alt={`Mã VietQR nộp lệ phí của ${name}`}
              width={256}
              height={256}
              loading="lazy"
              decoding="async"
              className="h-60 w-60"
            />
          </div>

          <div className="mx-auto mt-3 flex w-fit items-baseline gap-1.5 rounded-full bg-slate-900 px-4 py-1.5 text-white">
            <span className="text-xs text-slate-300">Lệ phí</span>
            <span className="text-base font-bold">{formatAmount(sotien)}</span>
          </div>

          {/* Nội dung chuyển khoản — chỉ giữ phần này để copy */}
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nội dung chuyển khoản
              </p>
              <CopyButton value={rec.content} />
            </div>
            <p className="mt-1.5 break-all font-mono text-sm font-medium text-slate-900">
              {rec.content || "—"}
            </p>
          </div>
        </section>

        {/* Section 3: Thông tin chi tiết — danh sách hàng gọn */}
       
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const isLink = /^https?:\/\//i.test(value);
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900">
        {isLink ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            Xem ảnh
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
