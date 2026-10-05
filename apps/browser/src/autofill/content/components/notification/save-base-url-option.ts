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
    const help = event.currentTarget as HTMLElement;
    const tooltip = help.querySelector<HTMLElement>("[role=tooltip]");
    if (tooltip) {
      tooltip.hidden = !visible;
    }
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
        <span
          class="tw-relative tw-inline-flex"
          @mouseenter=${(event: Event) => setHelpVisible(event, true)}
          @mouseleave=${(event: Event) => {
            if (!(event.currentTarget as HTMLElement).contains(document.activeElement)) {
              setHelpVisible(event, false);
            }
          }}
          @focusin=${(event: Event) => setHelpVisible(event, true)}
          @focusout=${(event: Event) => setHelpVisible(event, false)}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key === "Escape") {
              setHelpVisible(event, false);
            }
          }}
        >
          <button
            type="button"
            aria-label=${i18n.saveBaseUrlOnlyHelpLabel}
            aria-describedby="save-base-url-only-help"
            class="tw-box-border tw-flex tw-min-h-11 tw-min-w-11 tw-cursor-pointer tw-items-center tw-justify-center tw-rounded-full tw-border-0 tw-bg-transparent tw-text-primary-600 focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-primary-600"
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
          <span
            id="save-base-url-only-help"
            role="tooltip"
            hidden
            class="tw-absolute tw-bottom-full tw-right-0 tw-z-10 tw-box-border tw-w-52 tw-rounded-xl tw-bg-text-main tw-p-3 tw-text-xs tw-text-contrast tw-shadow-lg"
          >
            ${i18n.saveBaseUrlOnlyHelp}
          </span>
        </span>
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
