import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
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
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type AppRole, type Profile } from "@/lib/types";
import {
  createOrgUser,
  deleteOrgUser,
  resetUserPassword,
  setUserRole,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/users")({
  component: UserManagement,
});

function UserManagement() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "standard" as AppRole });

  const { data } = useQuery({
    queryKey: ["org-users", auth.organization?.id],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, AppRole>();
      (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role as AppRole));
      return { profiles: profiles as Profile[], roleMap };
    },
  });

  const profiles = data?.profiles ?? [];
  const seats = auth.organization?.seats ?? 0;
  const seatsUsed = profiles.filter((p) => p.organization_id === auth.organization?.id).length;
  const seatsFull = seatsUsed >= seats;

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createOrgUser({ data: form });
      toast.success(`User created. Temporary password: ${res.tempPassword}`, { duration: 15000 });
      setOpen(false);
      setForm({ name: "", email: "", role: "standard" });
      void queryClient.invalidateQueries({ queryKey: ["org-users"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, role: AppRole) => {
    try {
      await setUserRole({ data: { userId, role } });
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: ["org-users"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update role");
    }
  };

  const resetPassword = async (userId: string) => {
    try {
      const res = await resetUserPassword({ data: { userId } });
      toast.success(`New temporary password: ${res.tempPassword}`, { duration: 15000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password");
    }
  };

  const removeUser = async (userId: string) => {
    try {
      await deleteOrgUser({ data: { userId } });
      toast.success("User removed");
      void queryClient.invalidateQueries({ queryKey: ["org-users"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove user");
    }
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description={`${seatsUsed} of ${seats} seats used${auth.organization ? ` · ${auth.organization.name}` : ""}`}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={auth.readOnly || seatsFull}>Add user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a user</DialogTitle>
                <DialogDescription>
                  They receive a temporary password you can share with them.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={addUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as AppRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create user"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {seatsFull && !auth.readOnly && (
        <div className="panel mb-4 border-warning/40 bg-warning/10 p-4 text-sm">
          Seat limit reached ({seats} seats). Remove a user or upgrade your plan to add more.
        </div>
      )}

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">Role</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Select
                    value={data?.roleMap.get(p.id) ?? "standard"}
                    onValueChange={(v) => changeRole(p.id, v as AppRole)}
                    disabled={auth.readOnly || p.id === auth.user?.id}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reset password"
                    disabled={auth.readOnly}
                    onClick={() => resetPassword(p.id)}
                  >
                    <KeyRound className="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Remove user"
                    disabled={auth.readOnly || p.id === auth.user?.id}
                    onClick={() => removeUser(p.id)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
