/**
 * Voice-of-customer helpers. Kept free of server imports: the same masking and
 * patterns run on the server before analysis and in the review step on generated copy.
 */

/** Company contact details that are public on purpose and must not be treated as personal data. */
export const PII_WHITELIST = ["1877-3836", "tlinkcrm.com", "blog.naver.com/mobilecrm"];

const PATTERNS: { label: string; re: RegExp }[] = [
  // Resident registration number first, so its digits are not half-matched as a phone number.
  { label: "주민번호", re: /(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)/g },
  { label: "휴대폰번호", re: /(?<!\d)01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g },
  { label: "전화번호", re: /(?<!\d)0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g },
  { label: "이메일", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
];

const whitelisted = (match: string) => PII_WHITELIST.some((w) => match.includes(w) || w.includes(match));

/** Personal data found in a text, as (kind, matched string) pairs. */
export function findPII(text: string): { label: string; match: string }[] {
  const found: { label: string; match: string }[] = [];
  let rest = text;
  for (const { label, re } of PATTERNS) {
    rest = rest.replace(re, (m) => {
      if (whitelisted(m)) return m;
      found.push({ label, match: m });
      // Blank it out so a later, broader pattern does not report the same digits again.
      return " ".repeat(m.length);
    });
  }
  return found;
}

/** Replaces phone numbers, emails and resident numbers before any text leaves for analysis. */
export function maskPII(text: string): string {
  let out = text;
  for (const { label, re } of PATTERNS) out = out.replace(re, (m) => (whitelisted(m) ? m : `[${label}]`));
  return out;
}

/** Pasted text -> one entry per call; calls are separated by blank lines. */
export function splitSummaries(text: string): string[] {
  return text.split(/\r?\n\s*\r?\n/).map((s) => s.trim()).filter((s) => s.length >= 5);
}

const squash = (s: string) => s.replace(/\s+/g, "");

/** True when `text` reuses a stretch of an internal quote (12+ characters, ignoring whitespace). */
export function containsQuote(text: string, quotes: string[], minLen = 12): string | null {
  const hay = squash(text);
  for (const q of quotes) {
    const needle = squash(q);
    for (let i = 0; i + minLen <= needle.length; i++) {
      if (hay.includes(needle.slice(i, i + minLen))) return q;
    }
  }
  return null;
}
