import { describe, it, expect } from "vitest";
import { query, getRecord, stats, textSearch } from "../src/core.js";

describe("customer support dataset core", () => {
  it("loads the dataset", async () => {
    const s = await stats();
    expect(s.count).toBe(2000);
  });

  it("queries by exact field match", async () => {
    const r = await query({ channel: "chat" }, 10);
    expect(r.total).toBeGreaterThan(0);
    expect(r.records.every((rec) => rec.channel === "chat")).toBe(true);
  });

  it("fetches a single record by id", async () => {
    const rec = await getRecord("supp_000000");
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe("supp_000000");
  });

  it("returns stats with numeric and categorical fields", async () => {
    const s = await stats();
    expect(s.numericFields).toHaveProperty("message_count");
    expect(s.categoricalFields).toHaveProperty("issue_type");
  });

  it("searches text across messages", async () => {
    const r = await textSearch("refund");
    expect(r.total).toBeGreaterThan(0);
  });
});