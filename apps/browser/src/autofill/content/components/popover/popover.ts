import { html, TemplateResult } from "lit";

import { popoverStyles } from "@bitwarden/components/popover-styles";

type PopoverProps = {
  /** Unique, stable ID for this popover and its accessible labels. */
  id: string;
  title: string;
  content: string | TemplateResult;
  closeLabel: string;
  triggerLabel: string;
  triggerContent: TemplateResult;
  /** Optional ancestor selector used to keep the panel inside a containing card. */
  boundary?: string;
};

/** Lit counterpart of bit-popover, using the same shared surface and content styles. */
export function Popover({
  id,
  title,
  content,
  closeLabel,
  triggerLabel,
  triggerContent,
  boundary,
}: PopoverProps) {
  const elements = (event: Event) => {
    const root = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-popover]")!;
    return {
      root,
      panel: root.querySelector<HTMLElement>("[role=dialog]")!,
      trigger: root.querySelector<HTMLButtonElement>("button[aria-controls]")!,
    };
  };

  const setVisible = (event: Event, visible: boolean) => {
    const { root, panel, trigger } = elements(event);
    panel.hidden = !visible;
    trigger.setAttribute("aria-expanded", String(visible));
    if (!visible) {
      return;
    }

    const anchor = trigger.getBoundingClientRect();
    const bounds = boundary ? root.closest<HTMLElement>(boundary)?.getBoundingClientRect() : null;
    const width = Math.min(360, (bounds?.width || window.innerWidth) - 24);
    panel.style.width = `${width}px`;
    panel.style.paddingTop = "0";
    panel.style.paddingBottom = "8px";
    const height = panel.getBoundingClientRect().height;
    const above = anchor.top - height >= 8;
    panel.style.paddingTop = above ? "0" : "8px";
    panel.style.paddingBottom = above ? "8px" : "0";
    const left = Math.max(
      (bounds?.left ?? 0) + 12,
      Math.min(
        anchor.left + anchor.width / 2 - width / 2,
        (bounds?.right || window.innerWidth) - width - 12,
      ),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${above ? anchor.top - height : anchor.bottom}px`;
    const arrow = panel.querySelector<HTMLElement>(".bit-popover-arrow")!;
    arrow.style.left = `${anchor.left + anchor.width / 2 - left - 6}px`;
    arrow.style.top = `${above ? height - 14 : 2}px`;
    arrow.classList.toggle("tw-border-b", above);
    arrow.classList.toggle("tw-border-r", above);
    arrow.classList.toggle("tw-border-t", !above);
    arrow.classList.toggle("tw-border-l", !above);
  };

  const close = (event: Event) => {
    // Focusing the trigger opens the panel, so hide it after returning focus.
    elements(event).trigger.focus();
    setVisible(event, false);
  };

  return html`
    <div
      data-popover
      class="tw-inline-flex"
      @mouseenter=${(event: Event) => setVisible(event, true)}
      @mouseleave=${(event: Event) => {
        if (!elements(event).root.contains(document.activeElement)) {
          setVisible(event, false);
        }
      }}
      @focusin=${(event: FocusEvent) => {
        if (event.target === elements(event).trigger) {
          setVisible(event, true);
        }
      }}
      @focusout=${(event: FocusEvent) => {
        if (!elements(event).root.contains(event.relatedTarget as Node | null)) {
          setVisible(event, false);
        }
      }}
      @keydown=${(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close(event);
        }
      }}
    >
      <button
        type="button"
        aria-label=${triggerLabel}
        aria-controls=${id}
        aria-describedby=${`${id}-description`}
        aria-haspopup="dialog"
        aria-expanded="false"
        class="tw-box-border tw-flex tw-size-4 tw-cursor-pointer tw-items-center tw-justify-center tw-border-0 tw-bg-transparent tw-p-0 tw-text-primary-600 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-primary-600"
        @click=${(event: Event) => setVisible(event, true)}
      >
        ${triggerContent}
      </button>
      <div
        id=${id}
        role="dialog"
        aria-labelledby=${`${id}-title`}
        aria-describedby=${`${id}-description`}
        hidden
        class="tw-fixed tw-z-30 tw-box-border"
      >
        <div class="${popoverStyles.surface} tw-box-border tw-border-solid">
          <div class=${popoverStyles.body}>
            <div class=${popoverStyles.padding}>
              <div class=${popoverStyles.closePosition}>
                <button
                  type="button"
                  aria-label=${closeLabel}
                  class="tw-flex tw-size-8 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-transparent tw-p-0 tw-text-fg-heading focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-primary-600"
                  @click=${close}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="m6 6 12 12M6 18 18 6" />
                  </svg>
                </button>
              </div>
              <div class=${popoverStyles.content}>
                <div class=${popoverStyles.headingAndBody}>
                  <h2
                    id=${`${id}-title`}
                    class="${popoverStyles.title} tw-m-0 tw-pe-7 tw-text-lg tw-font-medium tw-leading-7"
                  >
                    ${title}
                  </h2>
                  <div
                    id=${`${id}-description`}
                    class="${popoverStyles.description} tw-text-sm tw-leading-5"
                  >
                    ${content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <span
          class="bit-popover-arrow tw-box-border tw-border-0 tw-bg-bg-primary"
          aria-hidden="true"
        ></span>
      </div>
    </div>
  `;
}
