import { formatCurrency } from "../../lib/format";

describe("formatCurrency", () => {
  it("formats a number as INR", () => {
    expect(formatCurrency(100)).toBe("₹100.00");
  });

  it("formats a numeric string", () => {
    expect(formatCurrency("250.5")).toBe("₹250.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("₹0.00");
  });

  it("returns ₹0.00 for NaN input", () => {
    expect(formatCurrency("not-a-number")).toBe("₹0.00");
  });

  it("returns ₹0.00 for empty string", () => {
    expect(formatCurrency("")).toBe("₹0.00");
  });

  it("formats negative numbers", () => {
    expect(formatCurrency(-50)).toBe("₹-50.00");
  });

  it("formats large numbers with thousands separator NOT applied (no locale formatting)", () => {
    expect(formatCurrency(100000)).toBe("₹100000.00");
  });
});
