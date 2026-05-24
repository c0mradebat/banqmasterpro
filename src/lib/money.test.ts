import { describe, it, expect } from "vitest";
import { computeFinancials, dec, money, sumMoney } from "./money";

describe("dec / money / sumMoney", () => {
  it("rounds to 2dp", () => {
    expect(money(1.005).toString()).toBe("1.01");
    expect(money("99.999").toString()).toBe("100");
    expect(money(null).toString()).toBe("0");
  });

  it("sums values precisely", () => {
    // Floats lose precision: 0.1 + 0.2 = 0.30000000000000004. Decimal must not.
    expect(sumMoney([0.1, 0.2]).toString()).toBe("0.3");
    expect(sumMoney(["100.25", 50.5, 0.25]).toString()).toBe("151");
  });

  it("treats null/undefined/Decimal interchangeably", () => {
    expect(dec(null).toString()).toBe("0");
    expect(dec(undefined).toString()).toBe("0");
    expect(dec("42.5").toString()).toBe("42.5");
  });
});

describe("computeFinancials — receipt formula", () => {
  const baseInputs = {
    subtotal: 50000,
    discount: 0,
    miscCharges: 0,
    electricityUnits: 0,
    electricityRate: 12,
    generatorHours: 0,
    generatorRate: 800,
    addonMattresses: 0,
    addonMattressRate: 300,
    securityDeposit: 0,
    payments: [] as { kind: string; amount: number | string }[],
  };

  it("baseline: just a subtotal", () => {
    const r = computeFinancials({ ...baseInputs });
    expect(r.totalAmount.toString()).toBe("50000");
    expect(r.grossPayable.toString()).toBe("50000");
    expect(r.paidAmount.toString()).toBe("0");
    expect(r.balanceDue.toString()).toBe("50000");
  });

  it("applies discount and misc", () => {
    const r = computeFinancials({ ...baseInputs, discount: 5000, miscCharges: 1500 });
    expect(r.totalAmount.toString()).toBe("46500");
  });

  it("computes utility charges", () => {
    const r = computeFinancials({
      ...baseInputs,
      electricityUnits: 120,
      electricityRate: 12,
      generatorHours: 2.5,
      generatorRate: 800,
      addonMattresses: 3,
      addonMattressRate: 300,
    });
    expect(r.electricityCharge.toString()).toBe("1440");
    expect(r.generatorCharge.toString()).toBe("2000");
    expect(r.mattressCharge.toString()).toBe("900");
    // 50000 + 1440 + 2000 + 900 = 54340
    expect(r.totalAmount.toString()).toBe("54340");
  });

  it("includes security deposit in grossPayable but not totalAmount", () => {
    const r = computeFinancials({ ...baseInputs, securityDeposit: 5000 });
    expect(r.totalAmount.toString()).toBe("50000");
    expect(r.grossPayable.toString()).toBe("55000");
    expect(r.balanceDue.toString()).toBe("55000");
  });

  it("nets non-refund payments against refunds", () => {
    const r = computeFinancials({
      ...baseInputs,
      payments: [
        { kind: "ADVANCE", amount: 20000 },
        { kind: "PARTIAL", amount: 15000 },
        { kind: "REFUND", amount: 5000 },
      ],
    });
    expect(r.paidAmount.toString()).toBe("30000"); // 35k − 5k
    expect(r.refundAmount.toString()).toBe("5000");
    expect(r.balanceDue.toString()).toBe("20000"); // 50k − 30k
  });

  it("negative balance means refund owed (overpayment after deposit)", () => {
    const r = computeFinancials({
      ...baseInputs,
      subtotal: 30000,
      securityDeposit: 5000,
      payments: [{ kind: "ADVANCE", amount: 40000 }],
    });
    // grossPayable = 35000; paid = 40000 → balance = -5000 (refund owed)
    expect(r.balanceDue.toString()).toBe("-5000");
  });

  it("survives Decimal/string/number mixes without precision drift", () => {
    const r = computeFinancials({
      ...baseInputs,
      subtotal: "12345.67",
      miscCharges: 0.1,
      payments: [
        { kind: "ADVANCE", amount: "0.2" },
        { kind: "PARTIAL", amount: 100.25 },
      ],
    });
    // subtotal 12345.67 + misc 0.10 = 12345.77 total
    expect(r.totalAmount.toString()).toBe("12345.77");
    // paid 0.20 + 100.25 = 100.45
    expect(r.paidAmount.toString()).toBe("100.45");
    expect(r.balanceDue.toString()).toBe("12245.32");
  });

  it("handles zero-payment case cleanly", () => {
    const r = computeFinancials({ ...baseInputs, subtotal: 1000, payments: [] });
    expect(r.paidAmount.toString()).toBe("0");
    expect(r.refundAmount.toString()).toBe("0");
    expect(r.balanceDue.toString()).toBe("1000");
  });
});
