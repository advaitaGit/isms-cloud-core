import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Sentinel ISMS" },
      { name: "description", content: "Sign in to your Sentinel ISMS risk portal workspace." },
      { property: "og:title", content: "Sign in — Sentinel ISMS" },
      {
        property: "og:description",
        content: "Sign in to your Sentinel ISMS risk portal workspace.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => {
    const mode = search["mode"];
    return mode === "signup" || mode === "signin" || mode === "forgot" ? { mode } : {};
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (auth.session) navigate({ to: "/dashboard", replace: true });
  }, [auth.session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await logAuthEvent("auth.login");
        navigate({ to: "/dashboard", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { name } },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Check your email to confirm your account.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <span className="font-semibold">Sentinel ISMS</span>
        </Link>
        <div>
          <h2 className="max-w-sm text-3xl font-semibold leading-tight">
            Every organization, strictly isolated.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-sidebar-foreground/70">
            Risk registers, Annex A controls and user management scoped to your tenant by
            row-level security.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">ISO 27001 aligned · SOC 2 ready</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "forgot"
                ? "We'll email you a secure reset link."
                : "Use your work email address."}
            </p>
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
                <p>
                  No account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
