"use client";

import React, { type ReactNode } from "react";
import { gtagEvent } from "@/lib/analytics";

export default function ReviewisaStoreLink({ placement, children }: {
  placement: "guide_steps" | "guide_end";
  children: ReactNode;
}) {
  return (
    <a
      href="https://store.cafe24.com/kr/apps/43542"
      className="underline underline-offset-4"
      onClick={() => gtagEvent("reviewisa_store_click", { placement })}
    >
      {children}
    </a>
  );
}
