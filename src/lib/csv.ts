export function toCsv(rows: Record<string, unknown>[], headers?: string[]) {
  const cols = headers ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function downloadFile(name: string, content: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(name: string, rows: Record<string, unknown>[], headers?: string[]) {
  downloadFile(name.endsWith(".csv") ? name : `${name}.csv`, toCsv(rows, headers));
}

/** Minimal RFC4180 parser. */
export function parseCsv(text: string): Record<string, string>[] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (cur += '"'), i++;
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") row.push(cur), (cur = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      out.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) row.push(cur), out.push(row);
  const [head, ...body] = out.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}
