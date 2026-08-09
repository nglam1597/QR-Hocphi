/**
 * Màn "cổng nộp lệ phí đã đóng" — hiện cho mọi ngành khi PORTAL_CLOSED = true.
 * orgName: tên ngành (nếu biết) để cá nhân hoá; bỏ trống thì dùng wording chung.
 */
export default function PortalClosed({ orgName }: { orgName?: string }) {
  return (
    <div className="min-h-dvh bg-slate-100">
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200/70 ring-1 ring-slate-300/60">
          <LockIcon />
        </div>

        <h1 className="mt-6 text-3xl font-bold leading-[1.15] tracking-tight text-slate-900">
          Cổng nộp lệ phí đã đóng
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          {orgName ? (
            <>
              Ngành <span className="font-semibold text-slate-900">{orgName}</span> đã
              kết thúc thời gian nhận lệ phí dự thi.
            </>
          ) : (
            <>Đã kết thúc thời gian nhận lệ phí dự thi.</>
          )}
        </p>

        <p className="mt-2 text-[15px] leading-relaxed text-slate-500">
          Cảm ơn bạn đã hoàn tất đăng ký dự thi. Chúc bạn một kỳ thi thật tốt —
          hẹn gặp bạn tại phòng thi!
        </p>

        <p className="mt-8 w-full border-t border-slate-200 pt-5 text-xs font-medium text-slate-400">
          Tuyển sinh năng khiếu 2026
        </p>
      </main>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-500"
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
