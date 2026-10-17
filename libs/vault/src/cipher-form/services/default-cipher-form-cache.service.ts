import { inject, Injectable } from "@angular/core";
import { Jsonify } from "type-fest";

import { ViewCacheService } from "@bitwarden/angular/platform/view-cache";
import { CipherView } from "@bitwarden/common/vault/models/view/cipher.view";

const CIPHER_FORM_CACHE_KEY = "cipher-form-cache";
const SAVE_BASE_URL_ONLY_CACHE_KEY = "cipher-form-save-base-url-only";

@Injectable()
export class CipherFormCacheService {
  private viewCacheService: ViewCacheService = inject(ViewCacheService);

  /**
   * When true the `CipherFormCacheService` a cipher was stored in cache when the service was initialized.
   * Otherwise false, when the cache was empty.
   *
   * This is helpful to know the initial state of the cache as it can be populated quickly after initialization.
   */
  initializedWithValue: boolean;

  /**
   * The cipher form will overwrite the cache from various components when initialized
   * To prevent this, we store the initial value of the cache when the service is initialized
   */
  initialCacheValue: CipherView | null;

  private initialSaveBaseUrlOnly: boolean | null;

  private cipherCache = this.viewCacheService.signal<CipherView | null>({
    key: CIPHER_FORM_CACHE_KEY,
    initialValue: null,
    deserializer: CipherView.fromJSON,
  });

  private saveBaseUrlOnlyCache = this.viewCacheService.signal<boolean | null>({
    key: SAVE_BASE_URL_ONLY_CACHE_KEY,
    initialValue: null,
  });

  constructor() {
    this.initializedWithValue = !!this.cipherCache();
    this.initialCacheValue = this.cipherCache();
    this.initialSaveBaseUrlOnly = this.saveBaseUrlOnlyCache();
  }

  /**
   * Update the cache with the new CipherView.
   */
  cacheCipherView(cipherView: CipherView, saveBaseUrlOnly: boolean | null = null): void {
    // Create a new reference to force the signal to update
    // By default, signals use `Object.is` to determine equality
    // Docs: https://angular.dev/guide/signals#signal-equality-functions
    this.cipherCache.set(CipherView.fromJSON(cipherView as Jsonify<CipherView>));
    this.saveBaseUrlOnlyCache.set(saveBaseUrlOnly);
  }

  /**
   * Returns the cached CipherView when available.
   */
  getCachedCipherView(): CipherView | null {
    return this.initialCacheValue;
  }

  /** The capture choice for the initially cached draft, independent of the global default. */
  getCachedSaveBaseUrlOnly(): boolean | null {
    return this.initialSaveBaseUrlOnly;
  }

  /**
   * Clear the cached CipherView.
   */
  clearCache(): void {
    this.initialCacheValue = null;
    this.initialSaveBaseUrlOnly = null;
    this.cipherCache.set(null);
    this.saveBaseUrlOnlyCache.set(null);
  }
}
