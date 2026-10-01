import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  Globe2,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: (a: ReturnType<typeof useAuth>) => boolean;
}

const NAV: NavItem[] = [
  { to: "/global", label: "Global Dashboard", icon: Globe2, show: (a) => a.isSystemOwner },
  {
    to: "/organizations",
    label: "Organizations",
    icon: Building2,
    show: (a) => a.isSystemOwner,
  },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { to: "/risks", label: "Risk Register", icon: ListChecks, show: () => true },
  { to: "/risks/new", label: "Log a Risk", icon: PlusCircle, show: (a) => !a.readOnly },
  { to: "/controls", label: "Annex A Controls", icon: ShieldCheck, show: () => true },
  {
    to: "/users",
    label: "User Management",
    icon: Users,
    show: (a) => a.isOrgAdmin || a.isSystemOwner,
  },
  { to: "/logs", label: "Activity Log", icon: History, show: (a) => a.canViewLogs },
];

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">ISMS Portal</p>
            <p className="text-[11px] text-sidebar-foreground/60">Risk &amp; Compliance</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.filter((item) => item.show(auth)).map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4 text-xs">
          <p className="truncate font-medium">{auth.profile?.name || auth.profile?.email}</p>
          <p className="text-sidebar-foreground/60">
            {auth.role ? ROLE_LABELS[auth.role] : "—"}
            {auth.organization ? ` · ${auth.organization.name}` : ""}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="mt-3 w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {auth.readOnly && auth.organization && (
          <div className="flex items-start gap-3 border-b border-warning/40 bg-warning/15 px-6 py-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              <span className="font-semibold">Read-only mode.</span> This account is{" "}
              {auth.organization.subscription_status === "Trial" ? "on a trial" : "unsubscribed"} and
              is for sample viewing only.
            </p>
          </div>
        )}
        <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
