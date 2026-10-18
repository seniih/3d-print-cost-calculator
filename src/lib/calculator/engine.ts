import type { CalculationInputs } from "./schema";

/**
 * The cost engine. Pure and synchronous: same inputs, same result, no I/O.
 * It runs on the server (to store results) and in the browser (live preview).
 *
 * How a price is built, for ONE piece:
 *
 *   machine work   = filament + electricity + depreciation + maintenance   (per job ÷ pieces)
 *   failures       = machine work × f / (1 − f)                            (f = failure rate)
 *   labor          = prep (per job ÷ pieces) + post-processing (per piece)
 *   extras         = Σ unit price × quantity per piece
 *   subtotal       = machine work + failures + labor + extras
 *   overhead       = subtotal × overhead %
 *   COST           = subtotal + overhead
 *
 *   net price      = cost × (1 + markup)        or   cost ÷ (1 − margin)
 *   PRICE (gross)  = net ÷ (1 ÷ (1 + VAT) − fee) so that after VAT and the
 *                    marketplace's cut of the gross price, exactly `net` is left
 */

export const RESULT_VERSION = 1;

export const COST_KEYS = [
  "filament",
  "electricity",
  "depreciation",
  "maintenance",
  "failures",
  "labor",
  "extras",
  "overhead",
] as const;
export type CostKey = (typeof COST_KEYS)[number];

export type CalculationResult = {
  version: typeof RESULT_VERSION;
  /** One finished piece. These are the numbers to show first. */
  perPiece: {
    costs: Record<CostKey, number>;
    cost: number;
    /** Price before VAT and marketplace fee: what you keep. */
    netPrice: number;
    profit: number;
    tax: number;
    marketplaceFee: number;
    /** Suggested price the buyer pays. */
    price: number;
  };
  /** One print job (plate), before dividing between pieces. */
  perJob: {
    filamentGrams: number;
    energyKwh: number;
    printHours: number;
    laborMinutes: number;
  };
  /** The whole order: `quantity` pieces. */
  order: {
    quantity: number;
    jobs: number;
    cost: number;
    profit: number;
    price: number;
    printHours: number;
    filamentGrams: number;
    laborHours: number;
  };
  /** Per-piece detail behind the `filament` and `extras` totals. */
  filaments: { name: string; grams: number; cost: number }[];
  extras: { name: string; quantity: number; cost: number }[];
};

export function calculate(inputs: CalculationInputs): CalculationResult {
  const { printer, labor, pricing } = inputs;
  const pieces = inputs.piecesPerJob;
  const printHours = inputs.printMinutes / 60;
  const wasteFactor = 1 + inputs.filamentWastePct / 100;

  // --- Machine work, per job -------------------------------------------------
  const filamentLines = inputs.filaments.map((f) => {
    const grams = f.grams * wasteFactor;
    return { name: f.name, grams, cost: grams * (f.spoolPrice / f.spoolWeightGrams) };
  });
  const filamentPerJob = sum(filamentLines.map((f) => f.cost));
  const gramsPerJob = sum(filamentLines.map((f) => f.grams));

  const energyKwh = (printer.powerWatts / 1000) * printHours;
  const electricityPerJob = energyKwh * inputs.electricityPricePerKwh;

  const depreciationPerHour =
    printer.lifetimeHours > 0 ? printer.purchasePrice / printer.lifetimeHours : 0;
  const depreciationPerJob = depreciationPerHour * printHours;
  const maintenancePerJob = printer.maintenanceCostPerHour * printHours;

  const machinePerJob =
    filamentPerJob + electricityPerJob + depreciationPerJob + maintenancePerJob;

  // Expected extra attempts per successful job: 1/(1−f) − 1 = f/(1−f).
  const f = pricing.failureRatePct / 100;
  const failuresPerJob = machinePerJob * (f / (1 - f));

  // --- Per piece -------------------------------------------------------------
  const prepHours = labor.prepMinutesPerJob / 60;
  const postHours = labor.postProcessMinutesPerPiece / 60;
  const laborPerPiece = labor.ratePerHour * (prepHours / pieces + postHours);

  const extraLines = inputs.extras.map((e) => ({
    name: e.name,
    quantity: e.quantityPerPiece,
    cost: e.unitPrice * e.quantityPerPiece,
  }));
  const extrasPerPiece = sum(extraLines.map((e) => e.cost));

  const costs: Record<CostKey, number> = {
    filament: filamentPerJob / pieces,
    electricity: electricityPerJob / pieces,
    depreciation: depreciationPerJob / pieces,
    maintenance: maintenancePerJob / pieces,
    failures: failuresPerJob / pieces,
    labor: laborPerPiece,
    extras: extrasPerPiece,
    overhead: 0,
  };
  const subtotal = sum(Object.values(costs));
  costs.overhead = subtotal * (pricing.overheadPct / 100);
  const cost = subtotal + costs.overhead;

  // --- Price -----------------------------------------------------------------
  const p = pricing.profitPct / 100;
  const netPrice = pricing.profitMode === "markup" ? cost * (1 + p) : cost / (1 - p);
  const profit = netPrice - cost;

  const taxRate = pricing.taxRatePct / 100;
  const feeRate = pricing.marketplaceFeePct / 100;
  // The schema guarantees this is positive.
  const keptShare = 1 / (1 + taxRate) - feeRate;
  const price = netPrice / keptShare;
  const tax = price - price / (1 + taxRate);
  const marketplaceFee = price * feeRate;

  // --- Order -----------------------------------------------------------------
  const quantity = inputs.quantity;
  const jobs = Math.ceil(quantity / pieces);

  return {
    version: RESULT_VERSION,
    perPiece: {
      costs: mapValues(costs, round),
      cost: round(cost),
      netPrice: round(netPrice),
      profit: round(profit),
      tax: round(tax),
      marketplaceFee: round(marketplaceFee),
      price: round(price),
    },
    perJob: {
      filamentGrams: round(gramsPerJob),
      energyKwh: round(energyKwh),
      printHours: round(printHours),
      laborMinutes: round(labor.prepMinutesPerJob + labor.postProcessMinutesPerPiece * pieces),
    },
    order: {
      quantity,
      jobs,
      cost: round(cost * quantity),
      profit: round(profit * quantity),
      price: round(price * quantity),
      printHours: round(printHours * jobs),
      filamentGrams: round((gramsPerJob / pieces) * quantity),
      laborHours: round(prepHours * jobs + postHours * quantity),
    },
    filaments: filamentLines.map((l) => ({
      name: l.name,
      grams: round(l.grams / pieces),
      cost: round(l.cost / pieces),
    })),
    extras: extraLines.map((l) => ({ ...l, cost: round(l.cost) })),
  };
}

/** Price of one gram from a spool's price and net weight. */
export function pricePerGram(spoolPrice: number, spoolWeightGrams: number) {
  return spoolWeightGrams > 0 ? spoolPrice / spoolWeightGrams : 0;
}

/** Results keep 4 decimals: enough for sub-cent costs like electricity. */
function round(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

function mapValues<K extends string>(obj: Record<K, number>, fn: (n: number) => number) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v as number)])) as Record<
    K,
    number
  >;
}
