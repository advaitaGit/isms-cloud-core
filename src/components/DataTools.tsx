import { useRef, useState } from "react";
import { Database, Download, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchRemoteData } from "@/lib/datasource.functions";
import { downloadCsv, parseCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RISK_DOMAINS, RISK_SEVERITIES, RISK_STATUSES } from "@/lib/types";

export type Dataset = Record<string, string>[];
export interface Source {
  kind: "csv" | "google" | "microsoft" | "api" | "server";
  url?: string;
  headerName?: string;
  headerValue?: string;
}

export const SOURCE_LABELS: Record<Source["kind"], string> = {
  csv: "CSV file (local)",
  google: "Google Sheets",
  microsoft: "Microsoft Excel / OneDrive",
  api: "REST API (JSON or CSV)",
  server: "Server IP address",
};

/** Turn JSON or CSV text into flat string rows. */
export function normalizeRows(text: string, format: "json" | "csv"): Dataset {
  if (format === "csv") return parseCsv(text);
  let json: unknown = JSON.parse(text);
  if (!Array.isArray(json) && json && typeof json === "object") {
    json = Object.values(json as Record<string, unknown>).find(Array.isArray) ?? [json];
  }
  return (json as unknown[]).slice(0, 5000).map((r) =>
    Object.fromEntries(
      Object.entries((r ?? {}) as Record<string, unknown>).map(([k, v]) => [
        k,
        v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v),
      ]),
    ),
  );
}

export function useLoadSource() {
  const fetchRemote = useServerFn(fetchRemoteData);
  return async (src: Source): Promise<Dataset> => {
    if (src.kind === "csv" || !src.url) throw new Error("Upload a file instead");
    const res = await fetchRemote({ data: { kind: src.kind, url: src.url, headerName: src.headerName, headerValue: src.headerValue } });
    return normalizeRows(res.text, res.format);
  };
}

const readFile = (f: File) => f.text().then((t) => (f.name.endsWith(".json") ? normalizeRows(t, "json") : parseCsv(t)));

