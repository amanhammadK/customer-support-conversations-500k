import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { processItem } from "./core.js";
const server = new Server({ name: "server", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler("tools/list", async () => ({
  tools: [{ name: "process", description: "Process input", inputSchema: { type: "object", properties: { input: { type: "string" } }, required: ["input"] } }]
}));
server.setRequestHandler("tools/call", async (req) => {
  const { name, arguments: args } = req.params;
  if (name === "process") return { content: [{ type: "text", text: JSON.stringify(await processItem(args.input)) }] };
  throw new Error("Unknown tool: " + name);
});
export { server };