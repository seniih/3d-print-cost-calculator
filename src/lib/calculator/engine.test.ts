import { describe, expect, it } from "vitest";
import {
  calculate,
  calculationInputsSchema,
  parseInputs,
  pricePerGram,
  type CalculationInputsDraft,
} from "@/lib/calculator";

/** Parses a draft (filling defaults) and runs the engine. */
function run(draft: CalculationInputsDraft) {
  return calculate(calculationInputsSchema.parse(draft));
}

const printer = {
  purchasePrice: 400,
  lifetimeHours: 5000,
  powerWatts: 120,
  maintenanceCostPerHour: 0.03,
};

/** The keychain from the landing page, worked out by hand in the comments. */
const keychain: CalculationInputsDraft = {
  printMinutes: 48, // 0.8 h
  filaments: [{ name: "PLA Black", spoolPrice: 20, spoolWeightGrams: 1000, grams: 12 }],
  filamentWastePct: 10, // 12 g → 13.2 g
  printer,
  electricityPricePerKwh: 0.15,
  extras: [
    { name: "Keyring", unitPrice: 0.15, quantityPerPiece: 1 },
    { name: "Zip bag", unitPrice: 0.05, quantityPerPiece: 1 },
  ],
  labor: { ratePerHour: 15, prepMinutesPerJob: 3, postProcessMinutesPerPiece: 2 },
  pricing: { failureRatePct: 5, profitMode: "markup", profitPct: 30 },
};

describe("calculate: a single keychain, checked by hand", () => {
  const r = run(keychain);

  it("charges filament by the gram, including waste", () => {
    // 13.2 g × 0.02 per g
    expect(r.perPiece.costs.filament).toBeCloseTo(0.264, 4);
    expect(r.perJob.filamentGrams).toBeCloseTo(13.2, 4);
  });

  it("charges electricity from power draw and print time", () => {
    // 120 W × 0.8 h = 0.096 kWh × 0.15
    expect(r.perJob.energyKwh).toBeCloseTo(0.096, 4);
    expect(r.perPiece.costs.electricity).toBeCloseTo(0.0144, 4);
  });

  it("spreads the printer's price over its lifetime, plus maintenance", () => {
    // 400 / 5000 h = 0.08 per h × 0.8 h; maintenance 0.03 × 0.8
    expect(r.perPiece.costs.depreciation).toBeCloseTo(0.064, 4);
    expect(r.perPiece.costs.maintenance).toBeCloseTo(0.024, 4);
  });

  it("adds the expected cost of failed prints to machine work only", () => {
    // machine work 0.3664 × 0.05 / 0.95
    expect(r.perPiece.costs.failures).toBeCloseTo(0.019284, 4);
  });

  it("counts labor and extras", () => {
    // (3 + 2) min at 15 per hour
    expect(r.perPiece.costs.labor).toBeCloseTo(1.25, 4);
    expect(r.perPiece.costs.extras).toBeCloseTo(0.2, 4);
  });

  it("adds up to the cost and applies the markup", () => {
    expect(r.perPiece.cost).toBeCloseTo(1.835684, 4);
    expect(r.perPiece.netPrice).toBeCloseTo(1.835684 * 1.3, 4);
    expect(r.perPiece.price).toBeCloseTo(r.perPiece.netPrice, 4); // no tax, no fee
    expect(r.perPiece.profit).toBeCloseTo(1.835684 * 0.3, 4);
  });

  it("lists filament and extras line by line", () => {
    expect(r.filaments).toEqual([{ name: "PLA Black", grams: 13.2, cost: 0.264 }]);
    expect(r.extras.map((e) => e.name)).toEqual(["Keyring", "Zip bag"]);
  });

  it("has costs that sum to the total", () => {
    const sum = Object.values(r.perPiece.costs).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(r.perPiece.cost, 3);
  });
});

describe("calculate: pricing", () => {
  /** A job whose only cost is 10 of labor, to make pricing easy to follow. */
  const tenOfLabor = (pricing: CalculationInputsDraft["pricing"]) =>
    run({
      printMinutes: 0,
      printer: { purchasePrice: 0, lifetimeHours: 0, powerWatts: 0 },
      labor: { ratePerHour: 60, prepMinutesPerJob: 10 },
      pricing,
    });

  it("treats markup and margin differently", () => {
    expect(tenOfLabor({ profitMode: "markup", profitPct: 30 }).perPiece.netPrice).toBeCloseTo(13, 4);
    expect(tenOfLabor({ profitMode: "margin", profitPct: 30 }).perPiece.netPrice).toBeCloseTo(
      14.2857,
      4,
    );
  });

  it("grosses up for VAT and a fee charged on the gross price", () => {
    const r = tenOfLabor({
      profitMode: "margin",
      profitPct: 20,
      taxRatePct: 20,
      marketplaceFeePct: 10,
    });
    // net 12.5; kept share 1/1.2 − 0.1
    expect(r.perPiece.netPrice).toBeCloseTo(12.5, 4);
    expect(r.perPiece.price).toBeCloseTo(12.5 / (1 / 1.2 - 0.1), 3);
    // After paying VAT and the fee, exactly the net price is left.
    const kept = r.perPiece.price - r.perPiece.tax - r.perPiece.marketplaceFee;
    expect(kept).toBeCloseTo(12.5, 3);
  });

  it("adds overhead on top of the production cost", () => {
    const r = tenOfLabor({ overheadPct: 15 });
    expect(r.perPiece.costs.overhead).toBeCloseTo(1.5, 4);
    expect(r.perPiece.cost).toBeCloseTo(11.5, 4);
  });
});

