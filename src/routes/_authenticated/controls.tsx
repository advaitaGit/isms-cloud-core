import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { CONTROL_STATUSES, type Control } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/controls")({
  component: Controls,
});

function Controls() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [ref, setRef] = useState("");
  const [name, setName] = useState("");

  const { data: controls = [] } = useQuery({
    queryKey: ["controls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("controls")
        .select("*")
        .order("control_ref", { ascending: true });
      if (error) throw error;
      return data as Control[];
    },
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.organization) return;
    const { error } = await supabase.from("controls").insert({
      organization_id: auth.organization.id,
      control_ref: ref,
      control_name: name,
    });
    if (error) return toast.error(error.message);
    setRef("");
    setName("");
    toast.success("Control added");
    void queryClient.invalidateQueries({ queryKey: ["controls"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const setStatus = async (control: Control, status: string) => {
    const { error } = await supabase.from("controls").update({ status }).eq("id", control.id);
    if (error) return toast.error(error.message);
    void queryClient.invalidateQueries({ queryKey: ["controls"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <>
      <PageHeader
        title="Annex A Controls"
        description="ISO 27001 Annex A control implementation status for your organization."
      />

      {!auth.readOnly && (
        <form onSubmit={add} className="panel mb-4 flex flex-wrap items-end gap-3 p-4">
          <Input
            placeholder="A.5.1"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="w-28"
            required
          />
          <Input
            placeholder="Control name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-md flex-1"
            required
          />
          <Button type="submit">Add control</Button>
        </form>
      )}

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28">Reference</TableHead>
              <TableHead>Control</TableHead>
              <TableHead className="w-52">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.map((control) => (
              <TableRow key={control.id}>
                <TableCell className="font-mono text-xs">{control.control_ref}</TableCell>
                <TableCell className="font-medium">{control.control_name}</TableCell>
                <TableCell>
                  <Select
                    value={control.status}
                    onValueChange={(v) => setStatus(control, v)}
                    disabled={auth.readOnly}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTROL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {controls.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  No controls recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
