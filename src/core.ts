import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "dataset.json");

export interface DataRecord { [key: string]: any; }

function load(): DataRecord[] {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export interface QueryResult {
  total: number;
  returned: number;
  offset: number;
  records: DataRecord[];
}

type FilterValue = string | number | boolean | null | (string | number)[];
type FilterOp = "=" | "!=" | ">" | ">=" | "<" | "<=" | "contains" | "starts_with" | "ends_with" | "in" | "between" | "is_null" | "is_not_null";

interface AdvancedFilter {
  field: string;
  op: FilterOp;
  value: any;
}

function matchFilter(record: DataRecord, filter: AdvancedFilter): boolean {
  const val = record[filter.field];
  const cmp = filter.value;
  switch (filter.op) {
    case "=": return val === cmp;
    case "!=": return val !== cmp;
    case ">": return typeof val === "number" && val > cmp;
    case ">=": return typeof val === "number" && val >= cmp;
    case "<": return typeof val === "number" && val < cmp;
    case "<=": return typeof val === "number" && val <= cmp;
    case "contains": return String(val).toLowerCase().includes(String(cmp).toLowerCase());
    case "starts_with": return String(val).toLowerCase().startsWith(String(cmp).toLowerCase());
    case "ends_with": return String(val).toLowerCase().endsWith(String(cmp).toLowerCase());
    case "in": return Array.isArray(cmp) && cmp.includes(val);
    case "between": return typeof val === "number" && val >= cmp[0] && val <= cmp[1];
    case "is_null": return val === null || val === undefined;
    case "is_not_null": return val !== null && val !== undefined;
    default: return true;
  }
}

export async function query(
  filters: DataRecord | AdvancedFilter[] = {},
  limit = 25,
  offset = 0,
  sortBy?: string,
  sortDir: "asc" | "desc" = "asc"
): Promise<QueryResult> {
  let rows = load();
  if (Array.isArray(filters)) {
    for (const f of filters) {
      rows = rows.filter((r) => matchFilter(r, f));
    }
  } else {
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        rows = rows.filter((r) => r[key] === null || r[key] === undefined);
      } else if (Array.isArray(value)) {
        rows = rows.filter((r) => value.includes(r[key]));
      } else if (typeof value === "string" && value.startsWith("%") && value.endsWith("%")) {
        const sub = value.slice(1, -1).toLowerCase();
        rows = rows.filter((r) => String(r[key]).toLowerCase().includes(sub));
      } else {
        rows = rows.filter((r) => String(r[key]) === String(value));
      }
    }
  }
  if (sortBy) {
    rows.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }
  const total = rows.length;
  const records = rows.slice(offset, offset + limit);
  return { total, returned: records.length, offset, records };
}

export async function getRecord(idValue: string, idField = "id"): Promise<DataRecord | null> {
  const rows = load();
  return rows.find((r) => String(r[idField]) === String(idValue)) ?? null;
}

function numericValues(rows: DataRecord[], field: string): number[] {
  return rows.map((r) => r[field]).filter((v) => typeof v === "number" && !isNaN(v));
}

function mean(vals: number[]): number { return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; }
function median(vals: number[]): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function stddev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}
function percentile(vals: number[], p: number): number {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (idx - lo);
}
function histogram(vals: number[], bins = 10): { range: string; count: number }[] {
  if (!vals.length) return [];
  const min = Math.min(...vals), max = Math.max(...vals);
  const binSize = (max - min) / bins || 1;
  const result: { range: string; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const lo = min + i * binSize, hi = min + (i + 1) * binSize;
    result.push({ range: `${lo.toFixed(2)}-${hi.toFixed(2)}`, count: vals.filter((v) => v >= lo && (i === bins - 1 ? v <= hi : v < hi)).length });
  }
  return result;
}

