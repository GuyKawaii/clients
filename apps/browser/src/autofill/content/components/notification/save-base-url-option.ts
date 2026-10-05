import { html, nothing } from "lit";

import { trimToOriginUrl } from "@bitwarden/common/autofill/utils/trim-to-origin-url";
import { checkboxCheckMask, checkboxInputClasses } from "@bitwarden/components/checkbox-styles";

import { I18n } from "../common-types";
import { Popover } from "../popover/popover";

export type SaveBaseUrlOptionProps = {
  uri?: string;
  enabled: boolean;
  i18n: I18n;
  onChange: (enabled: boolean) => void;
};

/** A prompt-local choice; persistence belongs to the Autofill settings page. */
export function SaveBaseUrlOption({ uri, enabled, i18n, onChange }: SaveBaseUrlOptionProps) {
  if (!uri) {
    return nothing;
  }
  const originUri = trimToOriginUrl(uri);
  if (originUri === uri) {
    return nothing;
  }

  const savedUri = enabled ? originUri : uri;
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
            class=${[...checkboxInputClasses, "tw-m-0"].join(" ")}
            style=${`--check-mask: ${checkboxCheckMask}`}
            .checked=${enabled}
            @change=${(event: Event) => onChange((event.target as HTMLInputElement).checked)}
          />
          <span>${i18n.saveBaseUrlOnly}</span>
        </label>
        ${Popover({
          id: "save-base-url-only-help",
          title: i18n.saveBaseUrlOnlyHelpTitle,
          content: i18n.saveBaseUrlOnlyHelp,
          closeLabel: i18n.close,
          triggerLabel: i18n.saveBaseUrlOnlyHelpLabel,
          boundary: '[data-testid="save-notification-bar"]',
          triggerContent: html`
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
          `,
        })}
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
