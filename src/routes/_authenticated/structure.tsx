import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Building, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  POLICY_LABELS,
  POLICY_LEVELS,
  type Profile,
  type SubOrganization,
} from "@/lib/types";

export const Route = createFileRoute("/_authenticated/structure")({
  head: () => ({
    meta: [
      { title: "Departments & Policies · ISMS Portal" },
      { name: "description", content: "Manage sub-organizations, departments and user policies." },
    ],
  }),
  component: Structure,
});

const KINDS = ["Department", "Subsidiary", "Division", "Branch"];
const SCOPE_ROLES = ["member", "manager", "sub_admin"];
const SCOPE_LABELS: Record<string, string> = {
  member: "Member",
  manager: "Manager",
  sub_admin: "Sub-admin",
};

interface ScopeRole {
  id: string;
  user_id: string;
  sub_organization_id: string;
  role: string;
}

function Structure() {
  const auth = useAuth();
  const qc = useQueryClient();
  const orgId = auth.organization?.id;
  const [name, setName] = useState("");
  const [kind, setKind] = useState("Department");
  const [parent, setParent] = useState("none");
  const [grant, setGrant] = useState({ user: "", sub: "", role: "manager" });

  const { data } = useQuery({
    queryKey: ["structure", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [subs, profiles, scopes] = await Promise.all([
        supabase.from("sub_organizations").select("*").eq("organization_id", orgId!).order("name"),
        supabase.from("profiles").select("*").eq("organization_id", orgId!).order("name"),
        supabase.from("user_scope_roles").select("*").eq("organization_id", orgId!),
      ]);
      return {
        subs: (subs.data ?? []) as SubOrganization[],
        profiles: (profiles.data ?? []) as Profile[],
        scopes: (scopes.data ?? []) as ScopeRole[],
      };
    },
  });
  const subs = data?.subs ?? [];
  const profiles = data?.profiles ?? [];
  const scopes = data?.scopes ?? [];
  const subName = (id?: string | null) => subs.find((s) => s.id === id)?.name ?? "—";
  const refresh = () => void qc.invalidateQueries({ queryKey: ["structure"] });
  const run = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) toast.error(error.message);
    else {
      toast.success(ok);
      refresh();
    }
  };

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    await run(
      supabase.from("sub_organizations").insert({
        organization_id: orgId,
        name: name.trim(),
        kind,
        parent_id: parent === "none" ? null : parent,
      }),
      "Sub-organization created",
    );
    setName("");
  };

  const renderTree = (parentId: string | null, depth: number): React.ReactNode =>
    subs
      .filter((s) => s.parent_id === parentId)
      .map((s) => (
        <div key={s.id}>
          <div
            className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
            style={{ paddingLeft: 8 + depth * 20 }}
          >
            <span className="flex items-center gap-2">
              {depth > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
              <Building className="size-4 text-primary" />
              <span className="font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.kind}</span>
              <span className="text-xs text-muted-foreground">
                · {profiles.filter((p) => p.sub_organization_id === s.id).length} users
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={auth.readOnly}
              onClick={() =>
                run(supabase.from("sub_organizations").delete().eq("id", s.id), "Removed")
              }
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
          {renderTree(s.id, depth + 1)}
        </div>
      ));

  return (
    <>
      <PageHeader
        title="Departments & Policies"
        description="Build your company structure, set each user's home department and policy, and grant extra department roles."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-medium">Organization structure</h2>
          <form onSubmit={addSub} className="mt-3 space-y-2">
            <Input
              placeholder="e.g. Finance, ABC Sdn Bhd"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={parent} onValueChange={setParent}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Parent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Top level ({auth.organization?.name})</SelectItem>
                  {subs.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      Under {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" size="icon" disabled={auth.readOnly}>
                <Plus className="size-4" />
              </Button>
            </div>
          </form>
          <div className="mt-4 border-t pt-3">
            <p className="mb-1 px-2 text-xs font-semibold uppercase text-muted-foreground">
              {auth.organization?.name}
            </p>
            {subs.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No departments yet.</p>
            ) : (
              renderTree(null, 0)
            )}
          </div>
        </div>

        <div className="panel overflow-hidden lg:col-span-3">
          <div className="p-5 pb-2">
            <h2 className="text-sm font-medium">User policies</h2>
            <p className="text-xs text-muted-foreground">
              Submitted risks lock for the submitter until an approver approves or returns them.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Home department</TableHead>
                <TableHead>Policy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{p.name || p.email}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.sub_organization_id ?? "none"}
                      disabled={auth.readOnly}
                      onValueChange={(v) =>
                        run(
                          supabase
                            .from("profiles")
                            .update({ sub_organization_id: v === "none" ? null : v })
                            .eq("id", p.id),
                          "Department updated",
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Company-wide</SelectItem>
                        {subs.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.policy_level ?? "submit"}
                      disabled={auth.readOnly || p.id === auth.user?.id}
                      onValueChange={(v) =>
                        run(
                          supabase.from("profiles").update({ policy_level: v }).eq("id", p.id),
                          "Policy updated",
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POLICY_LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {POLICY_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="panel mt-6 p-5">
        <h2 className="text-sm font-medium">Extra department roles</h2>
        <p className="text-xs text-muted-foreground">
          By default users only work in their home department. Grant access to another one here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={grant.user} onValueChange={(v) => setGrant({ ...grant, user: v })}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={grant.sub} onValueChange={(v) => setGrant({ ...grant, sub: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {subs.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={grant.role} onValueChange={(v) => setGrant({ ...grant, role: v })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {SCOPE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={auth.readOnly || !grant.user || !grant.sub}
            onClick={() =>
              run(
                supabase.from("user_scope_roles").upsert(
                  {
                    organization_id: orgId!,
                    user_id: grant.user,
                    sub_organization_id: grant.sub,
                    role: grant.role,
                  },
                  { onConflict: "user_id,sub_organization_id" },
                ),
                "Role granted",
              )
            }
          >
            Grant role
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {scopes.map((s) => (
            <span
              key={s.id}
              className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1 text-xs"
            >
              {profiles.find((p) => p.id === s.user_id)?.name || "User"} ·{" "}
              {SCOPE_LABELS[s.role] ?? s.role} of {subName(s.sub_organization_id)}
              <button
                onClick={() =>
                  run(supabase.from("user_scope_roles").delete().eq("id", s.id), "Role removed")
                }
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {scopes.length === 0 && (
            <p className="text-sm text-muted-foreground">No extra roles granted.</p>
          )}
        </div>
      </div>
    </>
  );
}
