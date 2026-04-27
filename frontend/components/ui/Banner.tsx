"use client";

import type { ReactNode } from "react";

type BannerVariant = "error" | "warning";

const styles: Record<BannerVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function Banner(props: {
  variant: BannerVariant;
  children: ReactNode;
  dismissable?: boolean;
  onDismiss?: () => void;
}) {
  const { variant, children, dismissable, onDismiss } = props;

  return (
    <div
      className={`flex items-start gap-2 border-b px-4 py-2 text-sm ${styles[variant]}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {dismissable ? (
        <button
          type="button"
          className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-black/5"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
