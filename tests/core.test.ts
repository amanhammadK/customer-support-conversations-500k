import { describe, it, expect } from "vitest";
import { processItem } from "../src/core.js";
describe("server", () => {
  it("should process input", async () => {
    const r = await processItem("test");
    expect(r).toHaveProperty("result");
    expect(r.status).toBe("completed");
  });
});