const PALETTE = "flowai.paletteExpanded" as const;
const DEBUG = "flowai.debugExpanded" as const;

function parseTriState(raw: string | null): boolean | null {
  if (raw === "1") return true;
  if (raw === "0") return false;
  return null;
}

/** `null` in storage => use `matchMedia('(min-width: 768px)')` for default. */
export function readPaletteExpanded(): boolean {
  if (typeof window === "undefined") return true;
  const v = parseTriState(sessionStorage.getItem(PALETTE));
  if (v !== null) return v;
  return window.matchMedia("(min-width: 768px)").matches;
}

export function writePaletteExpanded(expanded: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PALETTE, expanded ? "1" : "0");
}

export function readDebugExpanded(): boolean {
  if (typeof window === "undefined") return true;
  const v = parseTriState(sessionStorage.getItem(DEBUG));
  if (v !== null) return v;
  return window.matchMedia("(min-width: 768px)").matches;
}

export function writeDebugExpanded(expanded: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DEBUG, expanded ? "1" : "0");
}

export const RAIL = {
  leftExpanded: 208,
  leftCollapsed: 48,
  rightExpanded: 320,
  rightCollapsed: 40,
} as const;
