import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Creates the caller's profile + role on first sign-in, using the invites table. */
export const bootstrapProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (existing) return { created: false };

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = authUser.user?.email ?? "";
    const meta = (authUser.user?.user_metadata ?? {}) as { name?: string };

    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("organization_id, role")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let organizationId = invite?.organization_id ?? null;
    let role = invite?.role ?? "org_admin";

    if (!invite) {
      // Brand-new self sign-up: give them their own trial organization.
      const { data: org, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: meta.name ? `${meta.name}'s Organization` : email.split("@")[1] || "New Organization",
          subscription_status: "Trial",
          tier: "Basic",
          seats: 5,
          monthly_price: 0,
        })
        .select("id")
        .single();
      if (orgError) throw new Error(orgError.message);
      organizationId = org.id;
      role = "org_admin";
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      organization_id: organizationId,
      name: meta.name ?? email.split("@")[0] ?? "",
      email,
    });
    if (profileError) throw new Error(profileError.message);

    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    return { created: true };
  });

async function assertCanManage(context: { userId: string; supabase: any }) {
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const list: string[] = (roles ?? []).map((r: { role: string }) => r.role);
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", context.userId)
    .maybeSingle();
  const isOwner = list.includes("system_owner");
  if (!isOwner && !list.includes("org_admin")) throw new Error("Forbidden");
  return { isOwner, organizationId: profile?.organization_id as string | null };
}

export const createOrgUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; name: string; role: string; organizationId?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { isOwner, organizationId } = await assertCanManage(context);
    const targetOrg = isOwner ? (data.organizationId ?? organizationId) : organizationId;
    if (!targetOrg) throw new Error("No organization selected");
    if (data.role === "system_owner" && !isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("seats, subscription_status")
      .eq("id", targetOrg)
      .single();
    if (!org) throw new Error("Organization not found");
    if (!isOwner && org.subscription_status !== "Active") {
      throw new Error("This account is read-only. Subscribe to add users.");
    }
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", targetOrg);
    if ((count ?? 0) >= org.seats) {
      throw new Error(`Seat limit reached (${org.seats} seats). Upgrade to add more users.`);
    }

    const tempPassword = `Isms-${crypto.randomUUID().slice(0, 12)}!`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("invites").upsert({
      email: data.email.toLowerCase(),
      organization_id: targetOrg,
      role: data.role,
    });
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      organization_id: targetOrg,
      name: data.name,
      email: data.email.toLowerCase(),
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(pErr.message);
    }
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    return { userId: created.user.id, tempPassword };
  });

export const deleteOrgUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { isOwner, organizationId } = await assertCanManage(context);
    if (data.userId === context.userId) throw new Error("You cannot remove yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (!isOwner && target.organization_id !== organizationId) throw new Error("Forbidden");
    await supabaseAdmin.from("invites").delete().eq("email", target.email);
    await supabaseAdmin.auth.admin.deleteUser(data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: string }) => input)
  .handler(async ({ data, context }) => {
    const { isOwner, organizationId } = await assertCanManage(context);
    if (data.role === "system_owner" && !isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("organization_id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (!isOwner && target.organization_id !== organizationId) throw new Error("Forbidden");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    await supabaseAdmin
      .from("invites")
      .upsert({ email: target.email, organization_id: target.organization_id, role: data.role });
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { isOwner, organizationId } = await assertCanManage(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (!isOwner && target.organization_id !== organizationId) throw new Error("Forbidden");
    const tempPassword = `Isms-${crypto.randomUUID().slice(0, 12)}!`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: tempPassword,
    });
    if (error) throw new Error(error.message);
    return { tempPassword };
  });

/** System Owner only: SaaS-wide metrics across every organization. */
export const globalMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "system_owner",
    });
    if (!isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id, name, subscription_status, tier, seats, monthly_price, created_at")
      .order("created_at", { ascending: true });
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, organization_id");
    const { count: riskCount } = await supabaseAdmin
      .from("risks")
      .select("id", { count: "exact", head: true });
    const list = orgs ?? [];
    return {
      organizations: list,
      seatUsage: (profiles ?? []).reduce<Record<string, number>>((acc, p) => {
        if (p.organization_id) acc[p.organization_id] = (acc[p.organization_id] ?? 0) + 1;
        return acc;
      }, {}),
      totalOrgs: list.length,
      activeOrgs: list.filter((o) => o.subscription_status === "Active").length,
      trialOrgs: list.filter((o) => o.subscription_status === "Trial").length,
      mrr: list
        .filter((o) => o.subscription_status === "Active")
        .reduce((sum, o) => sum + Number(o.monthly_price ?? 0), 0),
      totalUsers: (profiles ?? []).length,
      totalRisks: riskCount ?? 0,
    };
  });

/** System Owner only: create a new organization. */
export const createOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      name: string;
      subscription_status: string;
      tier: string;
      seats: number;
      monthly_price: number;
      adminEmail?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "system_owner",
    });
    if (!isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        subscription_status: data.subscription_status,
        tier: data.tier,
        seats: data.seats,
        monthly_price: data.monthly_price,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (data.adminEmail) {
      await supabaseAdmin.from("invites").upsert({
        email: data.adminEmail.toLowerCase(),
        organization_id: org.id,
        role: "org_admin",
      });
    }
    return { id: org.id };
  });

/** System Owner only: update subscription / tier / seats. */
export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      subscription_status?: string;
      tier?: string;
      seats?: number;
      monthly_price?: number;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "system_owner",
    });
    if (!isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("organizations").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** System Owner only: reset the password of any org admin. */
export const resetOrgAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "system_owner",
    });
    if (!isOwner) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("organization_id", data.organizationId);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "org_admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    const admin = (profiles ?? []).find((p) => adminIds.has(p.id));
    if (!admin) throw new Error("This organization has no admin yet");
    const tempPassword = `Isms-${crypto.randomUUID().slice(0, 12)}!`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(admin.id, {
      password: tempPassword,
    });
    if (error) throw new Error(error.message);
    return { email: admin.email, tempPassword };
  });
