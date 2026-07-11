import React from "react";
import { cn } from "@/lib/cn";

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
    "border-[color:var(--rb-accent)] bg-[var(--rb-accent)] text-white! shadow-[0_18px_30px_rgba(91,92,234,0.18)] hover:bg-[#4a4bd6]",
  secondary:
    "border-[color:#e6e8f2] bg-white text-[var(--rb-fg)] hover:border-[color:rgba(91,92,234,0.3)] hover:bg-[#eef0f8]",
  danger:
    "border-[color:rgba(224,85,59,0.3)] bg-[rgba(224,85,59,0.1)] text-[#b3411f]! hover:bg-[rgba(224,85,59,0.18)]",
  ghost:
    "border-[color:#e6e8f2] bg-white text-[var(--rb-fg)] hover:border-[color:#e6e8f2] hover:bg-[#eef0f8] hover:text-[var(--rb-fg)]"
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3.5 text-xs",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-sm"
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[14px] border font-medium tracking-[-0.01em] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
    variantClassName[variant],
    sizeClassName[size],
    className
  );
}

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

  return (
    <button type="button" {...props} disabled={isLoading || disabled} className={buttonStyles({ variant, size, className })}>
      {isLoading ? loadingText ?? "처리 중..." : children}
    </button>
  );
}
