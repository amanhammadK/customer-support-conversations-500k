import { describe, it, expect } from "vitest";
import { processItem } from "../src/core.js";
describe("Server", () => {
  it("exports processItem", () => expect(processItem).toBeDefined());
  it("returns result on input", async () => {
    const r = await processItem("test");
    expect(r).toHaveProperty("result");
    expect(r.status).toBe("completed");
  });
  it("includes timestamp", async () => {
    const r = await processItem("x");
    expect(r).toHaveProperty("timestamp");
    expect(Date.parse(r.timestamp)).not.toBeNaN();
  });
});