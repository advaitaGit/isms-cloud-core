import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, CircleDollarSign, ListChecks, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { globalMetrics } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/global")({
  component: GlobalDashboard,
});

function GlobalDashboard() {
  const auth = useAuth();
  const { data, isLoading } = useQuery({
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

  const cards = [
    { label: "Organizations", value: data?.totalOrgs ?? 0, icon: Building2 },
    { label: "MRR", value: `$${(data?.mrr ?? 0).toLocaleString()}`, icon: CircleDollarSign },
    { label: "Active users", value: data?.totalUsers ?? 0, icon: Users },
    { label: "Risks tracked", value: data?.totalRisks ?? 0, icon: ListChecks },
  ];

  const seatChart = (data?.organizations ?? []).map((o) => ({
    name: o.name,
    seats: o.seats,
    used: data?.seatUsage[o.id] ?? 0,
  }));

  return (
    <>
      <PageHeader title="Global Dashboard" description="SaaS-wide metrics across every tenant." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <c.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-medium">Seat utilisation by organization</h2>
          <div className="mt-4 h-72">
            {!isLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seatChart}>
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="seats" radius={[6, 6, 0, 0]} fill="var(--chart-2)" name="Seats" />
                  <Bar dataKey="used" radius={[6, 6, 0, 0]} fill="var(--chart-1)" name="Used" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-medium">Subscription mix</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active</dt>
              <dd className="font-medium">{data?.activeOrgs ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Trial</dt>
              <dd className="font-medium">{data?.trialOrgs ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unsubscribed</dt>
              <dd className="font-medium">
                {(data?.totalOrgs ?? 0) - (data?.activeOrgs ?? 0) - (data?.trialOrgs ?? 0)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
