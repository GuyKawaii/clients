import { html, nothing } from "lit";

import { trimToOriginUrl } from "@bitwarden/common/autofill/utils/trim-to-origin-url";
import { checkboxCheckMask, checkboxInputClasses } from "@bitwarden/components/checkbox-styles";

import { I18n } from "../common-types";

export type SaveBaseUrlOptionProps = {
  uri?: string;
  enabled: boolean;
  i18n: I18n;
  onChange: (enabled: boolean) => void;
};

/** A prompt-local choice; persistence belongs to the Autofill settings page. */
export function SaveBaseUrlOption({ uri, enabled, i18n, onChange }: SaveBaseUrlOptionProps) {
  if (!uri || trimToOriginUrl(uri) === uri) {
    return nothing;
  }

  const savedUri = enabled ? trimToOriginUrl(uri) : uri;
  const setHelpVisible = (event: Event, visible: boolean) => {
    const help = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-base-url-help]");
    const panel = help?.querySelector<HTMLElement>("[role=dialog]");
    const trigger = help?.querySelector<HTMLButtonElement>("button[aria-controls]");
    if (!panel || !trigger) {
      return;
    }

    panel.hidden = !visible;
    trigger.setAttribute("aria-expanded", String(visible));
    if (visible) {
      const anchor = trigger.getBoundingClientRect();
      const card = help?.closest<HTMLElement>('[data-testid="save-notification-bar"]');
      const bounds = card?.getBoundingClientRect();
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
    }
  };

  const closeHelp = (event: Event) => {
    const help = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-base-url-help]");
    help?.querySelector<HTMLButtonElement>("button[aria-controls]")?.focus();
    setHelpVisible(event, false);
  };

  return html`
    <div data-testid="save-base-url-option" class="tw-mx-3 tw-text-sm tw-text-main">
      <div class="tw-flex tw-items-center tw-gap-1">
        <label
          for="save-base-url-only"
          class="tw-flex tw-min-h-11 tw-cursor-pointer tw-items-center tw-gap-2"
        >
          <input
            id="save-base-url-only"
            type="checkbox"
            class=${checkboxInputClasses.join(" ")}
            style=${`--check-mask: ${checkboxCheckMask}`}
            .checked=${enabled}
            @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
          />
          ${i18n.saveBaseUrlOnly}
        </label>
        <div
          data-base-url-help
          class="tw-inline-flex"
          @mouseenter=${(event: Event) => setHelpVisible(event, true)}
          @mouseleave=${(event: Event) => {
            if (!(event.currentTarget as HTMLElement).contains(document.activeElement)) {
              setHelpVisible(event, false);
            }
          }}
          @focusin=${(event: FocusEvent) => {
            if ((event.target as HTMLElement).matches("button[aria-controls]")) {
              setHelpVisible(event, true);
            }
          }}
          @focusout=${(event: FocusEvent) => {
            if (
              !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)
            ) {
              setHelpVisible(event, false);
            }
          }}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Escape") {
              closeHelp(event);
            }
          }}
        >
          <button
            type="button"
            aria-label=${i18n.saveBaseUrlOnlyHelpLabel}
            aria-controls="save-base-url-only-help"
            aria-describedby="save-base-url-only-help-description"
            aria-haspopup="dialog"
            aria-expanded="false"
            class="tw-box-border tw-flex tw-size-4 tw-cursor-pointer tw-items-center tw-justify-center tw-border-0 tw-bg-transparent tw-p-0 tw-text-primary-600 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-primary-600"
            @click=${(event: Event) => setHelpVisible(event, true)}
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
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16v1" />
            </svg>
          </button>
          <div
            id="save-base-url-only-help"
            role="dialog"
            aria-labelledby="save-base-url-only-help-title"
            aria-describedby="save-base-url-only-help-description"
            hidden
            class="tw-fixed tw-z-30 tw-box-border"
          >
            <div
              class="tw-relative tw-z-20 tw-box-border tw-rounded-xl tw-border tw-border-solid tw-border-border-base tw-bg-bg-primary tw-p-6 tw-shadow-md"
            >
              <button
                type="button"
                aria-label=${i18n.close}
                class="tw-absolute tw-right-3 tw-top-3 tw-flex tw-size-8 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-transparent tw-p-0 tw-text-fg-heading focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-primary-600"
                @click=${closeHelp}
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
              <h2
                id="save-base-url-only-help-title"
                class="tw-m-0 tw-mb-3 tw-pe-7 tw-text-xl tw-font-medium tw-leading-7 tw-text-fg-heading"
              >
                ${i18n.saveBaseUrlOnlyHelpTitle}
              </h2>
              <p
                id="save-base-url-only-help-description"
                class="tw-m-0 tw-text-sm tw-leading-5 tw-text-fg-body"
              >
                ${i18n.saveBaseUrlOnlyHelp}
              </p>
            </div>
            <span
              class="bit-popover-arrow tw-box-border tw-border-0 tw-bg-bg-primary"
              aria-hidden="true"
            ></span>
          </div>
        </div>
      </div>
      <div class="tw-ms-8 tw-space-y-1 tw-text-xs tw-text-muted" aria-live="polite">
        ${
          enabled
            ? html`<div class="tw-truncate tw-line-through" title=${uri}>${uri}</div>`
            : nothing
        }
        <div class="tw-truncate" title=${savedUri}>
          ${i18n.saveBaseUrlOnlySavedAs}
          <span class="tw-font-semibold tw-text-main">${savedUri}</span>
        </div>
      </div>
    </div>
  `;
}
