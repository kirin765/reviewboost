"use client";

import { useEffect, useState } from "react";

export function useSupabaseConfigured(): boolean {
  // Keep auth UI visible by default, then sync with runtime capability check.
  const fallback = true;
  const [configured, setConfigured] = useState<boolean>(fallback);

  useEffect(() => {
    let active = true;

    fetch("/api/capabilities", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return { databaseConfigured: fallback };
        return (await res.json()) as { databaseConfigured?: boolean };
      })
      .then((json) => {
        if (!active) return;
        setConfigured(Boolean(json.databaseConfigured));
      })
      .catch(() => {
        if (active) setConfigured(fallback);
      });

    return () => {
      active = false;
    };
  }, [fallback]);

  return configured;
}
