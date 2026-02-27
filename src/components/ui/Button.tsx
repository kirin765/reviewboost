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
  primary: "btn btnPrimary",
  secondary: "btn",
  danger: "btn btnWarn",
  ghost: "btn btnGhost"
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: "btnSmall",
  md: "",
  lg: "btnLarge"
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
