import React from "react";

export type BadgeStatus = "success" | "warning" | "error" | "muted" | "primary";

type BadgeProps = {
  status?: BadgeStatus;
  text: string;
};

const statusClassName: Record<BadgeStatus, string> = {
  success: "badge badgeSuccess",
  warning: "badge badgeWarning",
  error: "badge badgeDanger",
  muted: "badge",
  primary: "badge badgePrimary"
};

export default function Badge({ status = "primary", text }: BadgeProps) {
  return <span className={statusClassName[status]}>{text}</span>;
}

