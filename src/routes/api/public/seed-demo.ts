import { createFileRoute } from "@tanstack/react-router";

/**
 * One-time demo seeding. Creates only the four fixed demo accounts that already
 * have an invite row; it never creates arbitrary users and is idempotent.
 */
const DEMO = [
  { email: "owner@saas.com", name: "System Owner" },
  { email: "admin@org1.com", name: "Org 1 Admin" },
  { email: "testemailorg1@org1.com", name: "Org 1 Analyst" },
  { email: "admin@org2.com", name: "Org 2 Admin" },
];

const DEMO_PASSWORD = "Password123!";

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: Record<string, string> = {};

        for (const demo of DEMO) {
          const { data: invite } = await supabaseAdmin
            .from("invites")
            .select("organization_id, role")
            .eq("email", demo.email)
            .maybeSingle();
          if (!invite) {
            results[demo.email] = "no invite";
            continue;
          }

          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("email", demo.email)
            .maybeSingle();
          if (existingProfile) {
            results[demo.email] = "exists";
            continue;
          }

          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: demo.email,
            password: DEMO_PASSWORD,
            email_confirm: true,
            user_metadata: { name: demo.name },
          });
          if (error || !created.user) {
            results[demo.email] = `error: ${error?.message}`;
            continue;
          }

          await supabaseAdmin.from("profiles").insert({
            id: created.user.id,
            organization_id: invite.organization_id,
            name: demo.name,
            email: demo.email,
          });
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: created.user.id, role: invite.role });
          results[demo.email] = "created";
        }

        return new Response(JSON.stringify(results), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