export interface Stats {
  count: number;
  numericFields: Record<string, {
    min: number; max: number; mean: number; median: number;
    stddev: number; p25: number; p75: number; p95: number;
    histogram: { range: string; count: number }[];
    nullCount: number;
  }>;
  categoricalFields: Record<string, Record<string, number>>;
}

export async function stats(fields?: string[]): Promise<Stats> {
  const rows = load();
  const numeric: Record<string, number[]> = {};
  const nullCounts: Record<string, number> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (fields && !fields.includes(k)) continue;
      if (typeof v === "number" && !isNaN(v)) {
        (numeric[k] = numeric[k] || []).push(v);
      } else if (v === null || v === undefined) {
        nullCounts[k] = (nullCounts[k] || 0) + 1;
      }
    }
  }
  const numericFields: Record<string, any> = {};
  for (const [k, vals] of Object.entries(numeric)) {
    numericFields[k] = {
      min: Math.min(...vals), max: Math.max(...vals),
      mean: Math.round(mean(vals) * 100) / 100,
      median: Math.round(median(vals) * 100) / 100,
      stddev: Math.round(stddev(vals) * 100) / 100,
      p25: Math.round(percentile(vals, 25) * 100) / 100,
      p75: Math.round(percentile(vals, 75) * 100) / 100,
      p95: Math.round(percentile(vals, 95) * 100) / 100,
      histogram: histogram(vals),
      nullCount: nullCounts[k] || 0,
    };
  }
  const categoricalFields: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (fields && !fields.includes(k)) continue;
      if (typeof v === "string" || typeof v === "boolean") {
        const key = String(v);
        if (!categoricalFields[k]) categoricalFields[k] = {};
        categoricalFields[k][key] = (categoricalFields[k][key] || 0) + 1;
      }
    }
  }
  return { count: rows.length, numericFields, categoricalFields };
}

