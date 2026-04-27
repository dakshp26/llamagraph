/** User-facing copy for known backend validation messages. */
export function formatValidationMessage(message: string): string {
  const m = message.trim();
  if (/cycle/i.test(m) || /contains a cycle/i.test(m)) {
    return "Your pipeline has a loop. Remove one connection to fix it.";
  }
  return m;
}
