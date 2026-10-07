# Enhancement plan (built in 5 phases)

The request covers ~10 large features. Building them in phases keeps each one testable. Each phase ends with a working app.

## Phase 1 — Sub-organizations, policies and approvals
- Org Admin can create sub-organizations (departments, subsidiaries like "Sdn Bhd") in a tree under the company.
- Users belong to one home sub-org by default; only Admin can grant them roles on additional sub-orgs (e.g. "Manager of Sub-org 2").
- Sub-admins per department, scoped to that department only.
- Policy levels per user: View, Edit, Submit, Approve.
- Risk workflow: Draft -> Submitted (locked for the submitter) -> Approved / Returned by an admin. Every step goes to the Activity Log.

## Phase 2 — Gap Assessment / Pre-audit
- New "Assessments" page: ISO 27001 clause 4-10 + Annex A checklist (Yes / Partial / No / N/A, evidence notes).
- Type: Internal or External audit.
- "No"/"Partial" answers create Non-Conformities; each NC gets a Corrective Action (owner, due date, status).
- Readiness score (%) per organization, shown on the dashboard.
- "Release results" to Org Admin plus chosen roles (new roles: Director, Analyst).

## Phase 3 — Customizable dashboards
- Widget library: KPI, bar, line, donut, area, table.
- Add / remove / resize (S/M/L) widgets; save layouts as named views ("Customization 1", rename freely), switch between them.
- Create new blank dashboards.
- Every chart gets a small "Download CSV" button.

## Phase 4 — Data sources and CSV import
- New dashboard data from: CSV upload, Google Sheets, Microsoft Excel (OneDrive), REST API URL, local server IP (must be reachable from the internet).
- Existing dashboards: "Download sample CSV" with the current column headers, then upload to append rows.

## Phase 5 — Resilience, backups, risk suggestions
- Offline / downtime: export a printable PDF + Excel "offline pack" (risk register, controls, checklist templates) so work continues manually, plus re-import of the filled CSV when the system is back.
- Manual backup: download all org data as a JSON/ZIP file.
- Automatic backup: choose daily / every 3 days / weekly; stored in the app's file storage, downloadable from a Backups page.
- Risk library: a database of sample risk index entries (outage, phishing, supplier failure, etc.). While typing a risk title, a box below live-suggests related entries; click to prefill.

## Technical details
- New tables: sub_organizations (parent_id tree), user_scope_roles (user, sub_org, role), policies, assessments, assessment_items, nonconformities, corrective_actions, dashboards, dashboard_widgets, data_sources, backups, risk_library. All with org-scoped RLS + grants, audit triggers.
- Risks get sub_organization_id + workflow status; RLS blocks edits by the submitter after submission.
- Scheduled backups via a cron-called secured server route writing to a private storage bucket.
- Google Sheets / Microsoft via app connectors (workspace account); API/IP sources fetched server-side.

## Suggested order
Phase 1 -> 2 -> 3 -> 4 -> 5. I'll start with Phase 1 after approval and continue phase by phase.
