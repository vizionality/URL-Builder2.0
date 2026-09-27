// Pure helpers for client slugs (the /c/<slug>/ part of client URLs). Unit-tested.

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return s || "client";
}

// A slug not in `taken`: "acme", then "acme-2", "acme-3", ...
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(`${base}-${i}`)) return `${base}-${i}`;
}

export function isSlug(v: string | null | undefined): v is string {
  return typeof v === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) && v.length <= 48;
}

// The client and the rest of the path from a /c/<slug>/... pathname.
export function splitClientPath(pathname: string): { slug: string | null; rest: string } {
  const m = pathname.match(/^\/c\/([^/]+)(\/.*)?$/);
  if (!m || !isSlug(m[1])) return { slug: null, rest: pathname };
  return { slug: m[1], rest: m[2] ?? "/" };
}
