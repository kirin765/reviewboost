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
        if (!res.ok) return { supabaseConfigured: fallback };
        return (await res.json()) as { supabaseConfigured?: boolean };
      })
      .then((json) => {
        if (!active) return;
        setConfigured(Boolean(json.supabaseConfigured));
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
