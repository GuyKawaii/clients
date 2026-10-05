import { ComponentFixture, TestBed } from "@angular/core/testing";
import { mock, MockProxy } from "jest-mock-extended";
import { of } from "rxjs";

import { NudgesService } from "@bitwarden/angular/vault";
import { AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import {
  AutofillOverlayVisibility,
  BrowserClientVendors,
  ClearClipboardDelay,
} from "@bitwarden/common/autofill/constants";
import { AutofillSettingsServiceAbstraction } from "@bitwarden/common/autofill/services/autofill-settings.service";
import { DomainSettingsService } from "@bitwarden/common/autofill/services/domain-settings.service";
import { UriMatchStrategy } from "@bitwarden/common/models/domain/domain-service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { MessagingService } from "@bitwarden/common/platform/abstractions/messaging.service";
import { PlatformUtilsService } from "@bitwarden/common/platform/abstractions/platform-utils.service";
import { VaultSettingsService } from "@bitwarden/common/vault/abstractions/vault-settings/vault-settings.service";
import { RestrictedItemTypesService } from "@bitwarden/common/vault/services/restricted-item-types.service";
import { DialogService } from "@bitwarden/components";

import { BrowserApi } from "../../../platform/browser/browser-api";
import { AutofillBrowserSettingsService } from "../../services/autofill-browser-settings.service";

import { AutofillComponent } from "./autofill.component";

describe("Autofill settings base URL preference", () => {
  let fixture: ComponentFixture<AutofillComponent>;
  let settings: MockProxy<AutofillSettingsServiceAbstraction>;

  beforeEach(async () => {
    settings = mock<AutofillSettingsServiceAbstraction>();
    Object.assign(settings, {
      inlineMenuVisibility$: of(AutofillOverlayVisibility.Off),
      showInlineMenuIdentities$: of(true),
      showInlineMenuCards$: of(true),
      showInlineMenuSshKeys$: of(true),
      activateAutofillOnPageLoadFromPolicy$: of(false),
      autofillOnPageLoad$: of(false),
      autofillOnPageLoadDefault$: of(false),
      honorBitwardenIgnoreAttribute$: of(false),
      honorBitwardenAutofillAttribute$: of(false),
      enableContextMenu$: of(true),
      autoCopyTotp$: of(true),
      clearClipboardDelay$: of(ClearClipboardDelay.FiveMinutes),
      saveBaseUrlOnly$: of(false),
      showClipboardSettingUpdateNotification$: of(false),
    });
    settings.setSaveBaseUrlOnly.mockResolvedValue(undefined);
    const domainSettings = mock<DomainSettingsService>();
    Object.assign(domainSettings, {
      resolvedEnableFillAssist$: of(false),
      resolvedDefaultUriMatchStrategy$: of(UriMatchStrategy.Domain),
      defaultUriMatchStrategyPolicy$: of(null),
    });
    const accountService = mock<AccountService>();
    accountService.activeAccount$ = of(null);
    const configService = mock<ConfigService>();
    configService.getFeatureFlag$.mockReturnValue(of(false));
    const restrictedItems = mock<RestrictedItemTypesService>();
    Object.assign(restrictedItems, { restricted$: of([]) });
    const vaultSettings = mock<VaultSettingsService>();
    vaultSettings.showCardsCurrentTab$ = of(true);
    vaultSettings.showIdentitiesCurrentTab$ = of(true);
    const browserSettings = mock<AutofillBrowserSettingsService>();
    browserSettings.resumeGrantedPendingDefaultPasswordManagerApply.mockResolvedValue(null);
    const platformUtils = mock<PlatformUtilsService>();
    platformUtils.getAutofillKeyboardShortcut.mockResolvedValue("");
    jest.spyOn(BrowserApi, "getBrowserClientVendor").mockReturnValue(BrowserClientVendors.Unknown);

    await TestBed.configureTestingModule({
      imports: [AutofillComponent],
      providers: [
        { provide: AutofillSettingsServiceAbstraction, useValue: settings },
        { provide: DomainSettingsService, useValue: domainSettings },
        { provide: AccountService, useValue: accountService },
        { provide: ConfigService, useValue: configService },
        { provide: RestrictedItemTypesService, useValue: restrictedItems },
        { provide: VaultSettingsService, useValue: vaultSettings },
        { provide: AutofillBrowserSettingsService, useValue: browserSettings },
        { provide: PlatformUtilsService, useValue: platformUtils },
        { provide: I18nService, useValue: mock<I18nService>() },
        { provide: MessagingService, useValue: mock<MessagingService>() },
        { provide: DialogService, useValue: mock<DialogService>() },
        { provide: NudgesService, useValue: mock<NudgesService>() },
      ],
    })
      .overrideComponent(AutofillComponent, { set: { template: "" } })
      .compileComponents();
    fixture = TestBed.createComponent(AutofillComponent);
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([false, true])(
    "loads the persisted default %s without writing it back",
    async (value) => {
      settings.saveBaseUrlOnly$ = of(value);
      await fixture.componentInstance.ngOnInit();
      const control = fixture.componentInstance["additionalOptionsForm"].controls.saveBaseUrlOnly;
      expect(control.value).toBe(value);
      expect(settings.setSaveBaseUrlOnly).not.toHaveBeenCalled();
    },
  );

  it("persists a changed default immediately", async () => {
    await fixture.componentInstance.ngOnInit();
    const control = fixture.componentInstance["additionalOptionsForm"].controls.saveBaseUrlOnly;
    control.setValue(true);
    expect(settings.setSaveBaseUrlOnly).toHaveBeenCalledWith(true);
    await Promise.resolve();
    control.setValue(false);
    expect(settings.setSaveBaseUrlOnly).toHaveBeenLastCalledWith(false);
  });
});
