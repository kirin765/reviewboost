"use client";

import React, { type ReactNode } from "react";
import { EXTENSION_STORE_URL } from "@/lib/extension";
import { gtagEvent } from "@/lib/analytics";
import { buttonStyles } from "@/components/ui/Button";

export default function ExtensionInstallLink({ placement, children = "Chrome에 무료로 설치", className }: {
  placement: string;
  children?: ReactNode;
  className?: string;
}) {
  return <a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className={className ?? buttonStyles({ variant: "primary" })}
    onClick={() => gtagEvent("extension_install_click", { placement, store: "chrome" })}>{children}</a>;
}
