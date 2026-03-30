import type { ReactNode } from "react";

export const pageShellClass = "mx-auto w-full max-w-[1240px] px-5 pb-24 md:px-8";
export const panelClass =
  "rounded-[30px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(19,23,30,0.92),rgba(9,12,17,0.96))] shadow-[0_30px_90px_rgba(0,0,0,0.28)]";
export const mutedPanelClass = "rounded-[24px] border border-white/[0.08] bg-white/[0.03]";
export const primaryButtonClass =
  "inline-flex items-center justify-center rounded-[16px] bg-[var(--color-text)] px-6 py-3.5 text-sm font-semibold text-[#071018] transition hover:translate-y-[-1px]";
export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-[var(--color-text)] transition hover:border-white/20 hover:bg-white/[0.06]";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.28em] text-white/76 ${className}`}>{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false
}: {
  eyebrow: string;
  title: string;
  body: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-[760px] text-center" : "max-w-[660px]"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.98]">{title}</h2>
      <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

export function Panel({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${panelClass} ${className}`}>{children}</section>;
}
