import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Building2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sentinel ISMS — Multi-Tenant Risk Portal" },
      {
        name: "description",
        content:
          "Run ISO 27001 risk registers, Annex A controls and multi-tenant access control in one enterprise portal.",
      },
      { property: "og:title", content: "Sentinel ISMS — Multi-Tenant Risk Portal" },
      {
        property: "og:description",
        content:
          "Run ISO 27001 risk registers, Annex A controls and multi-tenant access control in one enterprise portal.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Risk register",
    body: "Log, triage and track information security risks by domain, severity and status.",
  },
  {
    icon: BarChart3,
    title: "Live dashboards",
    body: "Risk-by-domain and mitigation charts update the moment your register changes.",
  },
  {
    icon: Users,
    title: "Role-based access",
    body: "Org Admins manage their own people; Managers, Auditors and Standard users stay scoped.",
  },
  {
    icon: Building2,
    title: "Multi-tenant by design",
    body: "Every record is isolated per organization, with seat limits and subscription states.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="font-semibold">Sentinel ISMS</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          ISO 27001 · Annex A · Multi-tenant
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          The risk portal your security programme runs on
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          One workspace for every organization you serve: isolated risk registers, Annex A control
          status, seat-aware user management and subscription controls.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create an account
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel p-6">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-3 font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
