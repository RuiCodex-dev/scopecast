/** Maximum number of tasks accepted from a single paste. */
export const MAX_TASKS_PER_PASTE = 40;

export interface ParseResult {
  /** Task names in the order they appeared, de-duplicated. */
  names: string[];
  /** Number of usable lines dropped because the paste exceeded the limit. */
  skipped: number;
}

// Leading list markers: "-", "*", "•", "–", "1.", "1)", "(1)", "a)", "a.", "[ ]", "[x]".
const MARKER = /^\s*(?:[-*•–—]\s+|\(?\d{1,3}[.)]\s+|\(?[a-zA-Z][.)]\s+|\[[ xX]?\]\s+)+/;

/** Turns a pasted feature list into task names: one task per non-empty line. */
export function parseTaskList(text: string, existing: readonly string[] = []): ParseResult {
  const seen = new Set(existing.map((n) => n.trim().toLowerCase()));
  const names: string[] = [];
  let skipped = 0;

  for (const raw of text.split(/\r?\n/)) {
    const name = raw.replace(MARKER, '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (names.length >= MAX_TASKS_PER_PASTE) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    names.push(name.length > 120 ? `${name.slice(0, 117)}...` : name);
  }

  return { names, skipped };
}
