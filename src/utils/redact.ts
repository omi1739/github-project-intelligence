export const REDACTION_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\b(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["']?[^\s"']{8,}/gi,
];

export function redactSecrets(text: string): string {
  let output = text;
  for (const pattern of REDACTION_PATTERNS) {
    output = output.replace(pattern, '[REDACTED]');
  }
  return output;
}

export function countSecretLikeMatches(text: string): number {
  let count = 0;
  for (const pattern of REDACTION_PATTERNS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    count += [...text.matchAll(new RegExp(pattern.source, flags))].length;
  }
  return count;
}
