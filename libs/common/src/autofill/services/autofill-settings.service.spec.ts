import { mock } from "jest-mock-extended";
import { firstValueFrom } from "rxjs";

import { FakeStateProvider, mockAccountServiceWith } from "../../../spec";
import { PolicyService } from "../../admin-console/abstractions/policy/policy.service.abstraction";
import { UserId } from "../../types/guid";
import { RestrictedItemTypesService } from "../../vault/services/restricted-item-types.service";

import { AutofillSettingsService } from "./autofill-settings.service";

describe("AutofillSettingsService saveBaseUrlOnly", () => {
  const accountService = mockAccountServiceWith("user-id" as UserId);
  let stateProvider: FakeStateProvider;

  function createService() {
    return new AutofillSettingsService(
      stateProvider,
      mock<PolicyService>(),
      accountService,
      mock<RestrictedItemTypesService>(),
    );
  }

  beforeEach(() => {
    stateProvider = new FakeStateProvider(accountService);
  });

  it("defaults to unchecked when no preference has been stored", async () => {
    expect(await firstValueFrom(createService().saveBaseUrlOnly$)).toBe(false);
  });

  it("shares changes across settings and notification service instances", async () => {
    const settings = createService();
    const notification = createService();
    await settings.setSaveBaseUrlOnly(true);
    expect(await firstValueFrom(notification.saveBaseUrlOnly$)).toBe(true);
    await notification.setSaveBaseUrlOnly(false);
    expect(await firstValueFrom(settings.saveBaseUrlOnly$)).toBe(false);
  });

  it("loads the stored value when the settings service is recreated", async () => {
    await createService().setSaveBaseUrlOnly(true);
    expect(await firstValueFrom(createService().saveBaseUrlOnly$)).toBe(true);
  });
});
