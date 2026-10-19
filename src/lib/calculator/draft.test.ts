import { describe, expect, it } from "vitest";
import { buildInputs, initialState, type CalcState, type Library } from "./draft";
import { calculate } from "./engine";
import type { Settings } from "@/lib/library/data";

const settings: Settings = {
  currency: "USD",
  electricityPricePerKwh: 0.15,
  laborRatePerHour: 15,
  filamentWastePct: 10,
  failureRatePct: 5,
  overheadPct: 0,
  profitMode: "MARKUP",
  profitPct: 30,
  taxRatePct: 0,
  marketplaceFeePct: 0,
  saved: true,
};

const lib: Library = {
  printers: [
    {
      id: "p1",
      name: "P1S",
      brand: null,
      model: null,
      purchasePrice: 400,
      resaleValue: 0,
      lifetimeHours: 5000,
      powerWatts: 120,
      maintenanceCostPerHour: 0.03,
      isDefault: true,
      notes: null,
    },
  ],
  filaments: [
    {
      id: "f1",
      name: "PLA",
      brand: null,
      material: "PLA",
      color: null,
      colorHex: null,
      spoolPrice: 20,
      spoolWeightGrams: 1000,
      isDefault: true,
      notes: null,
    },
  ],
  extras: [],
};

function filled(locale: string, patch: Partial<CalcState> = {}): CalcState {
  const s = initialState(lib, settings, locale);
  return {
    ...s,
    minutes: "48",
    filaments: [{ ...s.filaments[0], grams: "12" }],
    ...patch,
  };
}

describe("buildInputs", () => {
  it("starts from the default printer, filament and settings", () => {
    const s = initialState(lib, settings, "en");
    expect(s.printerId).toBe("p1");
    expect(s.filaments[0].sourceId).toBe("f1");
    expect(s.profitMode).toBe("markup");
  });

  it("gives the same answer in English and Turkish", () => {
    const en = buildInputs(filled("en"), "en");
    const tr = buildInputs(filled("tr"), "tr");
    expect(en.ok && tr.ok).toBe(true);
    if (en.ok && tr.ok) expect(calculate(en.inputs)).toEqual(calculate(tr.inputs));
  });

  it("reads typed hours and minutes together", () => {
    const r = buildInputs(filled("en", { hours: "1", minutes: "30" }), "en");
    expect(r.ok && r.inputs.printMinutes).toBe(90);
  });

  it("flags text that is not a number", () => {
    const s = filled("en", { hours: "abc" });
    const r = buildInputs(s, "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect([...r.bad]).toEqual(["hours"]);
  });

  it("flags a fractional piece count", () => {
    const r = buildInputs(filled("en", { quantity: "2.5" }), "en");
    expect(r.ok).toBe(false);
  });

  it("reports values the engine rejects", () => {
    const r = buildInputs(filled("en", { profitMode: "margin", profitPct: "100" }), "en");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("pricing.profitPct");
  });

  it("treats empty optional fields as zero", () => {
    const r = buildInputs(filled("en", { prepMinutes: "", feePct: "" }), "en");
    expect(r.ok && r.inputs.labor.prepMinutesPerJob).toBe(0);
  });
});

describe("stateFromInputs", () => {
  it.each(["en", "tr"])("round-trips a calculation in %s", async (locale) => {
    const { stateFromInputs } = await import("./draft");
    const first = buildInputs(
      filled(locale, { hours: "1", minutes: "30,5".replace(",", locale === "tr" ? "," : "."), quantity: "12", piecesPerJob: "4" }),
      locale,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const again = buildInputs(stateFromInputs(first.inputs, locale), locale);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.inputs).toEqual(first.inputs);
  });
});
