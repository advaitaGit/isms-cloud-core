import { supabase } from "@/integrations/supabase/client";

export type AuthAuditAction = "auth.login" | "auth.logout" | "auth.password_change";

/** Records a sign-in / sign-out / password change for the current user. Never throws. */
export async function logAuthEvent(action: AuthAuditAction) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, email")
      .eq("id", user.id)
      .maybeSingle();
    await (supabase as any).from("audit_logs").insert({
      organization_id: profile?.organization_id ?? null,
      actor_id: user.id,
      actor_email: profile?.email ?? user.email ?? "",
      action,
      entity_type: "auth",
      entity_id: user.id,
      summary: user.email ?? "",
      details: { user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "" },
    });
  } catch (error) {
    console.error("audit log failed", error);
  }
}
