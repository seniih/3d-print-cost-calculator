import { z } from "zod";
import { decimalField, intField, nameField, optionalText } from "@/lib/forms";

/** Form schemas for the library. Field names match the form inputs. */

export const CURRENCIES = ["TRY", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const FILAMENT_MATERIALS = [
  "PLA",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "NYLON",
  "PC",
  "CF_COMPOSITE",
  "RESIN",
  "OTHER",
] as const;
export type FilamentMaterial = (typeof FILAMENT_MATERIALS)[number];

export const EXTRA_CATEGORIES = ["HARDWARE", "CONSUMABLE", "PACKAGING", "OTHER"] as const;
export type ExtraCategory = (typeof EXTRA_CATEGORIES)[number];

export const EXTRA_UNITS = ["PIECE", "GRAM", "MILLILITER", "CENTIMETER", "PACK"] as const;
export type ExtraUnit = (typeof EXTRA_UNITS)[number];

export const PROFIT_MODES = ["MARKUP", "MARGIN"] as const;
export type ProfitMode = (typeof PROFIT_MODES)[number];

const percent = (max = 100) => decimalField({ min: 0, max, default: 0 });

export const settingsSchema = z
  .object({
    currency: z.enum(CURRENCIES, { error: "required" }),
    electricityPricePerKwh: decimalField({ max: 1_000, default: 0 }),
    laborRatePerHour: decimalField({ max: 1_000_000, default: 0 }),
    filamentWastePct: percent(500),
    failureRatePct: percent(95),
    overheadPct: percent(1000),
    profitMode: z.enum(PROFIT_MODES, { error: "required" }),
    profitPct: percent(1000),
    taxRatePct: percent(100),
    marketplaceFeePct: percent(95),
  })
  .superRefine((v, ctx) => {
    if (v.profitMode === "MARGIN" && v.profitPct >= 100) {
      ctx.addIssue({ code: "custom", path: ["profitPct"], message: "max" });
    }
  });
export type SettingsInput = z.output<typeof settingsSchema>;

export const printerSchema = z
  .object({
    name: nameField,
    brand: optionalText(80),
    model: optionalText(80),
    purchasePrice: decimalField({ max: 10_000_000 }),
    resaleValue: decimalField({ max: 10_000_000, default: 0 }),
    lifetimeHours: intField({ min: 1, max: 1_000_000 }),
    powerWatts: intField({ min: 0, max: 20_000 }),
    maintenanceCostPerHour: decimalField({ max: 100_000, default: 0 }),
    notes: optionalText(),
  })
  .superRefine((v, ctx) => {
    if (v.resaleValue > v.purchasePrice) {
      ctx.addIssue({ code: "custom", path: ["resaleValue"], message: "max" });
    }
  });
export type PrinterInput = z.output<typeof printerSchema>;

export const filamentSchema = z.object({
  name: nameField,
  brand: optionalText(80),
  material: z.enum(FILAMENT_MATERIALS, { error: "required" }),
  color: optionalText(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^(#[0-9a-fA-F]{6})?$/, "invalid")
    .transform((v) => (v === "" ? null : v.toLowerCase()))
    .nullable()
    .default(null),
  spoolPrice: decimalField({ max: 1_000_000 }),
  spoolWeightGrams: intField({ min: 1, max: 100_000, default: 1000 }),
  notes: optionalText(),
});
export type FilamentInput = z.output<typeof filamentSchema>;

export const extraItemSchema = z.object({
  name: nameField,
  category: z.enum(EXTRA_CATEGORIES, { error: "required" }),
  unit: z.enum(EXTRA_UNITS, { error: "required" }),
  unitPrice: decimalField({ max: 1_000_000 }),
  notes: optionalText(),
});
export type ExtraItemInput = z.output<typeof extraItemSchema>;
