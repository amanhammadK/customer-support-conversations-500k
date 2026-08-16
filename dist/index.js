import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./mcpServer.js";
const app = express();
const PORT = parseInt(process.env.PORT || "8080", 10);
let transport;
app.get("/sse", async (_, res) => {
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
});
app.post("/message", async (req, res) => {
    if (!transport) {
        res.status(500).json({ error: "No active SSE connection. Connect to /sse first." });
        return;
    }
    await transport.handlePostMessage(req, res);
});
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(PORT, () => console.log(`MCP server listening on http://localhost:${PORT}/sse`));
