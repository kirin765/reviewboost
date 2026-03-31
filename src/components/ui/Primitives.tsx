import React, { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function ShellContainer({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export function Surface({
  as: Component = "section",
  children,
  className
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Component
      className={cn(
        "rounded-[16px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] shadow-[0_24px_48px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      {children}
    </Component>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 border-b border-[color:rgba(255,255,255,0.06)] pb-6 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{eyebrow}</p> : null}
        <h2 className="mt-2 text-[clamp(1.6rem,3vw,2.5rem)] font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{title}</h2>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatePanel({
  title,
  description,
  tone = "default",
  actions,
  className
}: {
  title: string;
  description: string;
  tone?: "default" | "error";
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border p-6",
        tone === "error"
          ? "border-[color:rgba(255,137,137,0.24)] bg-[rgba(123,22,22,0.18)]"
          : "border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]",
        className
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{tone === "error" ? "오류 상태" : "안내 상태"}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
