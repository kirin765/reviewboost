import type { ReactNode } from "react";

export const pageShellClass = "mx-auto w-full max-w-[1240px] px-5 pb-24 md:px-8";

export const panelClass =
  "relative rounded-[28px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(22,28,40,0.96),rgba(10,13,20,0.98))] shadow-[0_32px_96px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.06)]";

export const mutedPanelClass = "rounded-[22px] border border-white/[0.07] bg-white/[0.025]";

export const primaryButtonClass =
  "relative inline-flex items-center justify-center overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#4f7fff,#6366f1)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_0_rgba(79,127,255,0)] transition-all duration-300 hover:translate-y-[-1px] hover:shadow-[0_8px_28px_rgba(79,127,255,0.38)] active:translate-y-0";

export const secondaryButtonClass =
  "inline-flex items-center justify-center rounded-[16px] border border-white/[0.1] bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-[var(--color-text)] backdrop-blur-sm transition-all duration-200 hover:border-white/[0.18] hover:bg-white/[0.07] hover:translate-y-[-1px]";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-white/60 ${className}`}>
      <span className="inline-block h-px w-5 bg-[var(--color-primary)] opacity-80" />
      {children}
    </p>
  );
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
      <h2 className="mt-5 text-[2.4rem] font-semibold leading-[1.08] tracking-[-0.065em] text-white md:text-[3.4rem] md:leading-[1.02]">{title}</h2>
      <p className="mt-5 text-[0.975rem] leading-[1.85] text-[var(--color-muted)]">{body}</p>
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
