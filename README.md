# Customer Support Conversations Dataset

A queryable dataset of synthetic customer-support conversations, shipped as JSON and exposed through a Model Context Protocol server with filtering, sorting, and stats tools.

## Why this exists

Fine-tuning a support classifier or building a "suggest next reply" agent needs realistic conversation data with structured metadata. This repo bundles 2,000 fully-labeled conversation records plus a typed query engine, so an MCP client can filter and inspect them without standing up a database.

## Data shape

Each record contains:

| Field | Description |
|-------|-------------|
| `id` | Unique conversation id |
| `issue_type` | Category, e.g. "Account locked", "Billing inquiry" |
| `channel` | `phone`, `chat`, or `email` |
| `customer_id` / `agent_id` | Participant ids |
| `messages` | Ordered list of `{ role, text, timestamp }` |
| `message_count` | Number of messages |
| `resolution` | How the issue was resolved |
| `satisfaction_score` | 1–5 customer rating |
| `first_response_minutes` | Time to first agent reply |
| `resolution_hours` | Total time to resolution |
| `created_at` | Conversation start time |

## Install

```bash
npm install
```

## Run

```bash
npm run build
npm start
```

SSE endpoint: `http://localhost:8080/sse`.

## Regenerate data

```bash
pip install -r requirements.txt
python scripts/generate.py
```

## Tools

| Tool | Purpose |
|------|---------|
| `query_dataset` | Filter by field with operators (`=`, `contains`, `in`, `between`, …), sort, paginate |
| `get_record` | Fetch a single record by id |
| `get_stats` | Min/max/mean per numeric field |

## Test

```bash
npm test
```

## License

Free-Use License. See LICENSE file.