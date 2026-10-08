import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CHECKLIST, readiness, scoreTone, type Assessment } from "@/lib/assessment";

export const Route = createFileRoute("/_authenticated/assessments/")({
  head: () => ({
    meta: [
      { title: "Gap Assessments · ISMS Portal" },
      { name: "description", content: "Pre-audit gap assessments, non-conformities and readiness score." },
    ],
  }),
  component: Assessments,
});

function Assessments() {
  const auth = useAuth();
  const navigate = useNavigate();
  const canAudit =
    auth.isSystemOwner || auth.roles.some((r) => ["org_admin", "manager", "auditor"].includes(r));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", audit_type: "Internal", auditor: "" });

  const { data } = useQuery({
    queryKey: ["assessments", auth.organization?.id],
    queryFn: async () => {
      const [a, i, n] = await Promise.all([
        supabase.from("assessments").select("*").order("created_at", { ascending: false }),
        supabase.from("assessment_items").select("assessment_id, response"),
        supabase.from("nonconformities").select("assessment_id, status"),
      ]);
      return {
        list: (a.data ?? []) as Assessment[],
        items: i.data ?? [],
        ncs: n.data ?? [],
      };
    },
  });
  const list = data?.list ?? [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.organization) return;
    const { data: row, error } = await supabase
      .from("assessments")
      .insert({ ...form, organization_id: auth.organization.id })
      .select()
      .single();
    if (error || !row) return void toast.error(error?.message ?? "Failed");
    await supabase.from("assessment_items").insert(
      CHECKLIST.map(([ref, section, requirement], sort) => ({
        assessment_id: row.id,
        organization_id: auth.organization!.id,
        ref,
        section,
        requirement,
        sort,
      })),
    );
    toast.success("Assessment created");
    setOpen(false);
    navigate({ to: "/assessments/$id", params: { id: row.id } });
  };

  return (
    <>
      <PageHeader
        title="Gap Assessments"
        description="Pre-certification checklists for internal and external audits."
        action={
          canAudit && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button disabled={auth.readOnly}>New assessment</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New gap assessment</DialogTitle>
                </DialogHeader>
                <form onSubmit={create} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      required
                      placeholder="Q4 2026 pre-certification"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Audit type</Label>
                      <Select
                        value={form.audit_type}
                        onValueChange={(v) => setForm({ ...form, audit_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Internal">Internal</SelectItem>
                          <SelectItem value="External">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lead auditor</Label>
                      <Input
                        value={form.auditor}
                        onChange={(e) => setForm({ ...form, auditor: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes {CHECKLIST.length} ISO/IEC 27001:2022 clause and Annex A checks.
                  </p>
                  <DialogFooter>
                    <Button type="submit">Create</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => {
          const r = readiness((data?.items ?? []).filter((i) => i.assessment_id === a.id));
          const openNc = (data?.ncs ?? []).filter(
            (n) => n.assessment_id === a.id && n.status !== "Closed",
          ).length;
          return (
            <Link
              key={a.id}
              to="/assessments/$id"
              params={{ id: a.id }}
              className="panel block p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.audit_type} audit · {a.auditor || "No auditor"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-2xl font-semibold" style={{ color: scoreTone(r.score) }}>
                  {r.score}%
                </span>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${r.score}%`, background: scoreTone(r.score) }}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  {r.answered}/{r.total} answered
                </span>
                <span>· {openNc} open NCs</span>
                <span>· {a.status}</span>
                {a.released && <span className="text-success">· Released</span>}
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-sm text-muted-foreground">
            {canAudit
              ? "No assessments yet. Create one to start your pre-audit checklist."
              : "No assessment results have been released to you yet."}
          </div>
        )}
      </div>
    </>
  );
}
