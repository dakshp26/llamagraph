import { beforeEach, describe, expect, it } from "vitest";

import { useValidationStore } from "@/store/validationStore";

describe("validationStore", () => {
  beforeEach(() => {
    useValidationStore.setState({
      ollamaOnline: true,
      graphValid: true,
      issues: [],
      validationBannerDismissed: false,
    });
  });

  it("re-opens the validation banner when issues change after dismiss", () => {
    useValidationStore.getState().setGraphValidation(false, [
      { node_id: "a", message: "first" },
    ]);
    useValidationStore.getState().dismissValidationBanner();
    expect(useValidationStore.getState().validationBannerDismissed).toBe(true);

    useValidationStore.getState().setGraphValidation(false, [
      { node_id: "b", message: "second" },
    ]);
    expect(useValidationStore.getState().validationBannerDismissed).toBe(false);
  });

  it("clears dismiss state when the graph becomes valid", () => {
    useValidationStore.getState().dismissValidationBanner();
    useValidationStore.getState().setGraphValidation(true, []);
    expect(useValidationStore.getState().validationBannerDismissed).toBe(false);
  });
});