export async function aggregate(
  groupBy: string,
  aggregations: Record<string, "count" | "sum" | "avg" | "min" | "max" | "median">
): Promise<DataRecord[]> {
  const rows = load();
  const groups: Record<string, DataRecord[]> = {};
  for (const r of rows) {
    const key = String(r[groupBy] ?? "null");
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  const result: DataRecord[] = [];
  for (const [key, group] of Object.entries(groups)) {
    const row: DataRecord = { [groupBy]: key, _count: group.length };
    for (const [field, agg] of Object.entries(aggregations)) {
      const vals = numericValues(group, field);
      switch (agg) {
        case "count": row[`${field}_count`] = group.length; break;
        case "sum": row[`${field}_sum`] = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100; break;
        case "avg": row[`${field}_avg`] = Math.round(mean(vals) * 100) / 100; break;
        case "min": row[`${field}_min`] = vals.length ? Math.min(...vals) : 0; break;
        case "max": row[`${field}_max`] = vals.length ? Math.max(...vals) : 0; break;
        case "median": row[`${field}_median`] = Math.round(median(vals) * 100) / 100; break;
      }
    }
    result.push(row);
  }
  return result.sort((a, b) => b._count - a._count);
}

export async function timeSeries(
  timestampField: string,
  valueField: string,
  interval: "hour" | "day" | "week" | "month" = "day"
): Promise<DataRecord[]> {
  const rows = load();
  const grouped: Record<string, number[]> = {};
  const entries = (Object.entries(grouped) as [string, number[]][]).sort(([a], [b]) => a.localeCompare(b));
  for (const r of rows) {
    const ts = r[timestampField];
    if (!ts) continue;
    const d = new Date(ts);
    let key: string;
    switch (interval) {
      case "hour": key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:00`; break;
      case "day": key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; break;
      case "week": { const wd = new Date(d); wd.setDate(d.getDate() - d.getDay()); key = wd.toISOString().slice(0, 10); break; }
      case "month": key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; break;
    }
    const val = r[valueField];
    if (typeof val === "number") {
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(val);
    }
  }
  return entries.map(([period, vals]) => ({
    period, count: vals.length, sum: Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100,
    avg: Math.round(mean(vals) * 100) / 100, min: Math.min(...vals), max: Math.max(...vals),
    stddev: Math.round(stddev(vals) * 100) / 100,
  }));
}

export async function movingAverage(
  timestampField: string,
  valueField: string,
  windowSize: number = 7
): Promise<DataRecord[]> {
  const ts = await timeSeries(timestampField, valueField, "day");
  return ts.map((point, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const window = ts.slice(start, idx + 1);
    const vals = window.map((w) => w.avg);
    return { ...point, moving_avg: Math.round(mean(vals) * 100) / 100, window_size: window.length };
  });
}

export async function detectAnomalies(
  field: string,
  method: "zscore" | "iqr" = "zscore",
  threshold: number = 2.5
): Promise<{ anomalies: DataRecord[]; total: number; anomalyCount: number; threshold: number }> {
  const rows = load();
  const vals = numericValues(rows, field);
  if (vals.length < 10) return { anomalies: [], total: rows.length, anomalyCount: 0, threshold };
  if (method === "zscore") {
    const m = mean(vals), s = stddev(vals);
    const anomalies = rows.filter((r) => {
      if (typeof r[field] !== "number") return false;
      return Math.abs((r[field] - m) / (s || 1)) > threshold;
    });
    return { anomalies, total: rows.length, anomalyCount: anomalies.length, threshold };
  } else {
    const sorted = [...vals].sort((a, b) => a - b);
    const q1 = percentile(sorted, 25), q3 = percentile(sorted, 75);
    const iqr = q3 - q1;
    const lower = q1 - threshold * iqr, upper = q3 + threshold * iqr;
    const anomalies = rows.filter((r) => typeof r[field] === "number" && (r[field] < lower || r[field] > upper));
    return { anomalies, total: rows.length, anomalyCount: anomalies.length, threshold };
  }
}

export async function textSearch(
  query: string,
  fields?: string[]
): Promise<{ total: number; records: DataRecord[] }> {
  const rows = load();
  const q = query.toLowerCase();
  const searchFields = fields || Object.keys(rows[0] || {});
  const matches = rows.filter((r) =>
    searchFields.some((f) => {
      const v = r[f];
      if (v === null || v === undefined) return false;
      if (Array.isArray(v)) return v.some((item) => String(item).toLowerCase().includes(q));
      return String(v).toLowerCase().includes(q);
    })
  );
  return { total: matches.length, records: matches.slice(0, 100) };
}

export async function histogramData(
  field: string,
  bins: number = 10
): Promise<{ field: string; bins: { range: string; count: number; pct: number }[]; total: number }> {
  const rows = load();
  const vals = numericValues(rows, field);
  const hist = histogram(vals, bins);
  const total = vals.length;
  return {
    field,
    bins: hist.map((h) => ({ ...h, pct: Math.round((h.count / total) * 10000) / 100 })),
    total,
  };
}

export async function correlation(
  field1: string,
  field2: string
): Promise<{ field1: string; field2: string; correlation: number; n: number }> {
  const rows = load();
  const pairs = rows
    .filter((r) => typeof r[field1] === "number" && typeof r[field2] === "number")
    .map((r) => [r[field1], r[field2]] as [number, number]);
  if (pairs.length < 3) return { field1, field2, correlation: 0, n: pairs.length };
  const xs = pairs.map((p) => p[0]), ys = pairs.map((p) => p[1]);
  const mx = mean(xs), my = mean(ys);
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const denX = Math.sqrt(pairs.reduce((s, [x]) => s + (x - mx) ** 2, 0));
  const denY = Math.sqrt(pairs.reduce((s, [, y]) => s + (y - my) ** 2, 0));
  const r = denX && denY ? num / (denX * denY) : 0;
  return { field1, field2, correlation: Math.round(r * 10000) / 10000, n: pairs.length };
}
