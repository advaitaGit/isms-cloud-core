import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RISK_DOMAINS, RISK_SEVERITIES, RISK_STATUSES, type SubOrganization } from "@/lib/types";

interface LibraryItem { id: string; code: string; title: string; description: string; domain: string; severity: string; keywords: string; suggested_control: string }

export const Route = createFileRoute("/_authenticated/risks/new")({
  component: LogRisk,
});

function LogRisk() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    description: "",
    domain: "IT",
    severity: "Medium",
    status: "Open",
    owner: "",
    sub_organization_id: "none",
  });
  const [busy, setBusy] = useState(false);
  const { data: library = [] } = useQuery({
    queryKey: ["risk-library"],
    queryFn: async () => ((await supabase.from("risk_library").select("*")).data ?? []) as LibraryItem[],
  });
  const { data: subs = [] } = useQuery({
    queryKey: ["subs", auth.organization?.id],
    enabled: !!auth.organization,
    queryFn: async () =>
      ((await supabase.from("sub_organizations").select("*").eq("organization_id", auth.organization!.id)).data ?? []) as SubOrganization[],
  });
  const terms = form.title.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  const suggestions = terms.length
    ? library
        .map((l) => {
          const hay = `${l.title} ${l.keywords} ${l.description}`.toLowerCase();
          return { l, score: terms.filter((t) => hay.includes(t)).length };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((x) => x.l)
    : [];
  const [mode, setMode] = useState<"Draft" | "Submitted">("Submitted");

  if (auth.readOnly) {
    return (
      <>
        <PageHeader title="Log a Risk" />
        <div className="panel p-8 text-sm text-muted-foreground">
          This account is unsubscribed or on a trial and is for sample viewing only. Logging new
          risks is disabled.
        </div>
      </>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.organization) {
      toast.error("No organization assigned");
      return;
    }
    setBusy(true);
    const { sub_organization_id, ...rest } = form;
    const { error } = await supabase.from("risks").insert({
      ...rest,
      sub_organization_id: sub_organization_id === "none" ? (auth.profile?.sub_organization_id ?? null) : sub_organization_id,
      workflow_status: auth.canApprove ? "Approved" : mode,
      organization_id: auth.organization.id,
      owner: form.owner || auth.profile?.name || "",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(auth.canApprove ? "Risk logged" : mode === "Draft" ? "Draft saved" : "Submitted for approval");
    void queryClient.invalidateQueries({ queryKey: ["risks"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    navigate({ to: "/risks" });
  };

  return (
    <>
      <PageHeader title="Log a Risk" description="Record a new risk in your organization's register." />
      <form onSubmit={submit} className="panel max-w-2xl space-y-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Risk title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lightbulb className="size-3.5 text-warning" /> Related risks from the risk index — click to use
              </p>
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() =>
                      setForm({ ...form, title: s.title, description: s.description, domain: s.domain, severity: s.severity })
                    }
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-background"
                  >
                    <span className="font-medium">{s.code} · {s.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {s.domain} · {s.severity} · {s.suggested_control}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Domain</Label>
            <Select value={form.domain} onValueChange={(v) => setForm({ ...form, domain: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner">Risk owner</Label>
          <Input
            id="owner"
            placeholder={auth.profile?.name ?? ""}
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
          />
        </div>
        {subs.length > 0 && (
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.sub_organization_id} onValueChange={(v) => setForm({ ...form, sub_organization_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">My home department</SelectItem>
                {subs.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2">
          {auth.canApprove ? (
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Log risk"}</Button>
          ) : (
            <>
              <Button type="submit" disabled={busy || auth.policy !== "submit"} onClick={() => setMode("Submitted")}>
                Submit for approval
              </Button>
              <Button type="submit" variant="secondary" disabled={busy} onClick={() => setMode("Draft")}>
                Save draft
              </Button>
            </>
          )}
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/risks" })}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
