import { html, render } from "lit";

import { Popover } from "./popover";

describe("Popover", () => {
  const rectangle = (x: number, y: number, width: number, height: number): DOMRect => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  });

  afterEach(() => {
    render(null, document.body);
    jest.restoreAllMocks();
  });

  function popover(id: string, boundary?: string) {
    return Popover({
      id,
      title: "About this option",
      content: "Help for this option.",
      closeLabel: "Close help",
      triggerLabel: "Show help",
      triggerContent: html`<span aria-hidden="true">?</span>`,
      boundary,
    });
  }

  it("leaves Escape available to the parent when the popover is closed", () => {
    render(popover("help"), document.body);
    const trigger = document.querySelector<HTMLButtonElement>('[aria-controls="help"]')!;
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    trigger.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(document.getElementById("help")!.hidden).toBe(true);
  });

  it("keeps the panel on screen when its containing card extends beyond the viewport", () => {
    render(html`<div data-card>${popover("help", "[data-card]")}</div>`, document.body);
    const card = document.querySelector<HTMLElement>("[data-card]")!;
    const panel = document.getElementById("help")!;
    const trigger = document.querySelector<HTMLButtonElement>('[aria-controls="help"]')!;
    jest.spyOn(card, "getBoundingClientRect").mockReturnValue(rectangle(-40, 0, 400, 400));
    jest.spyOn(panel, "getBoundingClientRect").mockReturnValue(rectangle(0, 0, 336, 120));
    jest.spyOn(trigger, "getBoundingClientRect").mockReturnValue(rectangle(20, 40, 16, 16));
    trigger.click();
    expect(panel.style.width).toBe("336px");
    expect(panel.style.left).toBe("12px");
  });

  it("keeps separate popovers independent and restores focus on Escape", () => {
    render(html`${popover("first")}${popover("second")}`, document.body);
    const first = document.getElementById("first")!;
    const second = document.getElementById("second")!;
    const trigger = document.querySelector<HTMLButtonElement>('[aria-controls="second"]')!;
    trigger.click();
    expect(first.hidden).toBe(true);
    expect(second.hidden).toBe(false);
    const close = second.querySelector<HTMLButtonElement>("button")!;
    close.focus();
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    close.dispatchEvent(escape);
    expect(second.hidden).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(escape.defaultPrevented).toBe(true);
  });

  it.each([
    { top: 250, expectedTop: "130px", border: "tw-border-b" },
    { top: 40, expectedTop: "56px", border: "tw-border-t" },
  ])("keeps help within its boundary and places the arrow at the trigger ($top)", (testCase) => {
    render(html`<div data-card>${popover("help", "[data-card]")}</div>`, document.body);
    const card = document.querySelector<HTMLElement>("[data-card]")!;
    const panel = document.getElementById("help")!;
    const trigger = document.querySelector<HTMLButtonElement>('[aria-controls="help"]')!;
    jest.spyOn(card, "getBoundingClientRect").mockReturnValue(rectangle(100, 0, 300, 400));
    jest.spyOn(panel, "getBoundingClientRect").mockReturnValue(rectangle(0, 0, 276, 120));
    jest
      .spyOn(trigger, "getBoundingClientRect")
      .mockReturnValue(rectangle(360, testCase.top, 16, 16));
    trigger.click();
    expect(panel.style.width).toBe("276px");
    expect(panel.style.left).toBe("112px");
    expect(panel.style.top).toBe(testCase.expectedTop);
    const arrow = panel.querySelector<HTMLElement>(".bit-popover-arrow")!;
    expect(arrow.style.left).toBe("250px");
    expect(arrow.classList.contains(testCase.border)).toBe(true);
  });
});
