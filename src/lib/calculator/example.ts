import { calculationInputsSchema } from "./schema";

/**
 * A realistic small job, used on the landing page and as a starting point for
 * new users: a PLA keychain with a metal ring, sold in a zip bag.
 */
export const exampleInputs = calculationInputsSchema.parse({
  printMinutes: 48,
  filaments: [{ name: "PLA", spoolPrice: 20, spoolWeightGrams: 1000, grams: 12 }],
  filamentWastePct: 10,
  printer: { purchasePrice: 400, lifetimeHours: 5000, powerWatts: 120, maintenanceCostPerHour: 0.03 },
  electricityPricePerKwh: 0.15,
  extras: [
    { name: "Keyring", unitPrice: 0.15, quantityPerPiece: 1 },
    { name: "Zip bag", unitPrice: 0.05, quantityPerPiece: 1 },
  ],
  labor: { ratePerHour: 15, prepMinutesPerJob: 3, postProcessMinutesPerPiece: 2 },
  pricing: { failureRatePct: 5, profitMode: "markup", profitPct: 30 },
});

export const exampleCurrency = "USD";
