"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { captureAcquisition } from "@/lib/checkout-analytics";
import { GA_MEASUREMENT_ID, pageview } from "@/lib/analytics";

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    captureAcquisition();
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    if (lastPage.current === url) return;
    lastPage.current = url;
    pageview(url);
  }, [pathname, searchParams]);

  if (!GA_MEASUREMENT_ID) return null;

  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />;
}

