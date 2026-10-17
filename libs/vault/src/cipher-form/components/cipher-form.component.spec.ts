import { ChangeDetectorRef } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { mock } from "jest-mock-extended";
import { Observable, of } from "rxjs";

import { ViewCacheService } from "@bitwarden/angular/platform/view-cache";
import { Account, AccountService } from "@bitwarden/common/auth/abstractions/account.service";
import { ConfigService } from "@bitwarden/common/platform/abstractions/config/config.service";
import { I18nService } from "@bitwarden/common/platform/abstractions/i18n.service";
import { CipherArchiveService } from "@bitwarden/common/vault/abstractions/cipher-archive.service";
import { CipherType } from "@bitwarden/common/vault/enums";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { AttachmentView } from "@bitwarden/common/vault/models/view/attachment.view";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";
import { Fido2CredentialView } from "@bitwarden/common/vault/models/view/fido2-credential.view";
import { LoginUriView } from "@bitwarden/common/vault/models/view/login-uri.view";
import { ToastService } from "@bitwarden/components";

import { CipherFormConfig } from "../abstractions/cipher-form-config.service";
import { CipherFormService } from "../abstractions/cipher-form.service";
import { CipherFormCacheService } from "../services/default-cipher-form-cache.service";

import { CipherFormComponent } from "./cipher-form.component";

