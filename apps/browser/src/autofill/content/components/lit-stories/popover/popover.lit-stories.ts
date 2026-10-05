import { Meta, StoryObj } from "@storybook/web-components";
import { html } from "lit";
import { expect, userEvent, within } from "storybook/test";

import "../../../../notification/base-url.css";

import { Popover } from "../../popover/popover";

type PopoverStoryProps = {
  title: string;
  content: string;
  theme: "light" | "dark";
  width: number;
};

export default {
  title: "Components/Popover",
  args: {
    title: "About this option",
    content: "This choice applies to this save. You can change your default in Settings.",
    theme: "light",
    width: 400,
  },
  argTypes: {
    theme: { control: "select", options: ["light", "dark"] },
    width: { control: "number" },
  },
  render: ({ title, content, theme, width }) => html`
    <div
      data-popover-demo
      class="theme_${theme} tw-bg-bg-primary"
      style="width: ${width}px; padding: 160px 24px 24px; box-sizing: border-box; min-height: 320px;"
    >
      ${Popover({
        id: "example-popover",
        title,
        content,
        closeLabel: "Close help",
        triggerLabel: "Show help",
        boundary: "[data-popover-demo]",
        triggerContent: html`<svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16v1" />
        </svg>`,
      })}
    </div>
  `,
} satisfies Meta<PopoverStoryProps>;

type Story = StoryObj<PopoverStoryProps>;

export const Default: Story = {};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show help" }));
    await expect(canvas.getByRole("dialog", { name: "About this option" })).toBeVisible();
  },
};

export const Dark: Story = { args: { theme: "dark" } };
export const DarkOpen: Story = { ...Open, args: { theme: "dark" } };
export const NarrowOpen: Story = { ...Open, args: { width: 280 } };
export const LongContentOpen: Story = {
  ...Open,
  args: {
    content:
      "This choice applies to this save. You can change your default in Settings. " +
      "The popover supports longer explanations and keeps the close button available.",
  },
};
