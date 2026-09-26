import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY one-off: restores demo account passwords. Deleted after use.
const TOKEN = "rst-8f3k2q9x7m1v";
const EMAILS = ["owner@saas.com", "admin@org1.com", "testemailorg1@org1.com", "admin@org2.com"];

export const Route = createFileRoute("/api/public/restore-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-token") !== TOKEN) return new Response("no", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .in("email", EMAILS);
        const out: string[] = [];
        for (const p of profiles ?? []) {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(p.id, {
            password: "Qv7m-Zrt4-Ax91-Pkd2",
          });
          out.push(`${p.email}: ${error ? error.message : "ok"}`);
        }
        return new Response(out.join("\n"));
      },
    },
  },
});
