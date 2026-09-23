import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertOctagon, Activity, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { RISK_DOMAINS, RISK_STATUSES, type Control, type Risk } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  Open: "var(--chart-4)",
  "In-Progress": "var(--chart-3)",
  Resolved: "var(--chart-5)",
  Monitor: "var(--chart-2)",
};

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4" style={{ color: tone }} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Dashboard() {
  const auth = useAuth();
  const orgId = auth.organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", orgId],
    queryFn: async () => {
      const [risksRes, controlsRes] = await Promise.all([
        supabase.from("risks").select("*"),
        supabase.from("controls").select("*"),
      ]);
      return {
        risks: (risksRes.data ?? []) as Risk[],
        controls: (controlsRes.data ?? []) as Control[],
      };
    },
  });

  const risks = data?.risks ?? [];
  const controls = data?.controls ?? [];
  const active = risks.filter((r) => r.status !== "Resolved");
  const critical = risks.filter((r) => r.severity === "Critical" && r.status !== "Resolved");
  const implemented = controls.filter((c) => c.status === "Implemented");

  const byDomain = RISK_DOMAINS.map((domain) => ({
    domain,
    risks: risks.filter((r) => r.domain === domain).length,
  }));
  const byStatus = RISK_STATUSES.map((status) => ({
    name: status,
    value: risks.filter((r) => r.status === status).length,
  })).filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          auth.organization
            ? `${auth.organization.name} · ${auth.organization.tier} tier · ${auth.organization.subscription_status}`
            : "Organization overview"
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total active risks" value={active.length} icon={Activity} tone="var(--chart-1)" />
        <Kpi
          label="Critical risks"
          value={critical.length}
          icon={AlertOctagon}
          tone="var(--chart-4)"
        />
        <Kpi
          label="Controls implemented"
          value={`${implemented.length}/${controls.length}`}
          icon={ShieldCheck}
          tone="var(--chart-5)"
        />
        <Kpi
          label="Resolved risks"
          value={risks.filter((r) => r.status === "Resolved").length}
          icon={CheckCircle2}
          tone="var(--chart-2)"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <div className="panel p-5 lg:col-span-3">
          <h2 className="text-sm font-medium">Risks by domain</h2>
          <div className="mt-4 h-72">
            {isLoading ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDomain}>
                  <XAxis dataKey="domain" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="risks" radius={[6, 6, 0, 0]} fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-medium">Mitigation status</h2>
          <div className="mt-4 h-72">
            {isLoading || byStatus.length === 0 ? (
              <p className="pt-24 text-center text-sm text-muted-foreground">No risks logged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95}>
                    {byStatus.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="panel mt-6 p-5">
        <h2 className="text-sm font-medium">Recently logged risks</h2>
        <div className="mt-3 divide-y">
          {risks.slice(0, 5).map((risk) => (
            <div key={risk.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{risk.title}</p>
                <p className="text-xs text-muted-foreground">
                  {risk.domain} · owner {risk.owner || "unassigned"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{risk.status}</span>
            </div>
          ))}
          {risks.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </div>
      </div>
    </>
  );
}
