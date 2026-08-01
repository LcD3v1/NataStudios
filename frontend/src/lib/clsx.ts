/**
 * Tiny className joiner — no dependency needed for this project's simple needs.
 * Filters out falsy values and joins the rest with a space.
 */
export function clsx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
