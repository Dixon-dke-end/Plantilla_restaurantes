import { describe, expect, it } from "vitest";
import { elapsedMs, formatElapsed, LATE_AFTER_MIN, ticketUrgency, WARNING_AFTER_MIN } from "./urgency";

const MIN = 60_000;
const now = new Date("2026-03-10T12:00:00Z").getTime();
const ago = (min: number) => new Date(now - min * MIN).toISOString();

describe("ticketUrgency", () => {
  it("exposes the thresholds", () => {
    expect(WARNING_AFTER_MIN).toBe(8);
    expect(LATE_AFTER_MIN).toBe(15);
  });
  it("is fresh below 8 minutes", () => {
    expect(ticketUrgency(ago(0), now)).toBe("fresh");
    expect(ticketUrgency(ago(7.99), now)).toBe("fresh");
  });
  it("is warning from 8 up to and including 15 minutes", () => {
    expect(ticketUrgency(ago(8), now)).toBe("warning");
    expect(ticketUrgency(ago(12), now)).toBe("warning");
    expect(ticketUrgency(ago(15), now)).toBe("warning");
  });
  it("is late after 15 minutes", () => {
    expect(ticketUrgency(ago(15.01), now)).toBe("late");
    expect(ticketUrgency(ago(90), now)).toBe("late");
  });
  it("treats future timestamps (clock skew) as fresh", () => {
    expect(ticketUrgency(ago(-5), now)).toBe("fresh");
  });
});

describe("elapsedMs", () => {
  it("never returns a negative duration", () => {
    expect(elapsedMs(ago(-1), now)).toBe(0);
    expect(elapsedMs(ago(2), now)).toBe(2 * MIN);
  });
});

describe("formatElapsed", () => {
  it("formats m:ss under an hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(14 * MIN + 59_000)).toBe("14:59");
  });
  it("formats h:mm:ss from an hour", () => {
    expect(formatElapsed(3_723_000)).toBe("1:02:03");
  });
});
