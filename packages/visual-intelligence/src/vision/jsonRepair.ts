/**
 * Bounded repair of truncated model JSON.
 *
 * Free vision models sometimes stop mid-answer (finish_reason "length"),
 * leaving e.g. `{"explanation":"The CTA is hid` → "Unterminated string in
 * JSON". repairTruncatedJson() tries, in order:
 *   1. the text as-is (after stripping ``` fences);
 *   2. cutting back to the last element the model actually completed (before
 *      a `,`, or after a closing `}` / `]` / string) and closing the brackets
 *      that are still open.
 * The first candidate that parses wins. The work is bounded: at most
 * MAX_CANDIDATES cut points are tried, and input over MAX_INPUT_CHARS is not
 * repaired. It never invents or completes a value: a string or number that
 * was cut is dropped together with its field, never closed artificially.
 * Callers must still treat a repaired result as partial (incomplete coverage)
 * and validate that each kept item has all its required fields.
 */

const MAX_CANDIDATES = 400;
const MAX_INPUT_CHARS = 50_000;

export interface RepairResult {
  value: unknown;
  /** true when the text did not parse as-is and had to be closed/trimmed. */
  repaired: boolean;
}

/** Remove ```json fences (also an unclosed opening fence) and leading prose. */
export function extractJsonText(raw: string): string {
  let s = raw.trim();
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fenced) s = fenced[1].trim();
  const start = s.search(/[{[]/);
  return start >= 0 ? s.slice(start) : s;
}

interface ScanState {
  stack: string[];
  inString: boolean;
}

function scan(text: string): ScanState & { cutPoints: number[] } {
  const stack: string[] = [];
  const cutPoints: number[] = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') { inString = false; cutPoints.push(i + 1); }
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') { stack.pop(); cutPoints.push(i + 1); }
    else if (ch === ',') cutPoints.push(i); // cut before the comma
  }
  return { stack, inString, cutPoints };
}

function closeAndParse(prefix: string): unknown | undefined {
  let p = prefix.replace(/\s+$/, '');
  // A dangling `"key":` or trailing comma cannot be closed into valid JSON.
  p = p.replace(/,\s*$/, '');
  if (/:\s*$/.test(p)) return undefined;
  const { stack, inString } = scan(p);
  if (inString) return undefined;
  const candidate = p + stack.slice().reverse().join('');
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

export function repairTruncatedJson(raw: string): RepairResult | null {
  const text = extractJsonText(raw);
  if (!text) return null;
  try {
    return { value: JSON.parse(text), repaired: false };
  } catch {
    /* fall through to repair */
  }
  if (text.length > MAX_INPUT_CHARS) return null;

  const { cutPoints } = scan(text);

  // Cut back to the last complete element, newest first.
  const candidates = cutPoints.slice(-MAX_CANDIDATES).reverse();
  for (const cut of candidates) {
    const value = closeAndParse(text.slice(0, cut));
    if (value !== undefined) return { value, repaired: true };
  }
  return null;
}
