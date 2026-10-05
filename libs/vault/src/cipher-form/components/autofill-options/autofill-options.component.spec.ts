import { LiveAnnouncer } from "@angular/cdk/a11y";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import { ComponentFixture, fakeAsync, TestBed, tick } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";
import { BehaviorSubject } from "rxjs";

import { AutofillSettingsServiceAbstraction } from "@bitwarden/common/autofill/services/autofill-settings.service";
import { DomainSettingsService } from "@bitwarden/common/autofill/services/domain-settings.service";
import { DeviceType } from "@bitwarden/common/enums";
import { FeatureFlag } from "@bitwarden/common/enums/feature-flag.enum";
import { UriMatchStrategy } from "@bitwarden/common/models/domain/domain-service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { LoginUriView } from "@bitwarden/common/vault/models/view/login-uri.view";
import { LoginView } from "@bitwarden/common/vault/models/view/login.view";

import { DESKTOP_APP_URI_PREFIX } from "../../../models/desktop-app-uri.constants";
import { CipherFormContainer } from "../../cipher-form-container";

import { AutofillOptionsComponent } from "./autofill-options.component";

jest.mock("@angular/cdk/drag-drop", () => {
  const actual = jest.requireActual("@angular/cdk/drag-drop");
  return {
    ...actual,
    moveItemInArray: jest.fn(actual.moveItemInArray),
  };
});

