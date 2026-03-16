import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "@storybook/test";
import { useState } from "react";
import DashboardTabs, { type DashboardTab } from "./DashboardTabs";

const meta: Meta<typeof DashboardTabs> = {
  title: "Dashboard/DashboardTabs",
  component: DashboardTabs
};

export default meta;

type Story = StoryObj<typeof DashboardTabs>;

const InteractiveTabs = () => {
  const [tab, setTab] = useState<DashboardTab>("analysis");
  return <DashboardTabs activeTab={tab} onChange={setTab} />;
};

const ResultTabs = () => {
  const [tab, setTab] = useState<DashboardTab>("results");
  return <DashboardTabs activeTab={tab} onChange={setTab} />;
};

export const Default: Story = {
  render: () => <InteractiveTabs />
};

export const PlayResultTransition: Story = {
  render: () => <InteractiveTabs />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("tab", { name: "결과 보기" }));
  }
};

export const ResultsSelected: Story = {
  render: () => <ResultTabs />
};
