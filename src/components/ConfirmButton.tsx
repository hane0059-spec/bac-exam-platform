"use client";
// src/components/ConfirmButton.tsx
// زرّ بإجراء حسّاس + تأكيد داخل الواجهة (خطوتان) بدل window.confirm.
// النقرة الأولى تُظهر لوحة تأكيد ظاهرة، والثانية تنفّذ.
import { useState } from "react";

export default function ConfirmButton({
  onConfirm,
  label,
  message,
  confirmLabel = "تأكيد",
  danger = true,
  disabled,
  className,
}: {
  onConfirm: () => void | Promise<void>;
  label: React.ReactNode;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={className}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1.5 rounded-xl border border-gold bg-gold/10 p-2 text-sm">
      <span className="text-gold">{message}</span>
      <span className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setOpen(false);
            }
          }}
          className={`rounded-lg px-3 py-1 text-xs font-medium text-white ${
            danger ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary-dark"
          } disabled:opacity-60`}
        >
          {busy ? "…" : confirmLabel}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1 text-xs text-ink/60 hover:underline"
        >
          تراجع
        </button>
      </span>
    </span>
  );
}
