import Link from "next/link";
import { getOrg, listOrgs } from "@/lib/data";
import { PORTAL_CLOSED } from "@/lib/config";
import SearchClient from "./search-client";
import PortalClosed from "./portal-closed";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const sp = await searchParams;
  const orgCode = (sp.org ?? "").trim().toUpperCase();
  const org = orgCode ? getOrg(orgCode) : null;
  console.log("[home] truy cập trang chủ, org =", orgCode || "(chưa chọn)");

  // Cổng đã đóng -> hiện màn cảm ơn (cá nhân hoá theo ngành nếu biết)
  if (PORTAL_CLOSED) {
    return <PortalClosed orgName={org?.name} />;
  }

  // Chưa chọn org hợp lệ -> mời chọn đơn vị
  if (!org) {
    const orgs = listOrgs();
    return (
      <div className="min-h-dvh bg-slate-100">
        <main className="mx-auto w-full max-w-md px-4 pb-12 pt-12">
          <span className="inline-block rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-500">
            Tuyển Sinh 2026
          </span>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900">
            Tra cứu thông tin & QR lệ phí
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Chọn ngành bạn đăng ký để bắt đầu tra cứu.
          </p>

          {orgCode && (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Không tìm thấy đơn vị “{orgCode}”. Vui lòng chọn bên dưới.
            </p>
          )}

          <ul className="mt-5 space-y-2.5">
            {orgs.map((o) => (
              <li key={o.code}>
                <Link
                  href={`/?org=${o.code}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm transition active:bg-slate-50"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">
                    {o.code}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{o.name}</span>
                    <span className="text-xs text-slate-400">{o.count} thí sinh</span>
                  </span>
                  <span className="text-lg text-slate-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4">
          <Link
            href="/"
            aria-label="Chọn ngành khác"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
          >
            <ArrowLeft />
          </Link>
          <span className="truncate text-sm font-medium text-slate-500">{org.name}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-12 pt-5">
        <header className="mb-4">
          <h1 className="text-2xl font-bold leading-tight text-slate-900">
            Chào mừng bạn đến với trang tuyển sinh ngành{" "}
            <span className="text-blue-600">{org.name}</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Đã có <span className="font-semibold text-slate-700">{org.count}</span> thí sinh
            đăng ký. Nhập tên để tìm hồ sơ và lấy mã QR nộp lệ phí của bạn.
          </p>
        </header>

        <SearchClient org={org.code} orgName={org.name} />
      </main>
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
