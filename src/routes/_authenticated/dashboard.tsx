import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, LayoutGrid, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { WidgetCard } from "@/components/WidgetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Json } from "@/integrations/supabase/types";
import type { Control, Risk } from "@/lib/types";
import {
  DEFAULT_LAYOUT,
  METRICS,
  datasetMetrics,
  uid,
  type DashData,
  type Layout,
  type Widget,
  type WidgetType,
} from "@/lib/widgets";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · ISMS Portal" },
      { name: "description", content: "Customizable risk and compliance dashboards." },
    ],
  }),
  component: Dashboard,
});

interface DashRow {
  id: string;
  name: string;
  layouts: Layout[];
  active_layout: number;
  dataset: Record<string, string>[] | null;
}

function Dashboard() {
  const auth = useAuth();
  const qc = useQueryClient();
  const orgId = auth.organization?.id;

  const { data } = useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: async (): Promise<DashData> => {
      const [r, c, n, latest] = await Promise.all([
        supabase.from("risks").select("*"),
        supabase.from("controls").select("*"),
        supabase.from("nonconformities").select("status, grade"),
        supabase.from("assessments").select("id").order("created_at", { ascending: false }).limit(1),
      ]);
      const aid = latest.data?.[0]?.id;
      const items = aid ? ((await supabase.from("assessment_items").select("response").eq("assessment_id", aid)).data ?? []) : [];
      return { risks: (r.data ?? []) as Risk[], controls: (c.data ?? []) as Control[], ncs: n.data ?? [], items };
    },
  });

  const { data: dashboards = [], isFetched } = useQuery({
    queryKey: ["my-dashboards", auth.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("dashboards").select("*").order("created_at");
      return (data ?? []) as unknown as DashRow[];
    },
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<DashRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [rename, setRename] = useState<null | "dashboard" | "layout">(null);
  const [newOpen, setNewOpen] = useState(false);

  // Create the default dashboard for first-time users.
  useEffect(() => {
    if (!isFetched || dashboards.length || !auth.user) return;
    void supabase
      .from("dashboards")
      .insert({ name: "Main dashboard", organization_id: orgId ?? null, layouts: [DEFAULT_LAYOUT] as unknown as Json })
      .then(() => qc.invalidateQueries({ queryKey: ["my-dashboards"] }));
  }, [isFetched, dashboards.length, auth.user, orgId, qc]);

  useEffect(() => {
    if (!dashboards.length) return;
    const d = dashboards.find((x) => x.id === selected) ?? dashboards[0];
    if (!d) return;
    if (!selected) setSelected(d.id);
    if (!dirty || draft?.id !== d.id) {
      setDraft(structuredClone(d));
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboards, selected]);

  const metrics = useMemo(() => {
    const ds = draft?.dataset;
    return ds?.length
      ? { ...Object.fromEntries(Object.entries(datasetMetrics(ds)).map(([k, v]) => [k, { label: v.label, compute: v.compute }])) }
      : METRICS;
  }, [draft?.dataset]);

  if (!draft || !data) return <PageHeader title="Dashboard" description="Loading…" />;
  const layoutIdx = Math.min(draft.active_layout, draft.layouts.length - 1);
  const layout = draft.layouts[layoutIdx] ?? DEFAULT_LAYOUT;

  const update = (fn: (d: DashRow) => void) => {
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
    setDirty(true);
  };
  const setWidgets = (widgets: Widget[]) => update((d) => (d.layouts[layoutIdx] = { ...layout, widgets }));

  const save = async (d = draft) => {
    const { error } = await supabase
      .from("dashboards")
      .update({ name: d.name, layouts: d.layouts as unknown as Json, active_layout: d.active_layout })
      .eq("id", d.id);
    if (error) return void toast.error(error.message);
    setDirty(false);
    toast.success("Dashboard saved");
    void qc.invalidateQueries({ queryKey: ["my-dashboards"] });
  };

  const switchLayout = (i: number) => {
    const next = { ...structuredClone(draft), active_layout: i };
    setDraft(next);
    void save(next);
  };

  const addLayout = (copy: boolean) => {
    const next = structuredClone(draft);
    next.layouts.push({
      name: `Customization ${next.layouts.length + 1}`,
      widgets: copy ? layout.widgets.map((w) => ({ ...w, id: uid() })) : [],
    });
    next.active_layout = next.layouts.length - 1;
    setDraft(next);
    setEditing(true);
    void save(next);
  };

  const deleteLayout = () => {
    if (draft.layouts.length < 2) return void toast.error("Keep at least one customization");
    const next = structuredClone(draft);
    next.layouts.splice(layoutIdx, 1);
    next.active_layout = 0;
    setDraft(next);
    void save(next);
  };

  const deleteDashboard = async () => {
    if (dashboards.length < 2) return void toast.error("Keep at least one dashboard");
    if (!window.confirm(`Delete "${draft.name}"?`)) return;
    await supabase.from("dashboards").delete().eq("id", draft.id);
    setSelected(null);
    void qc.invalidateQueries({ queryKey: ["my-dashboards"] });
  };

  return (
    <>
      <PageHeader
        title={draft.name}
        description={auth.organization ? `${auth.organization.name} · ${auth.organization.tier} tier · ${auth.organization.subscription_status}` : "Organization overview"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={draft.id} onValueChange={(v) => { setDirty(false); setSelected(v); setEditing(false); }}>
              <SelectTrigger className="w-48"><LayoutGrid className="size-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setNewOpen(true)}><Plus className="size-4" /> New dashboard</Button>
            <Button variant={editing ? "default" : "outline"} onClick={() => { if (editing && dirty) void save(); setEditing(!editing); }}>
              {editing ? <><Save className="size-4" /> Done</> : <><Pencil className="size-4" /> Customize</>}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {draft.layouts.map((l, i) => (
          <button key={i} onClick={() => switchLayout(i)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${i === layoutIdx ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
            {l.name}
          </button>
        ))}
        {editing && (
          <>
            <Button size="sm" variant="ghost" onClick={() => addLayout(false)}><Plus className="size-3.5" /> Blank</Button>
            <Button size="sm" variant="ghost" onClick={() => addLayout(true)}><Copy className="size-3.5" /> Duplicate</Button>
            <Button size="sm" variant="ghost" onClick={() => setRename("layout")}><Pencil className="size-3.5" /> Rename view</Button>
            <Button size="sm" variant="ghost" onClick={deleteLayout}><Trash2 className="size-3.5" /> Delete view</Button>
            <span className="mx-1 h-4 w-px bg-border" />
            <Button size="sm" variant="ghost" onClick={() => setRename("dashboard")}>Rename dashboard</Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteDashboard}>Delete dashboard</Button>
            <Button size="sm" className="ml-auto" onClick={() => setAddOpen(true)}><Plus className="size-3.5" /> Add widget</Button>
            {dirty && <Button size="sm" variant="secondary" onClick={() => save()}><Save className="size-3.5" /> Save</Button>}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {layout.widgets.map((w) => {
          const m = metrics[w.metric];
          if (!m) return null;
          return (
            <WidgetCard key={w.id} widget={w} label={m.label} rows={m.compute(data)} editing={editing}
              onRemove={() => setWidgets(layout.widgets.filter((x) => x.id !== w.id))}
              onChange={(nw) => setWidgets(layout.widgets.map((x) => (x.id === w.id ? nw : x)))} />
          );
        })}
        {layout.widgets.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-sm text-muted-foreground">
            This view is empty. Click <b>Customize</b> → <b>Add widget</b>.
          </div>
        )}
      </div>

      <AddWidgetDialog open={addOpen} onOpenChange={setAddOpen} metrics={metrics}
        onAdd={(w) => { setWidgets([...layout.widgets, w]); setAddOpen(false); }} />

      <NameDialog
        open={rename !== null}
        title={rename === "layout" ? "Rename view" : "Rename dashboard"}
        initial={rename === "layout" ? layout.name : draft.name}
        onClose={() => setRename(null)}
        onSave={(name) => {
          const next = structuredClone(draft);
          if (rename === "layout" && next.layouts[layoutIdx]) next.layouts[layoutIdx].name = name;
          else next.name = name;
          setDraft(next);
          void save(next);
          setRename(null);
        }}
      />

      <NameDialog open={newOpen} title="New dashboard" initial="" onClose={() => setNewOpen(false)}
        onSave={async (name) => {
          const { data: row, error } = await supabase.from("dashboards")
            .insert({ name, organization_id: orgId ?? null, layouts: [{ name: "Customization 1", widgets: [] }] as unknown as Json })
            .select().single();
          if (error || !row) return void toast.error(error?.message ?? "Failed");
          setNewOpen(false);
          await qc.invalidateQueries({ queryKey: ["my-dashboards"] });
          setSelected(row.id);
          setEditing(true);
        }} />
    </>
  );
}

function AddWidgetDialog({ open, onOpenChange, metrics, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  metrics: Record<string, { label: string; kpi?: boolean }>; onAdd: (w: Widget) => void;
}) {
  const keys = Object.keys(metrics);
  const [metric, setMetric] = useState(keys[0] ?? "");
  const [type, setType] = useState<WidgetType>("bar");
  const [size, setSize] = useState<"S" | "M" | "L">("M");
  const isKpi = metrics[metric]?.kpi;
  useEffect(() => { if (!metrics[metric]) setMetric(keys[0] ?? ""); }, [metrics, metric, keys]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add widget</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{keys.map((k) => <SelectItem key={k} value={k}>{metrics[k]?.kpi ? "KPI · " : ""}{metrics[k]?.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!isKpi && (
            <div className="space-y-2">
              <Label>Chart type</Label>
              <div className="flex flex-wrap gap-2">
                {(["bar", "line", "area", "donut", "table"] as const).map((t) => (
                  <Button key={t} type="button" size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)} className="capitalize">{t}</Button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Size</Label>
            <div className="flex gap-2">
              {(["S", "M", "L"] as const).map((s) => (
                <Button key={s} type="button" size="sm" variant={size === s ? "default" : "outline"} onClick={() => setSize(s)}>
                  {s === "S" ? "Small" : s === "M" ? "Medium" : "Large"}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!metric} onClick={() => onAdd({ id: uid(), metric, type: isKpi ? "kpi" : type, size })}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NameDialog({ open, title, initial, onClose, onSave }: {
  open: boolean; title: string; initial: string; onClose: () => void; onSave: (n: string) => void;
}) {
  const [name, setName] = useState(initial);
  useEffect(() => { if (open) setName(initial); }, [open, initial]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <DialogFooter className="mt-4"><Button type="submit">Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
