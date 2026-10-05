import { CipherView } from "../../models/view/cipher.view";
import { LoginUriView } from "../../models/view/login-uri.view";

import { ADD_EDIT_CIPHER_INFO_KEY } from "./ciphers.state";

describe("add/edit cipher info", () => {
  const uri = "https://example.com/login?token=secret#session";

  function serializeInfo(saveBaseUrlOnly: boolean, originalLoginUri?: string) {
    const cipher = new CipherView();
    cipher.name = "Example";
    cipher.login.uris = [Object.assign(new LoginUriView(), { uri })];
    return JSON.parse(
      JSON.stringify({ cipher, collectionIds: ["collection"], saveBaseUrlOnly, originalLoginUri }),
    );
  }

  it.each([true, false])("preserves the save choice %s across serialization", (enabled) => {
    const restored = ADD_EDIT_CIPHER_INFO_KEY.deserializer(serializeInfo(enabled, uri));

    expect(restored.cipher).toBeInstanceOf(CipherView);
    expect(restored.cipher.login.uris[0]).toBeInstanceOf(LoginUriView);
    expect(restored.cipher.login.uris[0].uri).toBe(uri);
    expect(restored.collectionIds).toEqual(["collection"]);
    expect(restored.originalLoginUri).toBe(uri);
    expect(restored.saveBaseUrlOnly).toBe(enabled);
  });

  it.each([true, false])(
    "preserves the save choice %s without original URL metadata",
    (enabled) => {
      const restored = ADD_EDIT_CIPHER_INFO_KEY.deserializer(serializeInfo(enabled));

      expect(restored.originalLoginUri).toBeUndefined();
      expect(restored.saveBaseUrlOnly).toBe(enabled);
    },
  );

  it("retains an existing cipher instance and supports legacy metadata", () => {
    const cipher = new CipherView();
    expect(ADD_EDIT_CIPHER_INFO_KEY.deserializer({ cipher })).toEqual({ cipher });
    expect(ADD_EDIT_CIPHER_INFO_KEY.deserializer({ cipher }).cipher).toBe(cipher);
  });

  it("preserves cleared state", () => {
    expect(ADD_EDIT_CIPHER_INFO_KEY.deserializer(null)).toBeNull();
  });
});
