import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { userEvent, within } from "@storybook/test";
import DashboardShell from "./DashboardShell";

const meta: Meta<typeof DashboardShell> = {
  title: "Dashboard/DashboardShell",
  component: DashboardShell,
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

type Story = StoryObj<typeof DashboardShell>;
type DashboardShellArgs = { children: ReactNode };

const content = <div className="card"><h1>대시보드 샘플</h1></div>;

export const Closed: Story = {
  args: {
    children: content
  },
  render: (args: DashboardShellArgs) => <DashboardShell>{args.children}</DashboardShell>,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: "사이드바 닫기" });
    await userEvent.click(toggle);
  }
};

export const Open: Story = {
  args: {
    children: content
  },
  render: (args: DashboardShellArgs) => <DashboardShell>{args.children}</DashboardShell>
};

export const DrawerToggleAndTab: Story = {
  args: {
    children: content
  },
  render: (args: DashboardShellArgs) => <DashboardShell>{args.children}</DashboardShell>,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: "사이드바 닫기" });
    await userEvent.click(toggle);
    await userEvent.click(canvas.getByRole("button", { name: "사이드바 펼치기" }));
  }
};