describe("CipherFormComponent", () => {
  let component: CipherFormComponent;
  let fixture: ComponentFixture<CipherFormComponent>;

  const decryptCipher = jest.fn().mockResolvedValue(new CipherView());

  const mockAccountService = mock<AccountService>();
  const mockCipherArchiveService = mock<CipherArchiveService>();
  const mockAddEditFormService = { saveCipher: jest.fn(), decryptCipher };

  beforeEach(async () => {
    decryptCipher.mockClear();

    await TestBed.configureTestingModule({
      imports: [CipherFormComponent, ReactiveFormsModule],
      providers: [
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: I18nService, useValue: { t: (key: string) => key } },
        { provide: ToastService, useValue: { showToast: jest.fn() } },
        { provide: CipherFormService, useValue: mockAddEditFormService },
        {
          provide: CipherFormCacheService,
          useValue: { init: jest.fn(), getCachedCipherView: jest.fn(), clearCache: jest.fn() },
        },
        {
          provide: ViewCacheService,
          useValue: {
            signal: jest.fn(() => {
              const signalFn = (): any => null;
              signalFn.set = jest.fn();
              return signalFn;
            }),
          },
        },
        { provide: ConfigService, useValue: mock<ConfigService>() },
        { provide: AccountService, useValue: mockAccountService },
        { provide: CipherArchiveService, useValue: mockCipherArchiveService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CipherFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create the component", () => {
    expect(component).toBeTruthy();
  });

  describe("cached draft capture choice", () => {
    let cacheService: CipherFormCacheService;

    beforeEach(() => {
      cacheService = fixture.debugElement.injector.get(CipherFormCacheService);
      component.config = {
        mode: "add",
        cipherType: CipherType.Login,
        saveBaseUrlOnly: { enabled: true },
      } as CipherFormConfig;
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].type = CipherType.Login;
    });

    function cacheDraft(type = CipherType.Login, enabled: boolean | null = false) {
      const draft = new CipherView();
      draft.type = type;
      jest.spyOn(cacheService, "getCachedCipherView").mockReturnValue(draft);
      jest.spyOn(cacheService, "getCachedSaveBaseUrlOnly").mockReturnValue(enabled);
      return draft;
    }

    it("restores a notification's false choice and preserves its full URL through submission", async () => {
      const draft = cacheDraft();
      const uri = "https://example.com/login?token=secret#session";
      draft.login.uris = [Object.assign(new LoginUriView(), { uri })];
      component.config.organizationDataOwnershipDisabled = true;

      component.setInitialCipherFromCache();
      const website = new FormControl({ uri, matchDetection: null });
      component.registerChildForm(
        "autoFillOptions",
        new FormGroup({
          uris: new FormArray([website]),
          autofillOnPageLoad: new FormControl(false),
        }),
      );
      component.beforeSubmit = jest.fn(async () => false);

      await component.submit();

      expect(component["updatedCipherView"]).toBe(draft);
      expect(component.config.saveBaseUrlOnly.enabled).toBe(false);
      expect(website.value.uri).toBe(uri);
      expect(draft.login.uris[0].uri).toBe(uri);
    });

    it("keeps the current default for a legacy draft without a cached choice", () => {
      cacheDraft(CipherType.Login, null);

      component.setInitialCipherFromCache();

      expect(component.config.saveBaseUrlOnly.enabled).toBe(true);
    });

    it("ignores the choice from a draft of another type", () => {
      const draft = cacheDraft(CipherType.Card);

      component.setInitialCipherFromCache();

      expect(component["updatedCipherView"]).not.toBe(draft);
      expect(component.config.saveBaseUrlOnly.enabled).toBe(true);
    });

    it("does not add the option to a client that has not configured it", () => {
      cacheDraft();
      component.config.saveBaseUrlOnly = undefined;

      component.setInitialCipherFromCache();

      expect(component.config.saveBaseUrlOnly).toBeUndefined();
    });

    it.each(["edit", "partial-edit", "clone"] as const)(
      "does not restore the capture choice in %s mode",
      (mode) => {
        component.config.mode = mode;
        cacheDraft();

        component.setInitialCipherFromCache();

        expect(component.config.saveBaseUrlOnly.enabled).toBe(true);
      },
    );

    it("clears the old draft choice when fresh notification data is supplied", () => {
      cacheDraft();
      component.config.initialValues = { username: "new-notification-user" };
      const clear = jest.spyOn(cacheService, "clearCache");

      component.setInitialCipherFromCache();

      expect(clear).toHaveBeenCalled();
      expect(component.config.saveBaseUrlOnly.enabled).toBe(true);
    });

    it("caches the current choice even when no URI changes", () => {
      component.config.saveBaseUrlOnly.enabled = false;
      const cache = jest.spyOn(cacheService, "cacheCipherView");

      component.patchCipher((cipher) => cipher);

      expect(cache).toHaveBeenCalledWith(component["updatedCipherView"], false);
    });
  });

  it("normalizes all website URLs before verification, preserving matching, app URLs, and other fields", async () => {
    component.config = {
      mode: "add",
      cipherType: CipherType.Login,
      organizationDataOwnershipDisabled: true,
      saveBaseUrlOnly: { enabled: true },
    } as CipherFormConfig;
    const firstUri = new FormControl({
      uri: "https://example.com/login?token=secret",
      matchDetection: 1,
    });
    const secondUri = new FormControl({
      uri: "http://192.168.1.100:8080/path?token=secret#session",
      matchDetection: 0,
    });
    const appUri = new FormControl({ uri: "androidapp://com.example/login", matchDetection: null });
    const emptyUri = new FormControl({ uri: null, matchDetection: null });
    const group = new FormGroup({
      uris: new FormArray([firstUri, secondUri, appUri, emptyUri]),
      autofillOnPageLoad: new FormControl(false),
    });
    component.registerChildForm("autoFillOptions", group);

    component.beforeSubmit = jest.fn(async () => {
      expect(firstUri.value.uri).toBe("https://example.com");
      expect(secondUri.value.uri).toBe("http://192.168.1.100:8080");
      return false;
    });

    await component.submit();

    expect(component.beforeSubmit).toHaveBeenCalled();

    expect(firstUri.value).toEqual({ uri: "https://example.com", matchDetection: 1 });
    expect(firstUri.dirty).toBe(true);
    expect(secondUri.value).toEqual({ uri: "http://192.168.1.100:8080", matchDetection: 0 });
    expect(secondUri.dirty).toBe(true);
    expect(appUri.value.uri).toBe("androidapp://com.example/login");
    expect(appUri.pristine).toBe(true);
    expect(emptyUri.value.uri).toBeNull();
    expect(group.controls.autofillOnPageLoad.value).toBe(false);
  });

  it.each([
    { mode: "edit", cipherType: CipherType.Login, saveBaseUrlOnly: { enabled: true } },
    { mode: "partial-edit", cipherType: CipherType.Login, saveBaseUrlOnly: { enabled: true } },
    { mode: "clone", cipherType: CipherType.Login, saveBaseUrlOnly: { enabled: true } },
    { mode: "add", cipherType: CipherType.Card, saveBaseUrlOnly: { enabled: true } },
    { mode: "add", cipherType: CipherType.Login, saveBaseUrlOnly: { enabled: false } },
    { mode: "add", cipherType: CipherType.Login, saveBaseUrlOnly: undefined },
  ])(
    "preserves URLs when submitting $mode/$cipherType with choice $saveBaseUrlOnly",
    async (config) => {
      component.config = { ...config, organizationDataOwnershipDisabled: true } as CipherFormConfig;
      const uri = "https://example.com/login?token=secret";
      const website = new FormControl({ uri, matchDetection: null });
      component.registerChildForm(
        "autoFillOptions",
        new FormGroup({
          uris: new FormArray([website]),
          autofillOnPageLoad: new FormControl(false),
        }),
      );
      component.beforeSubmit = jest.fn(async () => false);

      await component.submit();

      expect(component.beforeSubmit).toHaveBeenCalled();
      expect(website.value.uri).toBe(uri);
      expect(website.pristine).toBe(true);
    },
  );

  describe("submit", () => {
    beforeEach(() => {
      component.config = {
        mode: "edit",
        organizationDataOwnershipDisabled: true,
      } as CipherFormConfig;

      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].archivedDate = new Date();
    });

    it("should remove archivedDate when user cannot archive and cipher is archived", async () => {
      mockAccountService.activeAccount$ = of({ id: "user-id" }) as Observable<Account | null>;
      mockCipherArchiveService.userCanArchive$.mockReturnValue(of(false));
      mockAddEditFormService.saveCipher = jest.fn().mockResolvedValue(new CipherView());

      const originalArchivedDate = component["updatedCipherView"]?.archivedDate;
      expect(originalArchivedDate).not.toBeNull();

      await component.submit();

      expect(component["updatedCipherView"]?.archivedDate).toBeNull();
      expect(mockCipherArchiveService.userCanArchive$).toHaveBeenCalledWith("user-id");
    });

    it("shows an error toast and aborts when the policy applies but there are no eligible orgs", async () => {
      component.config = {
        mode: "add",
        organizationDataOwnershipDisabled: false,
        organizations: [],
      } as unknown as CipherFormConfig;

      const toastService = TestBed.inject(ToastService);
      const showToast = jest.spyOn(toastService, "showToast");
      mockAddEditFormService.saveCipher = jest.fn();
      const cipherSavedSpy = jest.fn();
      component.cipherSaved.subscribe(cipherSavedSpy);

      await component.submit();

      expect(showToast).toHaveBeenCalledWith({
        variant: "error",
        message: "cannotSaveItemNoConfirmedOrgs",
      });
      expect(mockAddEditFormService.saveCipher).not.toHaveBeenCalled();
      expect(cipherSavedSpy).not.toHaveBeenCalled();
    });
  });

  describe("website", () => {
    it("should return null if updatedCipherView is null", () => {
      component["updatedCipherView"] = null as any;
      expect(component.website).toBeNull();
    });

    it("should return null if updatedCipherView.login is undefined", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = undefined as any;
      expect(component.website).toBeNull();
    });

    it("should return null if updatedCipherView.login is null", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = null as any;
      expect(component.website).toBeNull();
    });

    it("should return null if updatedCipherView.login.uris is undefined", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = { uris: undefined } as any;
      expect(component.website).toBeNull();
    });

    it("should return null if updatedCipherView.login.uris is null", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = { uris: null } as any;
      expect(component.website).toBeNull();
    });

    it("should return null if updatedCipherView.login.uris is an empty array", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = { uris: [] } as any;
      expect(component.website).toBeNull();
    });

    it("should return updatedCipherView if login.uris contains at least one URI", () => {
      component["updatedCipherView"] = new CipherView();
      component["updatedCipherView"].login = { uris: [{ uri: "https://example.com" }] } as any;
      expect(component.website).toEqual("https://example.com");
    });
  });

  describe("clone", () => {
    const cipherView = new CipherView();
    cipherView.id = "test-id";
    cipherView.key = "existingCipherKey" as any;
    cipherView.login.fido2Credentials = [new Fido2CredentialView()];
    cipherView.attachments = [new AttachmentView()];

    beforeEach(() => {
      component.config = {
        mode: "clone",
        originalCipher: new Cipher(),
      } as CipherFormConfig;

      decryptCipher.mockResolvedValue(cipherView);
    });

    it("clears id on updatedCipherView", async () => {
      await component.ngOnInit();

      expect(component["updatedCipherView"]?.id).toBeNull();
    });

    it("clears key on updatedCipherView so a new cipher key is generated", async () => {
      await component.ngOnInit();

      expect(component["updatedCipherView"]?.key).toBeUndefined();
    });

    it("clears fido2Credentials on updatedCipherView", async () => {
      await component.ngOnInit();

      expect(component["updatedCipherView"]?.login.fido2Credentials).toBeNull();
    });

    it("clears attachments on updatedCipherView", async () => {
      await component.ngOnInit();

      expect(component["updatedCipherView"]?.attachments).toEqual([]);
    });

    it("does not clear archiveDate on updatedCipherView", async () => {
      cipherView.archivedDate = new Date();
      decryptCipher.mockResolvedValue(cipherView);

      await component.ngOnInit();

      expect(component["updatedCipherView"]?.archivedDate).toBe(cipherView.archivedDate);
    });
  });

  describe("enableFormFields", () => {
    beforeEach(() => {
      // disable the form so enabling occurs
      component.disableFormFields();
    });

    it("only enables the form when it is disabled", () => {
      jest.spyOn(component["cipherForm"], "enable");
      component.enableFormFields();

      expect(component["cipherForm"].enable).toHaveBeenCalled();

      component.enableFormFields();
      component.enableFormFields();

      // enable is only called once
      expect(component["cipherForm"].enable).toHaveBeenCalledTimes(1);
    });

    it("emits formStatusChange$", (done) => {
      component.formStatusChange$.subscribe((status) => {
        expect(status).toBe("enabled");
        done();
      });

      component.enableFormFields();
    });
  });
});
