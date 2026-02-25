/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useState } from "react";
import DashboardTabs from "./DashboardTabs";

describe("DashboardTabs", () => {
  it("switches tab activation by role attributes", () => {
    const StatefulTabs = () => {
      const [tab, setTab] = useState<"analysis" | "results">("analysis");
      return <DashboardTabs activeTab={tab} onChange={setTab} />;
    };

    render(
      <StatefulTabs />
    );

    const analysisTab = document.getElementById("analysis-tab") as HTMLButtonElement;
    const resultTab = screen.getByRole("tab", { name: "결과 보기" });

    expect(analysisTab.getAttribute("aria-selected")).toBe("true");
    expect(resultTab.getAttribute("aria-selected")).toBe("false");

    fireEvent.click(resultTab);
    expect(analysisTab.getAttribute("aria-selected")).toBe("false");
    expect(resultTab.getAttribute("aria-selected")).toBe("true");
  });

  it("supports arrow-key tab navigation", () => {
    const StatefulTabs = () => {
      const [tab, setTab] = useState<"analysis" | "results">("analysis");
      return <DashboardTabs activeTab={tab} onChange={setTab} />;
    };

    render(<StatefulTabs />);

    const analysisTab = screen.getAllByRole("tab", { name: "분석하기" })[0];
    const resultsTab = screen.getAllByRole("tab", { name: "결과 보기" })[0];

    analysisTab.focus();
    fireEvent.keyDown(analysisTab, { key: "ArrowRight" });
    expect(resultsTab.getAttribute("aria-selected")).toBe("true");
  });
});
