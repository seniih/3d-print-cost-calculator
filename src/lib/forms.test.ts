import { describe, expect, it } from "vitest";
import { fieldErrors, parseDecimal } from "@/lib/forms";
import { filamentSchema, printerSchema, settingsSchema } from "@/lib/library/schemas";

describe("parseDecimal", () => {
  it.each([
    ["12", 12],
    ["12.5", 12.5],
    ["12,5", 12.5],
    ["1.234,5", 1234.5],
    ["1,234.5", 1234.5],
    [" 1 000 ", 1000],
    ["0,03", 0.03],
    ["1,500", 1500],
    ["32.000", 32],
    ["1.000.000", 1000000],
  ])("reads %j in English as %d", (input, expected) => {
    expect(parseDecimal(input, "en")).toBe(expected);
  });

  it.each([
    ["32.000", 32000],
    ["2,592", 2.592],
    ["1.5", 1.5],
    ["12.75", 12.75],
    ["1.234,56", 1234.56],
    ["1,500", 1.5],
  ])("reads %j in Turkish as %d", (input, expected) => {
    expect(parseDecimal(input, "tr")).toBe(expected);
  });

  it("treats empty input as missing and garbage as NaN", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("1-2")).toBeNaN();
  });
});

describe("library form schemas", () => {
  it("accepts a printer in canonical number form", () => {
    const r = printerSchema.safeParse({
      name: "Bambu P1S",
      purchasePrice: "32000",
      resaleValue: "",
      lifetimeHours: "6000",
      powerWatts: "110",
      maintenanceCostPerHour: "1.5",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.purchasePrice).toBe(32000);
      expect(r.data.resaleValue).toBe(0);
      expect(r.data.maintenanceCostPerHour).toBe(1.5);
      expect(r.data.brand).toBeNull();
    }
  });

  it("rejects a resale value above the purchase price", () => {
    const r = printerSchema.safeParse({
      name: "X",
      purchasePrice: "100",
      resaleValue: "200",
      lifetimeHours: "1000",
      powerWatts: "100",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toEqual({ resaleValue: "max" });
  });

  it("reports missing and malformed fields by key", () => {
    const r = filamentSchema.safeParse({ name: "", material: "PLA", spoolPrice: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toMatchObject({ name: "required", spoolPrice: "number" });
    }
  });

  it("does not allow a margin of 100 % or more", () => {
    const base = { currency: "TRY", profitMode: "MARGIN" };
    expect(settingsSchema.safeParse({ ...base, profitPct: "100" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, profitPct: "40" }).success).toBe(true);
  });
});
