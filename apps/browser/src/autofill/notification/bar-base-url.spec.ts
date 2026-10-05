import { render } from "lit";

import { trimToOriginUrl } from "@bitwarden/common/autofill/utils/trim-to-origin-url";

import { NotificationCipherData } from "../content/components/cipher/types";

import { initNotificationBar } from "./bar";

jest.mock("@lit-labs/signals", () => ({
  signal: jest.fn((value) => ({ get: () => value })),
}));
jest.mock("../content/components/notification/body", () => ({
  NotificationBody: () => null,
  componentClassPrefix: "body",
}));
jest.mock("../content/components/notification/header", () => ({
  NotificationHeader: () => null,
  componentClassPrefix: "header",
}));
jest.mock("../content/components/notification/footer", () => {
  const { html } = jest.requireActual("lit");
  return {
    NotificationFooter: ({ handleSaveAction }: { handleSaveAction: (e: Event) => void }) =>
      html`<button data-testid="save" @click=${handleSaveAction}>Save</button>`,
  };
});

describe("notification base URL preference", () => {
  let stored: boolean;
  let uri: string;

  beforeEach(() => {
    jest.clearAllMocks();
    stored = false;
    uri = "https://login.example.com:8443/oauth/callback?token=abc#id";
    (chrome.i18n.getMessage as jest.Mock).mockImplementation((key) => key);
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
      const responses: Record<string, unknown> = {
        bgGetSaveBaseUrlOnly: stored,
        bgGetDecryptedCiphers: [{ login: { uri } } as NotificationCipherData],
      };
      callback(responses[message.command] ?? []);
    });
  });

  afterEach(() => render(null, document.body));

  async function initialize(type: "add" | "change" = "add", isVaultLocked = false) {
    await initNotificationBar({
      command: "initNotificationBar",
      initData: { type, isVaultLocked },
    });
  }

  const checkbox = () => document.querySelector<HTMLInputElement>("#save-base-url-only")!;
  const save = () => document.querySelector<HTMLButtonElement>('[data-testid="save"]')!.click();

  it.each([false, true])("initializes from the saved default %s", async (defaultValue) => {
    stored = defaultValue;
    await initialize();
    expect(checkbox().checked).toBe(defaultValue);
    expect(document.querySelector('label[for="save-base-url-only"]')).not.toBeNull();
  });

  it("toggles only this save and resets the next prompt to the stored default", async () => {
    await initialize();
    checkbox().click();
    expect(checkbox().checked).toBe(true);
    save();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: "bgSaveCipher", saveBaseUrlOnly: true }),
      expect.any(Function),
    );
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ command: "bgSetSaveBaseUrlOnly" }),
      expect.any(Function),
    );
    await initialize();
    expect(checkbox().checked).toBe(false);
  });

  it("allows an enabled default to be overridden without persisting the override", async () => {
    stored = true;
    await initialize();
    checkbox().click();
    save();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: "bgSaveCipher", saveBaseUrlOnly: false }),
      expect.any(Function),
    );
    await initialize();
    expect(checkbox().checked).toBe(true);
  });

  it.each([
    "https://tenant.slack.com/login?token=abc#id",
    "http://192.168.1.100:8080/login",
    "https://login.example.com:8443/oauth/callback?token=abc#id",
    "https://user:pass@login.example.com:443/login?token=abc#id",
    "http://example.com:80/",
  ])("previews the same normalized URL that the save path uses: %s", async (pageUri) => {
    uri = pageUri;
    stored = true;
    await initialize();
    const preview = document.querySelector('[aria-live="polite"]')!;
    expect(preview.querySelector(".tw-line-through")?.textContent).toBe(uri);
    expect(preview.querySelector("span")?.textContent).toBe(trimToOriginUrl(uri));
    checkbox().click();
    expect(preview.querySelector(".tw-line-through")).toBeNull();
    expect(preview.querySelector("span")?.textContent).toBe(uri);
    save();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: "bgSaveCipher", saveBaseUrlOnly: false }),
      expect.any(Function),
    );
  });

  it.each([
    "https://example.com",
    "http://localhost:8080",
    "androidapp://example/login",
    "https://",
    "not a URL",
  ])("hides the entire block for unchanged, unsupported or invalid URLs: %s", async (pageUri) => {
    uri = pageUri;
    await initialize();
    expect(document.querySelector('[data-testid="save-base-url-option"]')).toBeNull();
  });

  it("hides the option in the password update flow", async () => {
    await initialize("change");
    expect(document.querySelector('[data-testid="save-base-url-option"]')).toBeNull();
  });

  it("lets the background resolve the preference while the vault is locked", async () => {
    await initialize("add", true);
    expect(document.querySelector('[data-testid="save-base-url-option"]')).toBeNull();
    save();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ command: "bgSaveCipher", saveBaseUrlOnly: undefined }),
      expect.any(Function),
    );
  });

  it("opens help on hover or keyboard focus and closes on leave, blur and Escape", async () => {
    await initialize();
    const button = document.querySelector<HTMLButtonElement>(
      '[aria-describedby="save-base-url-only-help"]',
    )!;
    const help = button.parentElement!;
    const tooltip = document.getElementById(button.getAttribute("aria-describedby")!)!;
    expect(button.getAttribute("aria-label")).toBe("saveBaseUrlOnlyHelpLabel");
    expect(tooltip.getAttribute("role")).toBe("tooltip");
    expect(tooltip.hidden).toBe(true);
    help.dispatchEvent(new MouseEvent("mouseenter"));
    expect(tooltip.hidden).toBe(false);
    help.dispatchEvent(new MouseEvent("mouseleave"));
    expect(tooltip.hidden).toBe(true);
    button.focus();
    expect(tooltip.hidden).toBe(false);
    button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(tooltip.hidden).toBe(true);
    button.blur();
    button.focus();
    expect(tooltip.hidden).toBe(false);
    button.blur();
    expect(tooltip.hidden).toBe(true);
  });
});
