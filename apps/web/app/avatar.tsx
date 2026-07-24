"use client";

import { useState } from "react";

/** Ảnh đại diện từ Google Drive; lỗi tải thì hiện chữ cái đầu của tên. */
export default function Avatar({
  src,
  name,
  className = "",
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-200 font-semibold text-slate-500 ${className}`}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Ảnh của ${name}`}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