describe("AutofillOptionsComponent", () => {
  let component: AutofillOptionsComponent;
  let fixture: ComponentFixture<AutofillOptionsComponent>;

  let cipherFormContainer: MockProxy<CipherFormContainer>;
  let liveAnnouncer: MockProxy<LiveAnnouncer>;
  let domainSettingsService: MockProxy<DomainSettingsService>;
  let autofillSettingsService: MockProxy<AutofillSettingsServiceAbstraction>;
  let platformUtilsService: MockProxy<PlatformUtilsService>;
  let configService: MockProxy<ConfigService>;
  let mvpFeatureFlagSubject: BehaviorSubject<boolean>;
  let gaFeatureFlagSubject: BehaviorSubject<boolean>;
  const getInitialCipherView = jest.fn((): any => null);
  const formStatusChange$ = new BehaviorSubject<"enabled" | "disabled">("enabled");

  beforeEach(async () => {
    getInitialCipherView.mockClear();
    cipherFormContainer = mock<CipherFormContainer>({ getInitialCipherView });
    cipherFormContainer.formStatusChange$ = formStatusChange$.asObservable();
    liveAnnouncer = mock<LiveAnnouncer>();
    platformUtilsService = mock<PlatformUtilsService>();
    mvpFeatureFlagSubject = new BehaviorSubject<boolean>(false);
    gaFeatureFlagSubject = new BehaviorSubject<boolean>(false);
    configService = mock<ConfigService>();
    domainSettingsService = mock<DomainSettingsService>();
    domainSettingsService.resolvedDefaultUriMatchStrategy$ = new BehaviorSubject(null);

    autofillSettingsService = mock<AutofillSettingsServiceAbstraction>();
    autofillSettingsService.setSaveBaseUrlOnly.mockResolvedValue(undefined);
    autofillSettingsService.autofillOnPageLoadDefault$ = new BehaviorSubject(false);
    autofillSettingsService.autofillOnPageLoad$ = new BehaviorSubject(true);

    await TestBed.configureTestingModule({
      imports: [AutofillOptionsComponent],
      providers: [
        { provide: CipherFormContainer, useValue: cipherFormContainer },
        {
          provide: I18nService,
          useValue: { t: (...keys: string[]) => keys.filter(Boolean).join(" ") },
        },
        { provide: LiveAnnouncer, useValue: liveAnnouncer },
        { provide: DomainSettingsService, useValue: domainSettingsService },
        { provide: AutofillSettingsServiceAbstraction, useValue: autofillSettingsService },
        { provide: PlatformUtilsService, useValue: platformUtilsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AutofillOptionsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("base URL capture option", () => {
    const originalUri = "https://tenant.example.com:8080/login?token=secret#session";
    const origin = "https://tenant.example.com:8080";

    function initialize(enabled = false, uri = originalUri, original = originalUri) {
      cipherFormContainer.config.mode = "add";
      cipherFormContainer.config.initialValues = { loginUri: uri };
      cipherFormContainer.config.saveBaseUrlOnly = { enabled, originalUri: original };
      // Configuration is normally available before the child component is constructed.
      fixture = TestBed.createComponent(AutofillOptionsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    }

    async function toggle(enabled: boolean) {
      const checkbox = fixture.nativeElement.querySelector(
        "#save-base-url-only",
      ) as HTMLInputElement;
      checkbox.checked = enabled;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it.each([true, false])("shows the remembered choice %s and its URI", (enabled) => {
      initialize(enabled);
      const checkbox = fixture.nativeElement.querySelector(
        "#save-base-url-only",
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(enabled);
      expect(checkbox.getAttribute("aria-describedby")).toBe("save-base-url-only-desc");
      expect(fixture.nativeElement.querySelector("#save-base-url-only-desc").textContent).toContain(
        "saveBaseUrlOnlyDesc",
      );
      expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBe(
        enabled ? origin : originalUri,
      );
    });

    it("trims and restores every website URI, preserves matching, and persists", async () => {
      initialize();
      const first = component.autofillOptionsForm.controls.uris.at(0);
      first.setValue({ uri: originalUri, matchDetection: UriMatchStrategy.Exact });
      component.addUri({ uri: "https://other.example.com/path", matchDetection: null });

      await toggle(true);
      expect(first.value).toEqual({ uri: origin, matchDetection: UriMatchStrategy.Exact });
      expect(first.dirty).toBe(true);
      expect(component.autofillOptionsForm.controls.uris.at(1).value.uri).toBe(
        "https://other.example.com",
      );
      expect(autofillSettingsService.setSaveBaseUrlOnly).toHaveBeenLastCalledWith(true);
      expect(cipherFormContainer.config.saveBaseUrlOnly.enabled).toBe(true);

      await toggle(false);
      expect(first.value.uri).toBe(originalUri);
      expect(component.autofillOptionsForm.controls.uris.at(1).value.uri).toBe(
        "https://other.example.com/path",
      );
      expect(autofillSettingsService.setSaveBaseUrlOnly).toHaveBeenLastCalledWith(false);
      expect(cipherFormContainer.config.saveBaseUrlOnly.enabled).toBe(false);
    });

    it("restores the captured full URL when the prefilled URI was already trimmed", async () => {
      initialize(true, origin);
      await toggle(false);
      expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBe(originalUri);
    });

    it("shows one checkbox after all websites and before Add website", () => {
      initialize();
      component.addUri({ uri: "https://other.example.com/login", matchDetection: null });
      fixture.detectChanges();
      const rows = fixture.nativeElement.querySelectorAll("vault-autofill-uri-option");
      const checkbox = fixture.nativeElement.querySelector("#save-base-url-only");
      const addWebsite = fixture.nativeElement.querySelector("button[bitLink]");

      expect(fixture.nativeElement.querySelectorAll("#save-base-url-only")).toHaveLength(1);
      expect(rows[rows.length - 1].compareDocumentPosition(checkbox)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
      expect(checkbox.compareDocumentPosition(addWebsite)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it("initializes and restores every prefilled website when the remembered choice is on", async () => {
      const cipher = new CipherView();
      cipher.login.uris = [originalUri, "http://192.168.1.100:8080/path?token=secret"].map((uri) =>
        Object.assign(new LoginUriView(), { uri, match: UriMatchStrategy.Exact }),
      );
      getInitialCipherView.mockReturnValueOnce(cipher);
      initialize(true);

      expect(component.autofillOptionsForm.value.uris.map((value) => value.uri)).toEqual([
        origin,
        "http://192.168.1.100:8080",
      ]);
      await toggle(false);
      expect(component.autofillOptionsForm.value.uris.map((value) => value.uri)).toEqual([
        originalUri,
        "http://192.168.1.100:8080/path?token=secret",
      ]);
    });

    it("trims newly added websites and restores their original URLs", async () => {
      initialize(true);
      const addedUri = "https://second.example.com:8443/login?token=secret#session";
      component.addUri({ uri: addedUri, matchDetection: UriMatchStrategy.Host });
      expect(component.autofillOptionsForm.controls.uris.at(1).value).toEqual({
        uri: "https://second.example.com:8443",
        matchDetection: UriMatchStrategy.Host,
      });

      await toggle(false);
      expect(component.autofillOptionsForm.controls.uris.at(1).value.uri).toBe(addedUri);
    });

    it("lets users finish typing a new website, then trims it on blur and can restore it", async () => {
      initialize(true);
      component.addUri();
      fixture.detectChanges();
      const inputs = fixture.nativeElement.querySelectorAll("vault-autofill-uri-option input");
      const uriInput = inputs[inputs.length - 1] as HTMLInputElement;
      const typedUri = "https://second.example.com/login?token=secret";
      uriInput.value = typedUri;
      uriInput.dispatchEvent(new Event("input", { bubbles: true }));
      expect(component.autofillOptionsForm.controls.uris.at(1).value.uri).toBe(typedUri);

      uriInput.dispatchEvent(new Event("blur"));
      fixture.detectChanges();
      expect(uriInput.value).toBe("https://second.example.com");
      const patchCipher = cipherFormContainer.patchCipher.mock.lastCall[0];
      expect(patchCipher(new CipherView()).login.uris[1].uri).toBe("https://second.example.com");

      await toggle(false);
      expect(component.autofillOptionsForm.controls.uris.at(1).value.uri).toBe(typedUri);
    });

    it("keeps original URLs with their fields after reordering and removal", async () => {
      initialize();
      const secondUri = "https://tenant.example.com:8080/second?token=other";
      const thirdUri = "https://third.example.com/login?token=third";
      component.addUri({ uri: secondUri, matchDetection: UriMatchStrategy.Exact });
      component.addUri({ uri: thirdUri, matchDetection: UriMatchStrategy.Host });
      await toggle(true);
      component.onUriItemDrop({ previousIndex: 1, currentIndex: 0 } as CdkDragDrop<HTMLDivElement>);
      component.removeUri(1);

      await toggle(false);
      expect(component.autofillOptionsForm.value.uris).toEqual([
        { uri: secondUri, matchDetection: UriMatchStrategy.Exact },
        { uri: thirdUri, matchDetection: UriMatchStrategy.Host },
      ]);
    });

    it("updates the current choice immediately while preference writes are pending", async () => {
      let finishFirstWrite: () => void;
      autofillSettingsService.setSaveBaseUrlOnly.mockImplementationOnce(
        () => new Promise<void>((resolve) => (finishFirstWrite = resolve)),
      );
      initialize();
      component["saveBaseUrlOnlyControl"].setValue(true);
      component["saveBaseUrlOnlyControl"].setValue(false);

      expect(cipherFormContainer.config.saveBaseUrlOnly.enabled).toBe(false);
      expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBe(originalUri);

      finishFirstWrite();
      await fixture.whenStable();
      expect(autofillSettingsService.setSaveBaseUrlOnly).toHaveBeenLastCalledWith(false);
    });

    it("preserves manually edited URLs when unchecking and trims their latest value when rechecking", async () => {
      initialize(true);
      const first = component.autofillOptionsForm.controls.uris.at(0);
      const editedUri = "https://custom.example.com:8080/other?token=latest";
      first.setValue({ ...first.value, uri: editedUri });

      await toggle(false);
      expect(first.value.uri).toBe(editedUri);
      await toggle(true);
      expect(first.value.uri).toBe("https://custom.example.com:8080");
      await toggle(false);
      expect(first.value.uri).toBe(editedUri);
    });

    it("preserves non-HTTP URLs", async () => {
      const uri = "androidapp://com.example/login?token=secret";
      initialize(false, uri, uri);
      await toggle(true);
      expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBe(uri);
    });

    it("remembers the preference even when the first URI is empty", async () => {
      initialize(false, null, null);
      await toggle(true);
      expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBeNull();
      expect(autofillSettingsService.setSaveBaseUrlOnly).toHaveBeenCalledWith(true);
    });

    it("disables the control during form submission", () => {
      initialize();
      formStatusChange$.next("disabled");
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("#save-base-url-only").disabled).toBe(true);
      formStatusChange$.next("enabled");
    });

    it.each(["edit", "partial-edit", "clone"] as const)(
      "hides the option and preserves the URI in %s mode",
      (mode) => {
        initialize(false);
        cipherFormContainer.config.mode = mode;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector("#save-base-url-only")).toBeNull();
        expect(component.autofillOptionsForm.controls.uris.at(0).value.uri).toBe(originalUri);
      },
    );

    it("omits the control when the client has not configured the browser feature", () => {
      cipherFormContainer.config.mode = "add";
      cipherFormContainer.config.saveBaseUrlOnly = undefined;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector("#save-base-url-only")).toBeNull();
    });
  });

  it("registers 'autoFillOptionsForm' form with CipherFormContainer", () => {
    fixture.detectChanges();
    expect(cipherFormContainer.registerChildForm).toHaveBeenCalledWith(
      "autoFillOptions",
      component.autofillOptionsForm,
    );
  });

  it("patches 'autoFillOptionsForm' changes to CipherFormContainer", () => {
    fixture.detectChanges();

    component.autofillOptionsForm.patchValue({
      uris: [{ uri: "https://example.com", matchDetection: UriMatchStrategy.Exact }],
      autofillOnPageLoad: true,
    });

    expect(cipherFormContainer.patchCipher).toHaveBeenCalled();
    const patchFn = cipherFormContainer.patchCipher.mock.lastCall[0];

    const updatedCipher = patchFn(new CipherView());

    const expectedUri = Object.assign(new LoginUriView(), {
      uri: "https://example.com",
      match: UriMatchStrategy.Exact,
    } as LoginUriView);

    expect(updatedCipher.login.uris).toEqual([expectedUri]);
    expect(updatedCipher.login.autofillOnPageLoad).toEqual(true);
  });

  it("disables 'autoFillOptionsForm' when in partial-edit mode", () => {
    cipherFormContainer.config.mode = "partial-edit";

    fixture.detectChanges();

    expect(component.autofillOptionsForm.disabled).toBe(true);
  });

  it("initializes 'autoFillOptionsForm' with original login view values", () => {
    const existingLogin = new LoginUriView();
    existingLogin.uri = "https://example.com";
    existingLogin.match = UriMatchStrategy.Exact;

    const cipher = new CipherView();
    cipher.login = {
      autofillOnPageLoad: true,
      uris: [existingLogin],
    } as LoginView;

    getInitialCipherView.mockReturnValueOnce(cipher);

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris).toEqual([
      { uri: "https://example.com", matchDetection: UriMatchStrategy.Exact },
    ]);
    expect(component.autofillOptionsForm.value.autofillOnPageLoad).toEqual(true);
  });

  it("initializes 'autoFillOptionsForm' with initialValues when creating a new cipher", () => {
    cipherFormContainer.config.initialValues = { loginUri: "https://example.com" };

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris).toEqual([
      { uri: "https://example.com", matchDetection: null },
    ]);
    expect(component.autofillOptionsForm.value.autofillOnPageLoad).toEqual(null);
  });

  it("initializes 'autoFillOptionsForm' with initialValues when editing an existing cipher", () => {
    cipherFormContainer.config.initialValues = { loginUri: "https://new-website.com" };
    const existingLogin = new LoginUriView();
    existingLogin.uri = "https://example.com";
    existingLogin.match = UriMatchStrategy.Exact;

    const cipher = new CipherView();
    cipher.login = {
      autofillOnPageLoad: true,
      uris: [existingLogin],
    } as LoginView;

    getInitialCipherView.mockReturnValueOnce(cipher);

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris).toEqual([
      { uri: "https://example.com", matchDetection: UriMatchStrategy.Exact },
      { uri: "https://new-website.com", matchDetection: null },
    ]);
    expect(component.autofillOptionsForm.value.autofillOnPageLoad).toEqual(true);
  });

  it("initializes 'autoFillOptionsForm' with initialValues without duplicating an existing URI", () => {
    cipherFormContainer.config.initialValues = { loginUri: "https://example.com" };
    const existingLogin = new LoginUriView();
    existingLogin.uri = "https://example.com";
    existingLogin.match = UriMatchStrategy.Exact;

    const cipher = new CipherView();
    cipher.login = {
      autofillOnPageLoad: true,
      uris: [existingLogin],
    } as LoginView;

    getInitialCipherView.mockReturnValueOnce(cipher);

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris).toEqual([
      { uri: "https://example.com", matchDetection: UriMatchStrategy.Exact },
    ]);
    expect(component.autofillOptionsForm.value.autofillOnPageLoad).toEqual(true);
  });

  it("initializes 'autoFillOptionsForm' with an empty URI when creating a new cipher", () => {
    cipherFormContainer.config.initialValues = null;

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris).toEqual([{ uri: null, matchDetection: null }]);
  });

  it("updates the default autofill on page load label", () => {
    fixture.detectChanges();
    expect(component["autofillOptions"][0].label).toEqual("defaultLabelWithValue no");

    (autofillSettingsService.autofillOnPageLoadDefault$ as BehaviorSubject<boolean>).next(true);
    fixture.detectChanges();

    expect(component["autofillOptions"][0].label).toEqual("defaultLabelWithValue yes");
  });

  it("hides the autofill on page load field when the setting is disabled", () => {
    fixture.detectChanges();
    let control = fixture.nativeElement.querySelector(
      "bit-select[formControlName='autofillOnPageLoad']",
    );
    expect(control).toBeTruthy();

    (autofillSettingsService.autofillOnPageLoad$ as BehaviorSubject<boolean>).next(false);

    fixture.detectChanges();
    control = fixture.nativeElement.querySelector(
      "bit-select[formControlName='autofillOnPageLoad']",
    );
    expect(control).toBeFalsy();
  });

  it("announces the addition of a new URI input", fakeAsync(() => {
    fixture.detectChanges();

    // Mock the liveAnnouncer implementation so we can resolve it manually
    let resolveAnnouncer: () => void;
    jest.spyOn(liveAnnouncer, "announce").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAnnouncer = resolve;
        }),
    );

    component.addUri(undefined, true);
    fixture.detectChanges();

    expect(liveAnnouncer.announce).toHaveBeenCalledWith("websiteAdded", "polite");

    // Spy on the last URI input's focusInput method to ensure it is called
    jest.spyOn(component["uriOptions"].last, "focusInput");
    resolveAnnouncer(); // Resolve the liveAnnouncer promise so that focusOnNewInput$ pipe can continue
    tick();

    expect(component["uriOptions"].last.focusInput).toHaveBeenCalled();
  }));

  it("removes URI input when remove() is called", () => {
    fixture.detectChanges();

    // Add second Uri
    component.addUri(undefined, true);

    fixture.detectChanges();

    // Remove first Uri
    component.removeUri(0);

    fixture.detectChanges();

    expect(component.autofillOptionsForm.value.uris.length).toEqual(1);
  });

  it("does not emit events when status changes to prevent a `valueChanges` call", () => {
    fixture.detectChanges();

    const enable = jest.spyOn(component.autofillOptionsForm, "enable");
    const disable = jest.spyOn(component.autofillOptionsForm, "disable");

    formStatusChange$.next("disabled");
    fixture.detectChanges();

    expect(disable).toHaveBeenCalledWith({ emitEvent: false });

    formStatusChange$.next("enabled");
    fixture.detectChanges();

    expect(enable).toHaveBeenCalledWith({ emitEvent: false });
  });

  // Autotype App Tests
  describe("showAddAppDropdown", () => {
    it("is false when device type is not Windows Desktop", () => {
      fixture.detectChanges();

      expect(component["showAddAppDropdown"]()).toBe(false);
    });

    it("is false when device type is Windows Desktop but windows-desktop-autotype-ga feature flag is off", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      localFixture.detectChanges();

      expect(localFixture.componentInstance["showAddAppDropdown"]()).toBe(false);
    });

    it("is false when device is Windows Desktop and only the MVP feature flag is enabled", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );

      mvpFeatureFlagSubject.next(true);

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      localFixture.detectChanges();

      expect(localFixture.componentInstance["showAddAppDropdown"]()).toBe(false);
    });

    it("is true when device is Windows Desktop and windows-desktop-autotype-ga feature flag is on", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );

      gaFeatureFlagSubject.next(true);

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      localFixture.detectChanges();

      expect(localFixture.componentInstance["showAddAppDropdown"]()).toBe(true);
    });

    it("is false when device is Windows Desktop and both the MVP and GA feature flags are enabled", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );

      mvpFeatureFlagSubject.next(true);
      gaFeatureFlagSubject.next(true);

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      localFixture.detectChanges();

      expect(localFixture.componentInstance["showAddAppDropdown"]()).toBe(false);
    });
  });

  // Autotype App Tests
  describe("Add URI button", () => {
    it("renders a plain 'Add website' button when showAddAppDropdown is false", () => {
      fixture.detectChanges();

      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll("button"),
      ) as HTMLButtonElement[];
      const addWebsiteBtn = buttons.find((btn) => btn.textContent?.trim() === "addWebsite");
      const menu = fixture.nativeElement.querySelector("bit-menu");

      expect(addWebsiteBtn).toBeTruthy();
      expect(menu).toBeFalsy();
    });

    it("renders an 'Add website or app' dropdown button with 'Website' and 'App' options when showAddAppDropdown is true", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );

      gaFeatureFlagSubject.next(true);

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      localFixture.detectChanges();

      // Verify the trigger button is present
      const triggerBtn = Array.from(localFixture.nativeElement.querySelectorAll("button")).find(
        (btn: HTMLButtonElement) => btn.textContent?.trim() === "addWebsiteOrApp",
      ) as HTMLButtonElement;
      expect(triggerBtn).toBeTruthy();

      // Open the menu
      triggerBtn.click();
      localFixture.detectChanges();

      // Verify both options are present in the dropdown
      const menuButtons = Array.from(
        document.querySelectorAll(".cdk-overlay-container button"),
      ) as HTMLButtonElement[];
      const websiteBtn = menuButtons.find((btn) => btn.textContent?.trim() === "website");
      const appBtn = menuButtons.find((btn) => btn.textContent?.trim() === "app");

      expect(websiteBtn).toBeTruthy();
      expect(appBtn).toBeTruthy();
    });

    it("clicking 'App' menu item calls addUri with the desktopapp:// prefix", () => {
      platformUtilsService.getDevice.mockReturnValue(DeviceType.WindowsDesktop);
      configService.getFeatureFlag$.mockImplementation((flag: FeatureFlag) =>
        flag === FeatureFlag.WindowsDesktopAutotypeGA
          ? gaFeatureFlagSubject
          : mvpFeatureFlagSubject,
      );
      gaFeatureFlagSubject.next(true);

      const localFixture = TestBed.createComponent(AutofillOptionsComponent);
      const localComponent = localFixture.componentInstance;
      localFixture.detectChanges();

      jest.spyOn(localComponent, "addUri");

      // Open the menu by clicking the trigger button
      const triggerBtn = Array.from(localFixture.nativeElement.querySelectorAll("button")).find(
        (btn: HTMLButtonElement) => btn.textContent?.trim() === "addWebsiteOrApp",
      ) as HTMLButtonElement;
      expect(triggerBtn).toBeTruthy();
      triggerBtn.click();
      localFixture.detectChanges();

      // Menu content is rendered in the CDK overlay portal, not in the component's DOM
      const menuButtons = Array.from(
        document.querySelectorAll(".cdk-overlay-container button"),
      ) as HTMLButtonElement[];
      const appBtn = menuButtons.find((btn) => btn.textContent?.trim() === "app");
      expect(appBtn).toBeTruthy();
      appBtn.click();

      expect(localComponent.addUri).toHaveBeenCalledWith(
        { uri: DESKTOP_APP_URI_PREFIX, matchDetection: null },
        true,
      );
    });
  });

  describe("Drag & Drop Functionality", () => {
    beforeEach(() => {
      // Prevent auto‑adding an empty URI by setting a non‑null initial value.
      // This overrides the call to initNewCipher.

      // Now clear any existing URIs (including the auto‑added one)
      component.autofillOptionsForm.controls.uris.clear();

      // Add exactly three URIs that we want to test reordering on.
      component.addUri({ uri: "https://first.com", matchDetection: null });
      component.addUri({ uri: "https://second.com", matchDetection: null });
      component.addUri({ uri: "https://third.com", matchDetection: null });
      fixture.detectChanges();
    });

    it("should reorder URI inputs on drop event", () => {
      // Simulate a drop event that moves the first URI (index 0) to the last position (index 2).
      const dropEvent: CdkDragDrop<HTMLDivElement> = {
        previousIndex: 0,
        currentIndex: 2,
        container: null,
        previousContainer: null,
        isPointerOverContainer: true,
        item: null,
        distance: { x: 0, y: 0 },
      } as any;

      component.onUriItemDrop(dropEvent);
      fixture.detectChanges();

      expect(moveItemInArray).toHaveBeenCalledWith(
        component.autofillOptionsForm.controls.uris.controls,
        0,
        2,
      );
    });

    it("should reorder URI input via keyboard ArrowUp", async () => {
      // Clear and add exactly two URIs.
      component.autofillOptionsForm.controls.uris.clear();
      component.addUri({ uri: "https://first.com", matchDetection: null });
      component.addUri({ uri: "https://second.com", matchDetection: null });
      fixture.detectChanges();

      // Simulate pressing ArrowUp on the second URI (index 1)
      const keyEvent = {
        key: "ArrowUp",
        preventDefault: jest.fn(),
        target: document.createElement("button"),
      } as unknown as KeyboardEvent;

      // Force requestAnimationFrame to run synchronously
      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
        cb(new Date().getTime());
        return 0;
      });
      (liveAnnouncer.announce as jest.Mock).mockResolvedValue(null);

      await component.onUriItemKeydown(keyEvent, 1);
      fixture.detectChanges();

      expect(moveItemInArray).toHaveBeenCalledWith(
        component.autofillOptionsForm.controls.uris.controls,
        1,
        0,
      );
      expect(liveAnnouncer.announce).toHaveBeenCalledWith(
        "reorderFieldUp websiteUri 1 2",
        "assertive",
      );
    });

    it("should reorder URI input via keyboard ArrowDown", async () => {
      // Clear and add exactly three URIs.
      component.autofillOptionsForm.controls.uris.clear();
      component.addUri({ uri: "https://first.com", matchDetection: null });
      component.addUri({ uri: "https://second.com", matchDetection: null });
      component.addUri({ uri: "https://third.com", matchDetection: null });
      fixture.detectChanges();

      // Simulate pressing ArrowDown on the second URI (index 1)
      const keyEvent = {
        key: "ArrowDown",
        preventDefault: jest.fn(),
        target: document.createElement("button"),
      } as unknown as KeyboardEvent;

      jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
        cb(new Date().getTime());
        return 0;
      });
      (liveAnnouncer.announce as jest.Mock).mockResolvedValue(null);

      await component.onUriItemKeydown(keyEvent, 1);

      expect(moveItemInArray).toHaveBeenCalledWith(
        component.autofillOptionsForm.controls.uris.controls,
        1,
        2,
      );
      expect(liveAnnouncer.announce).toHaveBeenCalledWith(
        "reorderFieldDown websiteUri 3 3",
        "assertive",
      );
    });
  });
});
