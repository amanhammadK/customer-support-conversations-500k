import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { query, getRecord, stats, textSearch } from "./core.js";
export const server = new Server({ name: "customer-support-conversations", version: "1.0.0" }, { capabilities: { tools: {} } });
const TOOLS = [
    {
        name: "query_dataset",
        description: "Filter the conversation dataset. Pass either a flat object of exact-match filters (values starting and ending with % do substring match, arrays match any-of) or an array of {field, op, value} with ops =, !=, >, >=, <, <=, contains, starts_with, ends_with, in, between, is_null, is_not_null. Supports sortBy/sortDir and pagination via limit/offset.",
        inputSchema: {
            type: "object",
            properties: {
                filters: { type: "object", description: "Field-value filter map or advanced filter array" },
                limit: { type: "number" },
                offset: { type: "number" },
                sortBy: { type: "string" },
                sortDir: { type: "string", enum: ["asc", "desc"] },
            },
        },
    },
    {
        name: "get_record",
        description: "Fetch a single conversation by id (or any field value via idField).",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
                idField: { type: "string" },
            },
            required: ["id"],
        },
    },
    {
        name: "get_stats",
        description: "Aggregate statistics across the dataset: per-field min/max/mean/median/stddev/percentiles/histogram plus categorical value counts.",
        inputSchema: {
            type: "object",
            properties: {
                fields: { type: "array", items: { type: "string" } },
            },
        },
    },
    {
        name: "text_search",
        description: "Full-text search across conversation text and metadata.",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string" },
                fields: { type: "array", items: { type: "string" } },
            },
            required: ["query"],
        },
    },
];
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = (request.params.arguments || {});
    try {
        let result;
        switch (name) {
            case "query_dataset":
                result = await query(args.filters, args.limit ?? 25, args.offset ?? 0, args.sortBy, args.sortDir);
                break;
            case "get_record":
                result = await getRecord(args.id, args.idField);
                break;
            case "get_stats":
                result = await stats(args.fields);
                break;
            case "text_search":
                result = await textSearch(args.query, args.fields);
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true,
        };
    }
});
