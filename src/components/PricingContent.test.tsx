/** @vitest-environment jsdom */

import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    locale: "ko"
  })
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("@/components/PricingActions", () => ({
  default: ({ plan }: { plan: string }) => <div data-testid={`pricing-action-${plan}`} />
}));

import PricingContent from "./PricingContent";

describe("PricingContent", () => {
  it("does not render a duplicate paddle script tag", () => {
    const { container } = render(<PricingContent />);

    expect(container.querySelector('script[src="https://cdn.paddle.com/paddle/v2/paddle.js"]')).toBeNull();
  });
});
