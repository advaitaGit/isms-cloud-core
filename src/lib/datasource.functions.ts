import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$|\[?f[cd])/i;

/** Normalise Google Sheets / OneDrive / SharePoint share links into direct CSV/file downloads. */
function toDirectUrl(kind: string, raw: string) {
  const u = new URL(raw);
  if (kind === "google" || u.hostname === "docs.google.com") {
    const id = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/)?.[1];
    if (!id) throw new Error("That doesn't look like a Google Sheets link");
    const gid = u.hash.match(/gid=(\d+)/)?.[1] ?? u.searchParams.get("gid") ?? "0";
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
  }
  if (kind === "microsoft" && !u.searchParams.has("download")) u.searchParams.set("download", "1");
  return u.toString();
}

export const fetchRemoteData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["google", "microsoft", "api", "server"]),
        url: z.string().url().max(2000),
        headerName: z.string().max(100).optional(),
        headerValue: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const target = toDirectUrl(data.kind, data.url);
    const u = new URL(target);
    if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only http(s) links are supported");
    if (PRIVATE_HOST.test(u.hostname))
      throw new Error(
        "Private/local network addresses can't be reached from the cloud. Expose the server on a public IP or domain.",
      );
    const headers: Record<string, string> = { Accept: "application/json, text/csv, */*" };
    if (data.headerName && data.headerValue) headers[data.headerName] = data.headerValue;
    const res = await fetch(target, { headers, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    if (!res.ok) throw new Error(`Source responded ${res.status}: ${text.slice(0, 200)}`);
    if (text.length > 5_000_000) throw new Error("Data is larger than 5 MB");
    const type = res.headers.get("content-type") ?? "";
    if (/<html/i.test(text.slice(0, 500)))
      throw new Error("The link returned a web page, not data. Make sure the file/sheet is shared publicly ('anyone with the link').");
    return { text, format: type.includes("json") || /^\s*[[{]/.test(text) ? "json" : "csv" } as const;
  });
