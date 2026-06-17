# Project: UTM Builder

## Goal
A clean web app to build, copy, and track UTM-tagged URLs. Users enter a base URL
plus UTM parameters, get the assembled URL, and save it to a spreadsheet-style
table to keep a running record of all campaign URLs.

## Core features
1. Builder form: base URL, utm_source, utm_medium, utm_campaign (required),
   utm_term, utm_content (optional).
2. Live assembled URL output with a copy button.
3. Save button adds the URL and its fields as a row to a tracking table.
4. Spreadsheet-style table: sortable, searchable, inline-editable cells,
   copy and delete per row, plus a label/notes column.

## URL assembly rules (must be correct)
- Encode all values with encodeURIComponent.
- If the base URL already has a query string, append with & not ?.
- Preserve any #fragment and keep UTMs before the fragment.
- Trim whitespace; lowercase utm_source and utm_medium by default, with a toggle to keep case.
- Validate the base is a real http(s) URL before building.

## Consistency features
- Source and medium fields autocomplete from previously saved values.
- Common presets: google/cpc, facebook/paid_social, newsletter/email, etc.
- Warn if a new entry's casing or naming differs from existing saved values.

## Stack
Next.js App Router, Tailwind. Deploy on Vercel.
v1 persistence: localStorage, no auth.
v2 persistence: Supabase + Clerk auth.

## Rules
- Mobile-friendly. Builder is the hero; table below or on a second tab.
- Keep dependencies light. Custom editable table, no heavy grid libs.
- One-click copy everywhere. Confirm before delete; warn before clearing all.
