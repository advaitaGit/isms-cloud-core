import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, X } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import type { Row, Widget, WidgetSize, WidgetType } from "@/lib/widgets";
import { cn } from "@/lib/utils";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export const SIZE_CLASS: Record<WidgetSize, string> = {
  S: "md:col-span-2",
  M: "md:col-span-3",
  L: "md:col-span-6",
};

export function WidgetCard({
  widget,
  label,
  rows,
  editing,
  onRemove,
  onChange,
}: {
  widget: Widget;
  label: string;
  rows: Row[];
  editing: boolean;
  onRemove: () => void;
  onChange: (w: Widget) => void;
}) {
  const title = widget.title || label;
  return (
    <div className={cn("panel group relative flex flex-col p-5", SIZE_CLASS[widget.size], editing && "ring-2 ring-primary/30")}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={cn("font-medium", widget.type === "kpi" ? "text-sm text-muted-foreground" : "text-sm")}>{title}</h2>
        <div className="flex items-center gap-1">
          {editing && (
            <>
              <select
                className="h-7 rounded border bg-background px-1 text-xs"
                value={widget.type}
                disabled={widget.type === "kpi"}
                onChange={(e) => onChange({ ...widget, type: e.target.value as WidgetType })}
              >
                {widget.type === "kpi" ? <option value="kpi">KPI</option> : (["bar", "line", "area", "donut", "table"] as const).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {(["S", "M", "L"] as const).map((s) => (
                <button key={s} onClick={() => onChange({ ...widget, size: s })}
                  className={cn("size-7 rounded border text-xs", widget.size === s ? "bg-primary text-primary-foreground" : "bg-background")}>{s}</button>
              ))}
              <button onClick={onRemove} className="grid size-7 place-items-center rounded border bg-background text-destructive" title="Remove">
                <X className="size-3.5" />
              </button>
            </>
          )}
          <button
            title="Download CSV"
            onClick={() => downloadCsv(title.replace(/\W+/g, "_").toLowerCase(), rows.map((r) => ({ [widget.type === "kpi" ? "metric" : "category"]: r.name, value: r.value })))}
            className="grid size-7 place-items-center rounded text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100"
          >
            <Download className="size-3.5" />
          </button>
        </div>
      </div>
      {widget.type === "kpi" ? (
        <p className="mt-3 text-3xl font-semibold tracking-tight">{rows[0]?.value ?? 0}{label.endsWith("%") ? "%" : ""}</p>
      ) : (
        <div className="mt-4 h-64">{renderChart(widget.type, rows)}</div>
      )}
    </div>
  );
}

function renderChart(type: WidgetType, rows: Row[]) {
  if (!rows.length || rows.every((r) => !r.value))
    return <p className="pt-24 text-center text-sm text-muted-foreground">No data yet.</p>;
  if (type === "table")
    return (
      <div className="h-full overflow-auto text-sm">
        <table className="w-full">
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.name}><td className="py-1.5">{r.name}</td><td className="py-1.5 text-right font-medium">{r.value}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={32} />
      <Tooltip cursor={{ fill: "var(--muted)" }} />
    </>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "bar" ? (
        <BarChart data={rows}>{axes}<Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--chart-1)" /></BarChart>
      ) : type === "line" ? (
        <LineChart data={rows}>{axes}<Line dataKey="value" type="monotone" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
      ) : type === "area" ? (
        <AreaChart data={rows}>{axes}<Area dataKey="value" type="monotone" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.25} /></AreaChart>
      ) : (
        <PieChart>
          <Pie data={rows.filter((r) => r.value > 0)} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%">
            {rows.filter((r) => r.value > 0).map((r, i) => <Cell key={r.name} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Legend verticalAlign="bottom" height={36} />
          <Tooltip />
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}
