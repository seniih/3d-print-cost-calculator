import { z } from "zod";

/**
 * Shared helpers for forms that post to Server Actions.
 * Inputs are plain text fields so people can type "12,5" or "12.5".
 */

/** Result every form action returns. `errors` holds message keys per field. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; savedAt: number }
  | { status: "error"; fieldErrors: Record<string, string>; formError?: string };

export const idle: FormState = { status: "idle" };

/**
 * Reads a number the way people type it in their language.
 *
 * - The last separator, when both "." and "," appear, is the decimal one.
 * - Turkish: "," is the decimal separator; "." is a thousands separator only
 *   when followed by exactly three digits ("32.000" → 32000, "1.5" → 1.5).
 * - English: "." is the decimal separator; "," is a thousands separator only
 *   when followed by exactly three digits ("1,500" → 1500, "12,5" → 12.5).
 *
 * Returns undefined for empty input and NaN for anything unreadable.
 */
export function parseDecimal(raw: unknown, locale: string = "en"): number | undefined {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return undefined;
  let s = raw.trim().replace(/[\s\u00a0']/g, "");
  if (s === "") return undefined;
  if (!/^-?[\d.,]+$/.test(s)) return Number.NaN;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  const groups = (sep: string) => new RegExp(`^-?\\d{1,3}(\\${sep}\\d{3})+$`).test(s);

  if (hasDot && hasComma) {
    const decimal = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    s = s.split(thousands).join("").replace(decimal, ".");
  } else if (hasComma) {
    const thousands = locale !== "tr" && groups(",");
    s = thousands ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (hasDot) {
    const thousands = (locale === "tr" && groups(".")) || (s.match(/\./g)?.length ?? 0) > 1;
    if (thousands) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

/**
 * A decimal form field. Forms send numbers in canonical form ("1234.5"; see
 * NumberInput), so the server parses them locale-independently. Empty means
 * "use the default" when one is given.
 */
export function decimalField(opts: { min?: number; max?: number; default?: number } = {}) {
  const { min = 0, max = 1e9 } = opts;
  return z.preprocess(
    (v) => parseDecimal(v) ?? opts.default,
    z
      .number({ error: (issue) => (issue.input === undefined ? "required" : "number") })
      .refine((n) => n >= min, "min")
      .refine((n) => n <= max, "max"),
  );
}

export function intField(opts: { min?: number; max?: number; default?: number } = {}) {
  return decimalField(opts).refine((n) => Number.isInteger(n), "integer");
}

export const nameField = z.string().trim().min(1, "required").max(120, "tooLong");

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

/** FormData → plain object (last value wins for repeated keys). */
export function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Zod error → { field: messageKey } for the first issue of each field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message in ERROR_KEYS ? issue.message : "invalid";
  }
  return out;
}

const ERROR_KEYS = {
  required: true,
  number: true,
  min: true,
  max: true,
  integer: true,
  tooLong: true,
  invalid: true,
} as const;
export type FormErrorKey = keyof typeof ERROR_KEYS;
