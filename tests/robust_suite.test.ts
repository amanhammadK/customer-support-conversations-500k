import { describe, it, expect } from "vitest";
import { query, getRecord, stats, aggregate } from "../src/core.js";

describe("dataset query engine", () => {
  it("supports advanced filter operators", async () => {
    const r = await query(
      [{ field: "satisfaction_score", op: ">=", value: 4 }],
      25
    );
    expect(r.records.every((rec) => rec.satisfaction_score >= 4)).toBe(true);
  });

  it("supports contains operator", async () => {
    const r = await query([{ field: "issue_type", op: "contains", value: "payment" }], 10);
    expect(r.total).toBeGreaterThan(0);
    expect(r.records.every((rec) => rec.issue_type.toLowerCase().includes("payment"))).toBe(true);
  });

  it("supports pagination and sorting", async () => {
    const page1 = await query({}, 10, 0, "message_count", "desc");
    const page2 = await query({}, 10, 10, "message_count", "desc");
    expect(page1.records).toHaveLength(10);
    expect(page1.records[0].message_count).toBeGreaterThanOrEqual(page1.records[1].message_count);
    expect(page2.records[0].id).not.toBe(page1.records[0].id);
  });

  it("aggregates by a categorical field", async () => {
    const agg = await aggregate("channel", { satisfaction_score: "avg" });
    expect(agg.length).toBeGreaterThan(0);
    expect(agg[0]).toHaveProperty("channel");
    expect(agg[0]).toHaveProperty("satisfaction_score_avg");
  });

  it("stats include per-field histograms", async () => {
    const s = await stats(["message_count"]);
    expect(s.numericFields.message_count.histogram.length).toBeGreaterThan(0);
    expect(s.numericFields.message_count.histogram.reduce((sum, b) => sum + b.count, 0)).toBe(s.count);
  });
});