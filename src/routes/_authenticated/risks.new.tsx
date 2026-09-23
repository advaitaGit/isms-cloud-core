import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { RISK_DOMAINS, RISK_SEVERITIES, RISK_STATUSES } from "@/lib/types";

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
  });
  const [busy, setBusy] = useState(false);

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
    if (!auth.organization) return toast.error("No organization assigned");
    setBusy(true);
    const { error } = await supabase.from("risks").insert({
      ...form,
      organization_id: auth.organization.id,
      owner: form.owner || auth.profile?.name || "",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Risk logged");
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
          />
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
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Log risk"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/risks" })}>
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
}
