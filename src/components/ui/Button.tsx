import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loadingText?: string;
  asLoading?: boolean;
};

const variantClassName: Record<ButtonVariant, string> = {
  primary:
    "inline-flex items-center justify-center rounded-[14px] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center rounded-[14px] bg-[var(--color-danger)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs",
  md: "",
  lg: "px-5 py-3 text-base"
};

export default function Button({
  variant = "secondary",
  size = "md",
  asLoading = false,
  loadingText,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const isLoading = Boolean(asLoading);
  const computedClass = `${variantClassName[variant]} ${sizeClassName[size]} ${className ?? ""}`.trim();

  return (
    <button
      type="button"
      {...props}
      disabled={isLoading || disabled}
      className={computedClass}
    >
      {isLoading ? loadingText ?? "처리 중..." : children}
    </button>
  );
}
