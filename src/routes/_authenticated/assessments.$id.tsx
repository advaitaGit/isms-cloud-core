import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type AppRole } from "@/lib/types";
import {
  NC_GRADES,
  NC_STATUSES,
  RELEASE_ROLES,
  RESPONSES,
  readiness,
  scoreTone,
  type Assessment,
  type AssessmentItem,
  type NonConformity,
} from "@/lib/assessment";

export const Route = createFileRoute("/_authenticated/assessments/$id")({
  head: () => ({
    meta: [
      { title: "Assessment · ISMS Portal" },
      { name: "description", content: "Gap assessment checklist, non-conformities and corrective actions." },
    ],
  }),
  component: AssessmentDetail,
});

const RESP_STYLE: Record<string, string> = {
  Yes: "bg-success text-success-foreground",
  Partial: "bg-warning text-warning-foreground",
  No: "bg-destructive text-destructive-foreground",
  "N/A": "bg-secondary text-secondary-foreground",
};

function AssessmentDetail() {
  const { id } = Route.useParams();
  const auth = useAuth();
  const qc = useQueryClient();
  const canEdit =
    !auth.readOnly &&
    (auth.isSystemOwner || auth.roles.some((r) => ["org_admin", "manager", "auditor"].includes(r)));

  const { data } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const [a, i, n] = await Promise.all([
        supabase.from("assessments").select("*").eq("id", id).maybeSingle(),
        supabase.from("assessment_items").select("*").eq("assessment_id", id).order("sort"),
        supabase.from("nonconformities").select("*").eq("assessment_id", id).order("created_at"),
      ]);
      return {
        a: a.data as Assessment | null,
        items: (i.data ?? []) as AssessmentItem[],
        ncs: (n.data ?? []) as NonConformity[],
      };
    },
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["assessment", id] });
    void qc.invalidateQueries({ queryKey: ["assessments"] });
  };

  if (!data) return null;
  if (!data.a)
    return <div className="panel p-8 text-sm text-muted-foreground">Assessment not found or not released to you.</div>;
  const a = data.a;
  const r = readiness(data.items);
  const sections = [...new Set(data.items.map((i) => i.section))];

  const answer = async (item: AssessmentItem, response: string) => {
    const { error } = await supabase.from("assessment_items").update({ response }).eq("id", item.id);
    if (error) return void toast.error(error.message);
    const existing = data.ncs.find((n) => n.item_id === item.id);
    if ((response === "No" || response === "Partial") && !existing) {
      await supabase.from("nonconformities").insert({
        organization_id: a.organization_id,
        assessment_id: a.id,
        item_id: item.id,
        ref: item.ref,
        title: item.requirement,
        grade: response === "No" ? "Major" : "Minor",
      });
      toast.info(`Non-conformity raised for ${item.ref}`);
    } else if (existing && (response === "Yes" || response === "N/A") && existing.status === "Open" && !existing.corrective_action) {
      await supabase.from("nonconformities").delete().eq("id", existing.id);
    } else if (existing && response !== "Yes" && response !== "N/A") {
      await supabase.from("nonconformities").update({ grade: response === "No" ? "Major" : "Minor" }).eq("id", existing.id);
    }
    refresh();
  };

  const saveEvidence = async (item: AssessmentItem, evidence: string) => {
    if (evidence === item.evidence) return;
    await supabase.from("assessment_items").update({ evidence }).eq("id", item.id);
    refresh();
  };

  const updateNc = async (nc: NonConformity, patch: Partial<NonConformity>) => {
    const { error } = await supabase.from("nonconformities").update(patch).eq("id", nc.id);
    if (error) toast.error(error.message);
    refresh();
  };

  return (
    <>
      <Link to="/assessments" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All assessments
      </Link>
      <PageHeader
        title={a.title}
        description={`${a.audit_type} audit · ${a.standard}${a.auditor ? ` · Lead auditor ${a.auditor}` : ""}`}
        action={
          canEdit && (
            <div className="flex gap-2">
              <Select
                value={a.status}
                onValueChange={async (v) => {
                  await supabase.from("assessments").update({ status: v }).eq("id", a.id);
                  refresh();
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <ReleaseDialog a={a} onDone={refresh} />
            </div>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <p className="text-sm text-muted-foreground">Readiness score</p>
          <p className="mt-2 text-3xl font-semibold" style={{ color: scoreTone(r.score) }}>{r.score}%</p>
          <div className="mt-3 h-1.5 rounded-full bg-muted">
            <div className="h-1.5 rounded-full" style={{ width: `${r.score}%`, background: scoreTone(r.score) }} />
          </div>
        </div>
        <Stat label="Checks answered" value={`${r.answered}/${r.total}`} />
        <Stat label="Major NCs" value={data.ncs.filter((n) => n.grade === "Major" && n.status !== "Closed").length} />
        <Stat label="Corrective actions closed" value={`${data.ncs.filter((n) => n.status === "Closed").length}/${data.ncs.length}`} />
      </div>
      {a.released && (
        <p className="mt-3 text-xs text-muted-foreground">
          Released to {a.release_roles.map((x) => ROLE_LABELS[x as AppRole] ?? x).join(", ")}
          {a.released_at ? ` on ${new Date(a.released_at).toLocaleDateString()}` : ""}.
        </p>
      )}

      <Tabs defaultValue="checklist" className="mt-6">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="nc">Non-conformities & corrective actions ({data.ncs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          {sections.map((section) => (
            <div key={section} className="panel overflow-hidden">
              <p className="border-b bg-muted/50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section}</p>
              <div className="divide-y">
                {data.items.filter((i) => i.section === section).map((item) => (
                  <div key={item.id} className="grid gap-3 px-5 py-3 lg:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm"><span className="mr-2 font-mono text-xs text-muted-foreground">{item.ref}</span>{item.requirement}</p>
                      <Input
                        key={item.evidence}
                        defaultValue={item.evidence}
                        disabled={!canEdit}
                        placeholder="Evidence / notes"
                        className="mt-2 h-8 text-xs"
                        onBlur={(e) => saveEvidence(item, e.target.value)}
                      />
                    </div>
                    <div className="flex items-start gap-1">
                      {RESPONSES.map((resp) => (
                        <button
                          key={resp}
                          disabled={!canEdit}
                          onClick={() => answer(item, resp)}
                          className={cn(
                            "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed",
                            item.response === resp ? RESP_STYLE[resp] : "bg-background text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {resp}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="nc" className="space-y-3">
          {data.ncs.length === 0 && (
            <div className="panel p-8 text-center text-sm text-muted-foreground">
              No non-conformities. Answer a check with "No" or "Partial" to raise one.
            </div>
          )}
          {data.ncs.map((nc) => (
            <div key={nc.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium"><span className="mr-2 font-mono text-xs text-muted-foreground">{nc.ref}</span>{nc.title}</p>
                  <p className="text-xs text-muted-foreground">Raised {new Date(nc.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Select value={nc.grade} disabled={!canEdit} onValueChange={(v) => updateNc(nc, { grade: v })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{NC_GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={nc.status} disabled={!canEdit} onValueChange={(v) => updateNc(nc, { status: v })}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{NC_STATUSES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_180px_160px]">
                <Input key={`ca-${nc.corrective_action}`} defaultValue={nc.corrective_action} disabled={!canEdit} placeholder="Corrective action"
                  onBlur={(e) => e.target.value !== nc.corrective_action && updateNc(nc, { corrective_action: e.target.value })} />
                <Input key={`o-${nc.owner}`} defaultValue={nc.owner} disabled={!canEdit} placeholder="Action owner"
                  onBlur={(e) => e.target.value !== nc.owner && updateNc(nc, { owner: e.target.value })} />
                <Input type="date" defaultValue={nc.due_date ?? ""} disabled={!canEdit}
                  onChange={(e) => updateNc(nc, { due_date: e.target.value || null })} />
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ReleaseDialog({ a, onDone }: { a: Assessment; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>(a.release_roles.length ? a.release_roles : ["org_admin", "director"]);
  const save = async (released: boolean) => {
    const { error } = await supabase
      .from("assessments")
      .update({ released, release_roles: roles, released_at: released ? new Date().toISOString() : null })
      .eq("id", a.id);
    if (error) return void toast.error(error.message);
    toast.success(released ? "Results released" : "Release withdrawn");
    setOpen(false);
    onDone();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Send className="size-4" /> {a.released ? "Manage release" : "Release results"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Release results to</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {RELEASE_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox checked={roles.includes(r)} onCheckedChange={(c) => setRoles(c ? [...roles, r] : roles.filter((x) => x !== r))} />
              {ROLE_LABELS[r as AppRole]}
            </label>
          ))}
        </div>
        <DialogFooter>
          {a.released && <Button variant="outline" onClick={() => save(false)}>Withdraw</Button>}
          <Button disabled={!roles.length} onClick={() => save(true)}>Release</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
