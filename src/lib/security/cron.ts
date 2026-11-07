import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(header: string | null, secret: string | undefined) {
  if (!header || !secret) return false;
  const actual = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
