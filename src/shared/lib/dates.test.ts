import { describe, expect, it } from "vitest";
import { addDays, dateKey, eachDayKey, formatDateKey, formatDateTime, formatRelativeTime, formatShortDate, formatTime, startOfDay } from "./dates";

describe("dates", () => {
  it("startOfDay zeroes the time in local time", () => {
    const d = startOfDay(new Date(2026, 0, 15, 18, 30, 12));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
    expect(d.getDate()).toBe(15);
  });
  it("addDays crosses month boundaries", () => {
    const d = addDays(new Date(2026, 0, 31, 9), 1);
    expect([d.getMonth(), d.getDate()]).toEqual([1, 1]);
  });
  it("dateKey is zero padded YYYY-MM-DD", () => {
    expect(dateKey(new Date(2026, 2, 5, 23, 59))).toBe("2026-03-05");
  });
  it("eachDayKey lists every local day in [start, end]", () => {
    const keys = eachDayKey(new Date(2026, 0, 30, 10), new Date(2026, 1, 2, 1));
    expect(keys).toEqual(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02"]);
  });

  describe("Spanish formatting", () => {
    it("formats times in the es-US 12-hour clock", () => {
      expect(formatTime(new Date(2026, 0, 1, 18, 30))).toMatch(/^6:30\s*p\.\s*m\.$/);
    });
    it("formats short dates with a Spanish month", () => {
      expect(formatShortDate(new Date(2026, 2, 10))).toMatch(/10.*mar|mar.*10/i);
      expect(formatDateKey("2026-01-05")).toMatch(/5.*ene|ene.*5/i);
    });
    it("formats date and time together", () => {
      expect(formatDateTime(new Date(2026, 4, 3, 9, 5))).toMatch(/3.*may.*9:05\s*a\.\s*m\./i);
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date(2026, 2, 10, 12, 0, 0);
    const ago = (ms: number) => new Date(now.getTime() - ms);
    it("says 'justo ahora' for under a minute", () => {
      expect(formatRelativeTime(ago(20_000), now)).toBe("justo ahora");
      expect(formatRelativeTime(ago(-5_000), now)).toBe("justo ahora");
    });
    it("uses minutes, hours and days", () => {
      expect(formatRelativeTime(ago(5 * 60_000), now)).toBe("hace 5 min");
      expect(formatRelativeTime(ago(2 * 3_600_000), now)).toBe("hace 2 h");
      expect(formatRelativeTime(ago(3 * 86_400_000), now)).toMatch(/^hace 3 d/);
    });
  });
});
