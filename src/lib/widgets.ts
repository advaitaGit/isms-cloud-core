import {
  CONTROL_STATUSES,
  RISK_DOMAINS,
  RISK_SEVERITIES,
  RISK_STATUSES,
  type Control,
  type Risk,
} from "@/lib/types";
import { readiness } from "@/lib/assessment";

export type WidgetType = "kpi" | "bar" | "line" | "area" | "donut" | "table";
export type WidgetSize = "S" | "M" | "L";
export interface Widget {
  id: string;
  type: WidgetType;
  metric: string;
  size: WidgetSize;
  title?: string;
}
export interface Layout {
  name: string;
  widgets: Widget[];
}
export interface Row {
  name: string;
  value: number;
}
export interface DashData {
  risks: Risk[];
  controls: Control[];
  ncs: { status: string; grade: string }[];
  items: { response: string }[];
  dataset?: Record<string, string>[] | null;
}

const count = <T>(list: T[], keys: readonly string[], f: (x: T) => string): Row[] =>
  keys.map((k) => ({ name: k, value: list.filter((x) => f(x) === k).length }));

export const METRICS: Record<string, { label: string; kpi?: boolean; compute: (d: DashData) => Row[] }> = {
  kpi_active: { label: "Active risks", kpi: true, compute: (d) => [{ name: "Active", value: d.risks.filter((r) => r.status !== "Resolved").length }] },
  kpi_critical: { label: "Critical risks", kpi: true, compute: (d) => [{ name: "Critical", value: d.risks.filter((r) => r.severity === "Critical" && r.status !== "Resolved").length }] },
  kpi_controls: { label: "Controls implemented %", kpi: true, compute: (d) => [{ name: "%", value: d.controls.length ? Math.round((d.controls.filter((c) => c.status === "Implemented").length / d.controls.length) * 100) : 0 }] },
  kpi_resolved: { label: "Resolved risks", kpi: true, compute: (d) => [{ name: "Resolved", value: d.risks.filter((r) => r.status === "Resolved").length }] },
  kpi_readiness: { label: "Audit readiness %", kpi: true, compute: (d) => [{ name: "%", value: readiness(d.items).score }] },
  kpi_open_nc: { label: "Open non-conformities", kpi: true, compute: (d) => [{ name: "Open", value: d.ncs.filter((n) => n.status !== "Closed").length }] },
  risks_by_domain: { label: "Risks by domain", compute: (d) => count(d.risks, RISK_DOMAINS, (r) => r.domain) },
  risks_by_status: { label: "Mitigation status", compute: (d) => count(d.risks, RISK_STATUSES, (r) => r.status) },
  risks_by_severity: { label: "Risks by severity", compute: (d) => count(d.risks, RISK_SEVERITIES, (r) => r.severity) },
  risks_over_time: {
    label: "Risks logged per month",
    compute: (d) => {
      const months: Row[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = m.toISOString().slice(0, 7);
        months.push({ name: m.toLocaleString("en", { month: "short", year: "2-digit" }), value: d.risks.filter((r) => r.created_at.startsWith(key)).length });
      }
      return months;
    },
  },
  controls_by_status: { label: "Controls by status", compute: (d) => count(d.controls, CONTROL_STATUSES, (c) => c.status) },
  nc_by_grade: { label: "Non-conformities by grade", compute: (d) => count(d.ncs, ["Major", "Minor", "Observation"], (n) => n.grade) },
};

/** Metrics for an imported dataset: count rows grouped by each column, or sum numeric columns. */
export function datasetMetrics(rows: Record<string, string>[]) {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const out: Record<string, { label: string; compute: () => Row[] }> = {};
  for (const c of cols) {
    const numeric = rows.every((r) => r[c] === "" || !isNaN(Number(r[c])));
    out[`ds_count:${c}`] = {
      label: `Rows by ${c}`,
      compute: () => {
        const m = new Map<string, number>();
        rows.forEach((r) => m.set(r[c] || "(blank)", (m.get(r[c] || "(blank)") ?? 0) + 1));
        return [...m].map(([name, value]) => ({ name, value })).slice(0, 30);
      },
    };
    if (numeric && cols[0] !== c)
      out[`ds_sum:${c}`] = {
        label: `${c} by ${cols[0]}`,
        compute: () => rows.map((r) => ({ name: r[cols[0]] ?? "", value: Number(r[c]) || 0 })).slice(0, 50),
      };
  }
  return out;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const DEFAULT_LAYOUT: Layout = {
  name: "Customization 1",
  widgets: [
    { id: uid(), type: "kpi", metric: "kpi_active", size: "S" },
    { id: uid(), type: "kpi", metric: "kpi_critical", size: "S" },
    { id: uid(), type: "kpi", metric: "kpi_readiness", size: "S" },
    { id: uid(), type: "bar", metric: "risks_by_domain", size: "M" },
    { id: uid(), type: "donut", metric: "risks_by_status", size: "M" },
    { id: uid(), type: "line", metric: "risks_over_time", size: "L" },
  ],
};
