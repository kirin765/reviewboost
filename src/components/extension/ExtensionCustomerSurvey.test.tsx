// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ExtensionCustomerSurvey from "./ExtensionCustomerSurvey";
beforeEach(() => { vi.stubGlobal("React", React); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("allows skipping without transmitting an answer and stays dismissed", () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const view = render(<ExtensionCustomerSurvey />);
  fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
  expect(fetchMock).not.toHaveBeenCalled();
  view.unmount(); render(<ExtensionCustomerSurvey />);
  expect(screen.queryByRole("combobox")).toBeNull();
});
it("keeps answers for retry after an error and accepts a single optional answer", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 503 })).mockResolvedValueOnce(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  render(<ExtensionCustomerSurvey />);
  fireEvent.change(screen.getByLabelText("주로 하려는 작업"), { target: { value: "weekly_review" } });
  fireEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
  await screen.findByRole("alert");
  expect(localStorage.length).toBe(0);
  fireEvent.click(screen.getByRole("button", { name: "답변 보내기" }));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("답변 감사합니다"));
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ task: "weekly_review", source: "" });
});
