import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { RISK_SEVERITIES, RISK_STATUSES, type Risk } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/risks/")({
  component: RiskRegister,
});

const SEVERITY_STYLES: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-info/15 text-info",
  High: "bg-warning/20 text-warning",
  Critical: "bg-destructive/15 text-destructive",
};

function RiskRegister() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const { data: risks = [], isLoading } = useQuery({
    queryKey: ["risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("risks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Risk[];
    },
  });

  const filtered = risks.filter(
    (r) =>
      (severity === "all" || r.severity === severity) &&
      (status === "all" || r.status === status) &&
      (r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.owner.toLowerCase().includes(search.toLowerCase())),
  );

  const updateStatus = async (risk: Risk, next: string) => {
    const { error } = await supabase.from("risks").update({ status: next }).eq("id", risk.id);
    if (error) return toast.error(error.message);
    toast.success("Risk updated");
    void queryClient.invalidateQueries({ queryKey: ["risks"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const remove = async (risk: Risk) => {
    const { error } = await supabase.from("risks").delete().eq("id", risk.id);
    if (error) return toast.error(error.message);
    toast.success("Risk deleted");
    void queryClient.invalidateQueries({ queryKey: ["risks"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <>
      <PageHeader
        title="Risk Register"
        description="All information security risks recorded for your organization."
        action={
          !auth.readOnly ? (
            <Button asChild>
              <Link to="/risks/new">Log a Risk</Link>
            </Button>
          ) : (
            <Button disabled>Log a Risk</Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search title or owner…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {RISK_SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {RISK_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Risk</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="w-44">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell>
                  <p className="font-medium">{risk.title}</p>
                  {risk.description && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">
                      {risk.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{risk.domain}</TableCell>
                <TableCell>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[risk.severity]}`}
                  >
                    {risk.severity}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{risk.owner || "—"}</TableCell>
                <TableCell>
                  <Select
                    value={risk.status}
                    onValueChange={(v) => updateStatus(risk, v)}
                    disabled={auth.readOnly}
                  >
                    <SelectTrigger className="h-8">
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
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={auth.readOnly}
                    onClick={() => remove(risk)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No risks match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
