import React from "react";
import { ShellContainer } from "@/components/ui/Primitives";
import TerminalProgress from "@/components/ui/TerminalProgress";

type PageLoadingProps = {
  title: string;
  description: string;
  hint?: string;
};

export default function PageLoading({ title, description, hint }: PageLoadingProps) {
  return (
    <main className="pageMain py-12" aria-busy="true" aria-live="polite">
      <ShellContainer className="max-w-[920px]">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Preparing workspace</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
          {hint ? <p className="mt-2 text-sm leading-7 text-[var(--rb-muted)]">{hint}</p> : null}
        </div>
        <TerminalProgress stage="priority" />
      </ShellContainer>
    </main>
  );
}
