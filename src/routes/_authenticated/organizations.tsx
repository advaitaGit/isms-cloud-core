import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
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
import { SUBSCRIPTION_STATUSES, TIERS } from "@/lib/types";
import {
  createOrganization,
  globalMetrics,
  resetOrgAdminPassword,
  updateOrganization,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/organizations")({
  component: Organizations,
});

function Organizations() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subscription_status: "Trial",
    tier: "Basic",
    seats: 10,
    monthly_price: 0,
    adminEmail: "",
  });

  const { data } = useQuery({
    queryKey: ["global-metrics"],
    queryFn: () => globalMetrics(),
    enabled: auth.isSystemOwner,
  });

  if (!auth.isSystemOwner) {
    return (
      <div className="panel p-8 text-sm text-muted-foreground">
        This page is available to System Owners only.
      </div>
    );
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["global-metrics"] });

  const patch = async (id: string, changes: Record<string, unknown>) => {
    try {
      await updateOrganization({ data: { id, ...changes } });
      toast.success("Organization updated");
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createOrganization({ data: form });
      toast.success("Organization created");
      setOpen(false);
      setForm({
        name: "",
        subscription_status: "Trial",
        tier: "Basic",
        seats: 10,
        monthly_price: 0,
        adminEmail: "",
      });
      void refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create organization");
    } finally {
      setBusy(false);
    }
  };

  const resetAdmin = async (organizationId: string) => {
    try {
      const res = await resetOrgAdminPassword({ data: { organizationId } });
      toast.success(`New password for ${res.email}: ${res.tempPassword}`, { duration: 15000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password");
    }
  };

  return (
    <>
      <PageHeader
        title="Organization Management"
        description="Create tenants, change subscriptions and manage seat limits."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>New organization</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create organization</DialogTitle>
                <DialogDescription>
                  The admin email you enter can sign up and will be attached to this tenant.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Subscription</Label>
                    <Select
                      value={form.subscription_status}
                      onValueChange={(v) => setForm({ ...form, subscription_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBSCRIPTION_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select
                      value={form.tier}
                      onValueChange={(v) => setForm({ ...form, tier: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seats">Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      min={1}
                      value={form.seats}
                      onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Monthly price (USD)</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={form.monthly_price}
                      onChange={(e) => setForm({ ...form, monthly_price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Org admin email (optional)</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>
                    {busy ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="w-44">Subscription</TableHead>
              <TableHead className="w-40">Tier</TableHead>
              <TableHead className="w-32">Seats</TableHead>
              <TableHead className="w-28">Used</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.organizations ?? []).map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <Select
                    value={org.subscription_status}
                    onValueChange={(v) => patch(org.id, { subscription_status: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={org.tier} onValueChange={(v) => patch(org.id, { tier: v })}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    defaultValue={org.seats}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const seats = Number(e.target.value);
                      if (seats && seats !== org.seats) void patch(org.id, { seats });
                    }}
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {data?.seatUsage[org.id] ?? 0}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Reset org admin password"
                    onClick={() => resetAdmin(org.id)}
                  >
                    <KeyRound className="size-4 text-muted-foreground" />
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
