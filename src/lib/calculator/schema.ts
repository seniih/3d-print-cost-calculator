import { z } from "zod";

/**
 * Inputs for one calculation, version 1.
 *
 * A calculation describes ONE print job (one plate). A job can produce several
 * identical pieces (`piecesPerJob`), and an order can ask for any number of
 * pieces (`quantity`). Costs are worked out per job, divided per piece, then
 * multiplied by the order quantity.
 *
 * Everything is in a single currency. Percentages are plain numbers: 10 = 10 %.
 *
 * This shape is stored as JSON with every saved calculation. Never change it in
 * a breaking way: add a new version and a migration in `parseInputs` instead.
 */
export const INPUTS_VERSION = 1;

const money = z.number().finite().min(0);
const pct = (max = 100) => z.number().finite().min(0).max(max);
const minutes = z.number().finite().min(0).max(60 * 24 * 30); // up to 30 days

export const filamentUsageSchema = z.object({
  /** Shown in the breakdown, e.g. "PLA Black". */
  name: z.string().trim().max(120).default(""),
  /** Price of a full spool. */
  spoolPrice: money,
  /** Net filament weight on that spool. */
  spoolWeightGrams: z.number().finite().positive().max(100_000).default(1000),
  /** Grams used by one job, as reported by the slicer (supports included). */
  grams: z.number().finite().min(0).max(100_000),
});

export const printerSchema = z.object({
  name: z.string().trim().max(120).default(""),
  purchasePrice: money,
  /** What it can be sold for at the end of its life. Lowers depreciation. */
  resaleValue: money.default(0),
  /** Expected useful life, in print hours. 0 disables depreciation. */
  lifetimeHours: z.number().finite().min(0).max(1_000_000),
  /** Average power draw while printing. */
  powerWatts: z.number().finite().min(0).max(20_000),
  /** Nozzles, plates, belts, lubricant… spread per print hour. */
  maintenanceCostPerHour: money.default(0),
});

export const extraUsageSchema = z.object({
  /** e.g. "Keyring", "Magnet 6x2", "Zip bag". */
  name: z.string().trim().max(120).default(""),
  unitPrice: money,
  /** How many units go into ONE finished piece (can be fractional: 0.5 ml glue). */
  quantityPerPiece: z.number().finite().min(0).max(100_000),
});

export const laborSchema = z.object({
  ratePerHour: money.default(0),
  /** Slicing, plate prep, starting the print: once per job. */
  prepMinutesPerJob: minutes.default(0),
  /** Support removal, sanding, assembly, packing: for every piece. */
  postProcessMinutesPerPiece: minutes.default(0),
});

export const pricingSchema = z.object({
  /**
   * Share of jobs that fail and must be reprinted. A failed job wastes its
   * filament, electricity and machine time, so a 10 % rate means each
   * successful job carries the cost of 1 / (1 − 0.1) − 1 ≈ 11 % extra machine
   * work. Extras and post-processing are not wasted.
   */
  failureRatePct: pct(95).default(0),
  /** Rent, software, tools, shipping supplies…: added on top of production cost. */
  overheadPct: pct(1000).default(0),
  /**
   * `markup`: price = cost × (1 + p). 30 % markup on 10 → 13.
   * `margin`: profit is p of the net price. 30 % margin on 10 → 14.29.
   */
  profitMode: z.enum(["markup", "margin"]).default("markup"),
  profitPct: pct(1000).default(0),
  /** VAT / sales tax added to the net price. */
  taxRatePct: pct().default(0),
  /** Marketplace commission, charged on the final price the buyer pays. */
  marketplaceFeePct: pct(95).default(0),
});

export const calculationInputsSchema = z
  .object({
    version: z.literal(INPUTS_VERSION).default(INPUTS_VERSION),
    /** Print time of one job, from the slicer. */
    printMinutes: minutes,
    piecesPerJob: z.number().int().min(1).max(10_000).default(1),
    /** Pieces in the order. */
    quantity: z.number().int().min(1).max(1_000_000).default(1),
    filaments: z.array(filamentUsageSchema).max(32).default([]),
    /** Extra filament lost to purges, skirts and test lines, as % of `grams`. */
    filamentWastePct: pct(500).default(0),
    printer: printerSchema,
    electricityPricePerKwh: money.default(0),
    extras: z.array(extraUsageSchema).max(100).default([]),
    labor: laborSchema.default(laborSchema.parse({})),
    pricing: pricingSchema.default(pricingSchema.parse({})),
  })
  .superRefine((v, ctx) => {
    if (v.pricing.profitMode === "margin" && v.pricing.profitPct >= 100) {
      ctx.addIssue({
        code: "custom",
        path: ["pricing", "profitPct"],
        message: "A margin must be below 100 %.",
      });
    }
    // The buyer's price must leave something after tax and commission.
    const net = 1 / (1 + v.pricing.taxRatePct / 100) - v.pricing.marketplaceFeePct / 100;
    if (net <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["pricing", "marketplaceFeePct"],
        message: "Tax and marketplace fee together leave nothing of the price.",
      });
    }
  });

/** Inputs as the user (or a form) provides them; defaults are optional. */
export type CalculationInputsDraft = z.input<typeof calculationInputsSchema>;
/** Fully validated inputs with every default filled in. */
export type CalculationInputs = z.output<typeof calculationInputsSchema>;

/**
 * Validates inputs from any source: a form, the API or a stored snapshot.
 * Older snapshot versions are upgraded here once a v2 exists.
 */
export function parseInputs(raw: unknown) {
  return calculationInputsSchema.safeParse(raw);
}
