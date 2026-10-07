import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapProfile } from "@/lib/admin.functions";
import { logAuthEvent } from "@/lib/audit";
import type { AppRole, Organization, Profile } from "@/lib/types";

interface AuthValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  roles: AppRole[];
  role: AppRole | null;
  isSystemOwner: boolean;
  isOrgAdmin: boolean;
  canViewLogs: boolean;
  readOnly: boolean;
  policy: string;
  canApprove: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setProfile(null);
      setOrganization(null);
      setRoles([]);
      setLoading(false);
      return;
    }
    const userId = activeSession.user.id;
    let { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profileRow) {
      try {
        await bootstrapProfile();
      } catch (error) {
        console.error("bootstrapProfile failed", error);
      }
      const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      profileRow = retry.data;
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    let org: Organization | null = null;
    if (profileRow?.organization_id) {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profileRow.organization_id)
        .maybeSingle();
      org = (data as Organization) ?? null;
    }

    setProfile((profileRow as Profile) ?? null);
    setOrganization(org);
    setRoles(((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role));
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setOrganization(null);
        setRoles([]);
        setLoading(false);
        return;
      }
      setTimeout(() => void load(nextSession), 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void load(data.session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  const signOut = useCallback(async () => {
    await logAuthEvent("auth.logout");
    await supabase.auth.signOut();
  }, []);

  const isSystemOwner = roles.includes("system_owner");
  const isOrgAdmin = roles.includes("org_admin");
  const value: AuthValue = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    organization,
    roles,
    role: roles[0] ?? null,
    isSystemOwner,
    isOrgAdmin,
    canViewLogs: isSystemOwner || isOrgAdmin || roles.includes("manager"),
    policy: profile?.policy_level ?? "submit",
    canApprove: isSystemOwner || isOrgAdmin || profile?.policy_level === "approve",
    readOnly: !isSystemOwner && organization?.subscription_status !== "Active",
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