/** Dialog to pick a data source for a new dashboard. */
export function SourceDialog({ open, onOpenChange, onCreate }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, dataset: Dataset | null, source: Source | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Source["kind"] | "blank">("blank");
  const [url, setUrl] = useState("");
  const [hName, setHName] = useState("");
  const [hValue, setHValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useLoadSource();

  const submit = async () => {
    if (!name.trim()) return void toast.error("Give the dashboard a name");
    setBusy(true);
    try {
      if (kind === "blank") await onCreate(name.trim(), null, null);
      else if (kind === "csv") {
        if (!file) throw new Error("Choose a file");
        const rows = await readFile(file);
        if (!rows.length) throw new Error("The file has no rows");
        await onCreate(name.trim(), rows, { kind: "csv" });
      } else {
        const src: Source = { kind, url, ...(hName ? { headerName: hName, headerValue: hValue } : {}) };
        const rows = await load(src);
        if (!rows.length) throw new Error("The source returned no rows");
        await onCreate(name.trim(), rows, src);
      }
      setName(""); setUrl(""); setFile(null); setKind("blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load data");
    } finally {
      setBusy(false);
    }
  };

  const hint: Record<string, string> = {
    google: "Share the sheet as 'Anyone with the link can view', then paste its link. The tab in the link is used.",
    microsoft: "In OneDrive/SharePoint, share the file as 'Anyone with the link', save it as CSV, and paste the link.",
    api: "Any https endpoint returning a JSON array (or an object containing one) or CSV.",
    server: "e.g. http://203.0.113.10:8080/export.csv — must be reachable from the internet (not a 192.168.x / 10.x address).",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New dashboard</DialogTitle>
          <DialogDescription>Start blank with ISMS data, or connect your own data source.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Incident tracker" />
          </div>
          <div className="space-y-2">
            <Label>Data source</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["blank", "csv", "google", "microsoft", "api", "server"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)}
                  className={`rounded-md border px-3 py-2 text-left text-xs font-medium ${kind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                  {k === "blank" ? "Blank (ISMS data)" : SOURCE_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
          {kind === "csv" && (
            <Input type="file" accept=".csv,.json,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          )}
          {kind !== "blank" && kind !== "csv" && (
            <div className="space-y-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              <p className="text-xs text-muted-foreground">{hint[kind]}</p>
              {(kind === "api" || kind === "server") && (
                <div className="grid grid-cols-2 gap-2">
                  <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Header (optional), e.g. Authorization" />
                  <Input value={hValue} onChange={(e) => setHValue(e.target.value)} placeholder="Value, e.g. Bearer …" type="password" />
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>{busy ? "Loading…" : "Create dashboard"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RISK_COLUMNS = ["title", "description", "domain", "severity", "status", "owner"];

/** Toolbar menu: sample CSV, import CSV, refresh remote source. */
export function DataMenu({ dataset, source, orgId, disabled, onDataset, onRisksImported }: {
  dataset: Dataset | null;
  source: Source | null;
  orgId: string | undefined;
  disabled: boolean;
  onDataset: (rows: Dataset) => Promise<void>;
  onRisksImported: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useLoadSource();
  const headers = dataset?.[0] ? Object.keys(dataset[0]) : RISK_COLUMNS;

  const sample = () => {
    const example = dataset?.length
      ? [dataset[0]!]
      : [{ title: "Example: Email server outage", description: "Mail unavailable > 4h", domain: "IT", severity: "High", status: "Open", owner: "IT Ops" }];
    downloadCsv(dataset ? "dashboard_sample" : "risk_register_sample", example, headers);
    if (!dataset) toast.info(`Allowed values — domain: ${RISK_DOMAINS.join("/")}; severity: ${RISK_SEVERITIES.join("/")}; status: ${RISK_STATUSES.join("/")}`, { duration: 10000 });
  };

  const importFile = async (f: File) => {
    try {
      const rows = await readFile(f);
      if (!rows.length) throw new Error("No rows found");
      const missing = headers.filter((h) => !(h in rows[0]!));
      if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}. Download the sample first.`);
      if (dataset) {
        await onDataset([...dataset, ...rows]);
        toast.success(`Added ${rows.length} rows`);
      } else {
        if (!orgId) throw new Error("No organization");
        const pick = <T extends string>(v: string | undefined, list: readonly T[], d: T) => (list.find((x) => x.toLowerCase() === (v ?? "").toLowerCase()) ?? d);
        const { error } = await supabase.from("risks").insert(
          rows.filter((r) => r["title"]).map((r) => ({
            organization_id: orgId,
            title: r["title"]!,
            description: r["description"] ?? "",
            domain: pick(r["domain"], RISK_DOMAINS, "Internal"),
            severity: pick(r["severity"], RISK_SEVERITIES, "Medium"),
            status: pick(r["status"], RISK_STATUSES, "Open"),
            owner: r["owner"] ?? "",
          })),
        );
        if (error) throw error;
        toast.success(`Imported ${rows.length} risks into the register`);
        onRisksImported();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const refresh = async () => {
    if (!source) return;
    try {
      const rows = await load(source);
      await onDataset(rows);
      toast.success(`Refreshed — ${rows.length} rows`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.json,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ""; }} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline"><Database className="size-4" /> Data</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onClick={sample}><Download className="size-4" /> Download sample CSV</DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> {dataset ? "Import CSV (append rows)" : "Import risks from CSV"}
          </DropdownMenuItem>
          {dataset && (
            <DropdownMenuItem onClick={() => downloadCsv("dashboard_data", dataset, headers)}>
              <Download className="size-4" /> Export all data
            </DropdownMenuItem>
          )}
          {source && source.kind !== "csv" && (
            <DropdownMenuItem onClick={refresh}><RefreshCw className="size-4" /> Refresh from {SOURCE_LABELS[source.kind]}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
