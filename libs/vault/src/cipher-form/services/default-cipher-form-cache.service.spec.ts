import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ViewCacheService } from "@bitwarden/angular/platform/view-cache";
import { Cipher } from "@bitwarden/common/vault/models/domain/cipher";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

import { CipherFormCacheService } from "./default-cipher-form-cache.service";

describe("CipherFormCacheService", () => {
  let service: CipherFormCacheService;
  let testBed: TestBed;
  const cacheSignal = signal<CipherView | null>(null);
  const saveBaseUrlOnlySignal = signal<boolean | null>(null);
  const getCacheSignal = jest.fn(({ key }) =>
    key === "cipher-form-cache" ? cacheSignal : saveBaseUrlOnlySignal,
  );
  const cacheSetMock = jest.spyOn(cacheSignal, "set");

  beforeEach(() => {
    cacheSignal.set(null);
    saveBaseUrlOnlySignal.set(null);
    getCacheSignal.mockClear();
    cacheSetMock.mockClear();

    testBed = TestBed.configureTestingModule({
      providers: [
        { provide: ViewCacheService, useValue: { signal: getCacheSignal } },
        CipherFormCacheService,
      ],
    });
  });

  describe("Cache Service", () => {
    it("`getCachedCipherView` returns the cipher", async () => {
      cacheSignal.set({ id: "cipher-4" } as CipherView);
      service = testBed.inject(CipherFormCacheService);

      expect(service.getCachedCipherView()).toEqual({ id: "cipher-4" });
    });

    it("updates the signal value", async () => {
      service = testBed.inject(CipherFormCacheService);

      service.cacheCipherView(new CipherView({ id: "cipher-5" } as Cipher));

      expect(cacheSignal.set).toHaveBeenCalledWith(expect.any(CipherView)); // Ensure we keep the CipherView prototype
      expect(cacheSignal.set).toHaveBeenCalledWith(expect.objectContaining({ id: "cipher-5" }));
    });

    it.each([true, false])("retains the draft capture choice %s after recreation", (enabled) => {
      service = testBed.inject(CipherFormCacheService);
      service.cacheCipherView(new CipherView(), enabled);

      const restoredService = TestBed.runInInjectionContext(() => new CipherFormCacheService());

      expect(restoredService.getCachedSaveBaseUrlOnly()).toBe(enabled);
      expect(restoredService.getCachedCipherView()).toBeInstanceOf(CipherView);
    });

    it("snapshots the initial choice before other sections update the draft", () => {
      cacheSignal.set(new CipherView());
      saveBaseUrlOnlySignal.set(false);
      service = testBed.inject(CipherFormCacheService);

      service.cacheCipherView(new CipherView(), true);

      expect(service.getCachedSaveBaseUrlOnly()).toBe(false);
    });

    it("clears the capture choice together with the draft", () => {
      cacheSignal.set(new CipherView());
      saveBaseUrlOnlySignal.set(false);
      service = testBed.inject(CipherFormCacheService);

      service.clearCache();

      expect(service.getCachedCipherView()).toBeNull();
      expect(service.getCachedSaveBaseUrlOnly()).toBeNull();
      expect(cacheSignal()).toBeNull();
      expect(saveBaseUrlOnlySignal()).toBeNull();
    });

    it("removes a previous choice when caching a draft without the capture option", () => {
      service = testBed.inject(CipherFormCacheService);
      service.cacheCipherView(new CipherView(), false);

      service.cacheCipherView(new CipherView());

      expect(saveBaseUrlOnlySignal()).toBeNull();
    });

    describe("initializedWithValue", () => {
      it("sets `initializedWithValue` to true when there is a cached cipher", async () => {
        cacheSignal.set({ id: "cipher-3" } as CipherView);
        service = testBed.inject(CipherFormCacheService);

        expect(service.initializedWithValue).toBe(true);
      });

      it("sets `initializedWithValue` to false when there is not a cached cipher", async () => {
        cacheSignal.set(null);
        service = testBed.inject(CipherFormCacheService);

        expect(service.initializedWithValue).toBe(false);
      });
    });
  });
});
