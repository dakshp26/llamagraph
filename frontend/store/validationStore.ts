import { create } from "zustand";

import type { ValidationErrorItem } from "@/types/pipeline";

function issuesKey(issues: ValidationErrorItem[]): string {
  return [...issues]
    .map((i) => `${i.node_id ?? ""}\0${i.message}`)
    .sort()
    .join("|");
}

export interface ValidationUiState {
  ollamaOnline: boolean;
  graphValid: boolean;
  issues: ValidationErrorItem[];
  validationBannerDismissed: boolean;
  setOllamaOnline: (online: boolean) => void;
  setGraphValidation: (valid: boolean, issues: ValidationErrorItem[]) => void;
  dismissValidationBanner: () => void;
}

export const useValidationStore = create<ValidationUiState>((set) => ({
  ollamaOnline: true,
  graphValid: true,
  issues: [],
  validationBannerDismissed: false,

  setOllamaOnline: (online) => set({ ollamaOnline: online }),

  setGraphValidation: (valid, issues) =>
    set((s) => ({
      graphValid: valid,
      issues,
      validationBannerDismissed: valid
        ? false
        : issuesKey(issues) === issuesKey(s.issues)
          ? s.validationBannerDismissed
          : false,
    })),

  dismissValidationBanner: () => set({ validationBannerDismissed: true }),
}));