describe("calculate: plates with several pieces and orders", () => {
  const plate = run({
    ...keychain,
    piecesPerJob: 4,
    quantity: 10,
    filaments: [{ spoolPrice: 20, spoolWeightGrams: 1000, grams: 48 }],
    filamentWastePct: 0,
  });

  it("splits per-job costs between the pieces on the plate", () => {
    // 48 g × 0.02 ÷ 4 pieces
    expect(plate.perPiece.costs.filament).toBeCloseTo(0.24, 4);
    // prep is per job (3 min ÷ 4), post-processing per piece (2 min)
    expect(plate.perPiece.costs.labor).toBeCloseTo(15 * ((3 / 4 + 2) / 60), 4);
    // extras are always per piece
    expect(plate.perPiece.costs.extras).toBeCloseTo(0.2, 4);
  });

  it("counts the jobs an order needs and multiplies per-piece totals", () => {
    expect(plate.order.jobs).toBe(3); // 10 pieces, 4 per plate
    expect(plate.order.cost).toBeCloseTo(plate.perPiece.cost * 10, 3);
    expect(plate.order.printHours).toBeCloseTo(0.8 * 3, 4);
    expect(plate.order.filamentGrams).toBeCloseTo(120, 4);
  });

  it("supports several filaments in one job", () => {
    const r = run({
      ...keychain,
      filamentWastePct: 0,
      filaments: [
        { name: "PLA White", spoolPrice: 20, grams: 10 },
        { name: "PETG Clear", spoolPrice: 30, spoolWeightGrams: 750, grams: 5 },
      ],
    });
    expect(r.filaments.map((f) => f.cost)).toEqual([0.2, 0.2]);
    expect(r.perPiece.costs.filament).toBeCloseTo(0.4, 4);
  });
});

describe("calculate: edge cases", () => {
  it("returns zeros when everything is zero", () => {
    const r = run({
      printMinutes: 0,
      printer: { purchasePrice: 0, lifetimeHours: 0, powerWatts: 0 },
    });
    expect(r.perPiece.cost).toBe(0);
    expect(r.perPiece.price).toBe(0);
    expect(Object.values(r.perPiece.costs).every((v) => v === 0)).toBe(true);
  });

  it("skips depreciation when the lifetime is unknown", () => {
    const r = run({ ...keychain, printer: { ...printer, lifetimeHours: 0 } });
    expect(r.perPiece.costs.depreciation).toBe(0);
  });

  it("adds nothing for failures at a 0 % failure rate", () => {
    const r = run({ ...keychain, pricing: { failureRatePct: 0 } });
    expect(r.perPiece.costs.failures).toBe(0);
  });
});

describe("parseInputs", () => {
  it("fills in defaults", () => {
    const parsed = parseInputs({
      printMinutes: 60,
      printer: { purchasePrice: 300, lifetimeHours: 3000, powerWatts: 100 },
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.version).toBe(1);
    expect(parsed.data.piecesPerJob).toBe(1);
    expect(parsed.data.quantity).toBe(1);
    expect(parsed.data.pricing.profitMode).toBe("markup");
    expect(parsed.data.labor.ratePerHour).toBe(0);
  });

  it.each([
    ["negative grams", { filaments: [{ spoolPrice: 20, grams: -1 }] }],
    ["zero pieces per job", { piecesPerJob: 0 }],
    ["fractional quantity", { quantity: 1.5 }],
    ["a 100 % margin", { pricing: { profitMode: "margin", profitPct: 100 } }],
    ["tax and fee eating the whole price", { pricing: { taxRatePct: 100, marketplaceFeePct: 60 } }],
    ["a non-finite number", { printMinutes: Number.POSITIVE_INFINITY }],
  ])("rejects %s", (_, override) => {
    expect(parseInputs({ ...keychain, ...override }).success).toBe(false);
  });
});

describe("pricePerGram", () => {
  it("divides spool price by net weight", () => {
    expect(pricePerGram(25, 1000)).toBe(0.025);
    expect(pricePerGram(25, 0)).toBe(0);
  });
});
