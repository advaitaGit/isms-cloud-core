import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Building2,
  KeyRound,
  ListChecks,
  LogIn,
  LogOut,
  RotateCcw,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Activity Log — Sentinel ISMS" }] }),
  component: LogsPage,
});

interface AuditLog {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

const CATEGORIES = [
  { value: "auth", label: "Sign-in & security" },
  { value: "risk", label: "Risks" },
  { value: "control", label: "Controls" },
  { value: "user", label: "Users" },
  { value: "organization", label: "Organizations" },
];

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.password_change": "Changed password",
  "risk.created": "Logged a risk",
  "risk.updated": "Updated a risk",
  "risk.deleted": "Deleted a risk",
  "control.created": "Added a control",
  "control.updated": "Updated a control",
  "control.deleted": "Deleted a control",
  "user.created": "Added a user",
  "user.deleted": "Removed a user",
  "user.role_changed": "Changed a role",
  "user.password_reset": "Reset a password",
  "organization.created": "Created an organization",
  "organization.updated": "Updated an organization",
  "organization.deleted": "Deleted an organization",
};

function actionIcon(action: string) {
  if (action === "auth.login") return LogIn;
  if (action === "auth.logout") return LogOut;
  if (action.startsWith("auth.") || action === "user.password_reset") return KeyRound;
  if (action.startsWith("risk.")) return ListChecks;
  if (action.startsWith("control.")) return ShieldCheck;
  if (action.startsWith("organization.")) return Building2;
  return UserCog;
}

function actionTone(action: string) {
  if (action.endsWith(".deleted")) return "bg-destructive/10 text-destructive";
  if (action.endsWith(".created")) return "bg-success/10 text-success";
  if (action.startsWith("auth.")) return "bg-primary/10 text-primary";
  return "bg-warning/15 text-foreground";
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const HIDDEN_KEYS = new Set(["id", "organization_id", "created_at"]);

function LogsPage() {
  const auth = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [actor, setActor] = useState("all");
  const [org, setOrg] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", from, to],
    enabled: auth.canViewLogs,
    queryFn: async () => {
      let q = (supabase as any)
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (from) q = q.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59.999`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["log-orgs"],
    enabled: auth.isSystemOwner,
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id, name").order("name");
      return data ?? [];
    },
  });
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  const actors = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actor_email).filter(Boolean))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (category !== "all" && !l.action.startsWith(`${category}.`)) return false;
      if (actor !== "all" && l.actor_email !== actor) return false;
      if (org !== "all" && l.organization_id !== org) return false;
      if (s) {
        const hay = `${l.actor_email} ${l.summary} ${ACTION_LABELS[l.action] ?? l.action} ${JSON.stringify(l.details)}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [logs, search, category, actor, org]);

  const today = new Date().toDateString();
  const stats = {
    total: filtered.length,
    today: filtered.filter((l) => new Date(l.created_at).toDateString() === today).length,
    logins: filtered.filter((l) => l.action === "auth.login").length,
    changes: filtered.filter((l) => !l.action.startsWith("auth.")).length,
  };

  const reset = () => {
    setSearch("");
    setCategory("all");
    setActor("all");
    setOrg("all");
    setFrom("");
    setTo("");
  };

  if (!auth.canViewLogs) {
    return (
      <div className="panel p-8 text-center text-sm text-muted-foreground">
        You don't have access to the activity log.{" "}
        <Link to="/dashboard" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Activity Log"
        description={
          auth.isSystemOwner
            ? "Every sign-in and change across all organizations."
            : `Every sign-in and change in ${auth.organization?.name ?? "your organization"}.`
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Events shown", value: stats.total },
          { label: "Today", value: stats.today },
          { label: "Sign-ins", value: stats.logins },
          { label: "Data changes", value: stats.changes },
        ].map((k) => (
          <div key={k.label} className="panel p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="panel mb-4 grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="log-search">Search</Label>
          <Input
            id="log-search"
            placeholder="Person, item, detail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Person</Label>
          <Select value={actor} onValueChange={setActor}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {actors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-from">From</Label>
          <Input id="log-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="log-to">To</Label>
          <Input id="log-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {auth.isSystemOwner && (
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Organization</Label>
            <Select value={org} onValueChange={setOrg}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All organizations</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-end lg:col-start-6">
          <Button variant="outline" className="w-full" onClick={reset}>
            <RotateCcw className="size-4" /> Clear filters
          </Button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Item</TableHead>
              {auth.isSystemOwner && <TableHead>Organization</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Loading activity…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No activity matches these filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => {
              const Icon = actionIcon(l.action);
              return (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.actor_email || "System"}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                        actionTone(l.action),
                      )}
                    >
                      <Icon className="size-3.5" />
                      {ACTION_LABELS[l.action] ?? l.action}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{l.summary || "—"}</TableCell>
                  {auth.isSystemOwner && (
                    <TableCell className="text-sm text-muted-foreground">
                      {(l.organization_id && orgName.get(l.organization_id)) || "—"}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {logs.length >= 1000 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the newest 1,000 events. Narrow the dates to see older activity.
        </p>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{ACTION_LABELS[selected.action] ?? selected.action}</SheetTitle>
                <SheetDescription>
                  {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <dl className="mt-6 grid grid-cols-3 gap-y-3 px-4 text-sm">
                <dt className="text-muted-foreground">Who</dt>
                <dd className="col-span-2 font-medium">{selected.actor_email || "System"}</dd>
                <dt className="text-muted-foreground">Item</dt>
                <dd className="col-span-2">{selected.summary || "—"}</dd>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="col-span-2">
                  <Badge variant="secondary" className="capitalize">
                    {selected.entity_type}
                  </Badge>
                </dd>
                {auth.isSystemOwner && (
                  <>
                    <dt className="text-muted-foreground">Organization</dt>
                    <dd className="col-span-2">
                      {(selected.organization_id && orgName.get(selected.organization_id)) || "—"}
                    </dd>
                  </>
                )}
              </dl>
              <div className="mt-6 px-4">
                <h3 className="mb-2 text-sm font-semibold">Details</h3>
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(selected.details ?? {})
                        .filter(([k]) => !HIDDEN_KEYS.has(k))
                        .map(([k, v]) => {
                          const change =
                            v && typeof v === "object" && "to" in (v as object)
                              ? (v as { from: unknown; to: unknown })
                              : null;
                          return (
                            <tr key={k} className="border-b last:border-0">
                              <td className="w-1/3 bg-muted/40 px-3 py-2 align-top capitalize text-muted-foreground">
                                {k.replace(/_/g, " ")}
                              </td>
                              <td className="px-3 py-2 break-words">
                                {change ? (
                                  <span>
                                    <span className="text-muted-foreground line-through">
                                      {fmt(change.from)}
                                    </span>{" "}
                                    → <span className="font-medium">{fmt(change.to)}</span>
                                  </span>
                                ) : (
                                  fmt(v)
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {Object.keys(selected.details ?? {}).filter((k) => !HIDDEN_KEYS.has(k))
                        .length === 0 && (
                        <tr>
                          <td className="px-3 py-2 text-muted-foreground">No extra details.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
