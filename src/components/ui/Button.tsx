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
    "border-[color:var(--rb-accent)] bg-[var(--rb-accent)] text-[#061111] shadow-[0_18px_30px_rgba(95,198,183,0.18)] hover:bg-[#74d5c8]",
  secondary:
    "border-[color:var(--rb-border-strong)] bg-[rgba(255,255,255,0.02)] text-[var(--rb-fg)] hover:border-[color:rgba(95,198,183,0.24)] hover:bg-[rgba(255,255,255,0.04)]",
  danger:
    "border-[color:rgba(255,137,137,0.28)] bg-[rgba(132,27,27,0.22)] text-[#ffc5c5] hover:bg-[rgba(132,27,27,0.3)]",
  ghost:
    "border-transparent bg-transparent text-[var(--rb-muted-strong)] hover:border-[color:rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--rb-fg)]"
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
