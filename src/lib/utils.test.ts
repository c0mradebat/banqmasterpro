import { describe, it, expect } from "vitest";
import { rangesOverlap } from "./utils";

function d(s: string) {
  return new Date(s);
}

describe("rangesOverlap — booking & room conflict detection", () => {
  it("returns true when ranges fully overlap", () => {
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-01T14:00"), d("2026-06-01T11:00"), d("2026-06-01T13:00"))
    ).toBe(true);
  });

  it("returns true when ranges partially overlap (a starts first)", () => {
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-01T12:00"), d("2026-06-01T11:00"), d("2026-06-01T13:00"))
    ).toBe(true);
  });

  it("returns true when ranges partially overlap (b starts first)", () => {
    expect(
      rangesOverlap(d("2026-06-01T11:00"), d("2026-06-01T13:00"), d("2026-06-01T10:00"), d("2026-06-01T12:00"))
    ).toBe(true);
  });

  it("returns false when ranges merely touch at the boundary (a ends when b starts)", () => {
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-01T12:00"), d("2026-06-01T12:00"), d("2026-06-01T14:00"))
    ).toBe(false);
  });

  it("returns false when ranges merely touch at the boundary (b ends when a starts)", () => {
    expect(
      rangesOverlap(d("2026-06-01T12:00"), d("2026-06-01T14:00"), d("2026-06-01T10:00"), d("2026-06-01T12:00"))
    ).toBe(false);
  });

  it("returns false when ranges are disjoint", () => {
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-01T11:00"), d("2026-06-01T12:00"), d("2026-06-01T13:00"))
    ).toBe(false);
  });

  it("returns true when one range fully contains the other", () => {
    expect(
      rangesOverlap(d("2026-06-01T08:00"), d("2026-06-01T18:00"), d("2026-06-01T10:00"), d("2026-06-01T14:00"))
    ).toBe(true);
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-01T14:00"), d("2026-06-01T08:00"), d("2026-06-01T18:00"))
    ).toBe(true);
  });

  it("handles multi-day windows", () => {
    expect(
      rangesOverlap(d("2026-06-01T10:00"), d("2026-06-03T10:00"), d("2026-06-02T15:00"), d("2026-06-02T20:00"))
    ).toBe(true);
  });
});
