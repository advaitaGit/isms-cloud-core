# Secure Tenant Portal

Build a complete, production-ready B2B SaaS Multi-Tenant ISMS (Information Security Management System) Risk Portal using React, Tailwind CSS, and Supabase.

1. Core Architecture & Multi-Tenancy:

Set up a multi-tenant database schema using Supabase.

Crucial: Implement Row Level Security (RLS) so that users can strictly only view, edit, or delete data (Risks, Controls, Users) that belongs to their specific organization_id.

The only exception is the System Owner role, which has global read/write access.

2. Database Models (Supabase):

Organizations: id, name, subscription_status (Active, Trial, Unsubscribed), tier (Basic, Pro, Enterprise), seats (integer limit), created_at.

Users: Linked to Supabase Auth. id, organization_id, name, email, role (System Owner, Org Admin, Manager, Auditor, Standard).

Risks: id, organization_id, title, domain (Internal, IT, External, etc.), status (Open, In-Progress, Resolved, Monitor), severity (Low, Medium, High, Critical), owner, created_at.

Controls (Annex A): id, organization_id, control_name, status.

3. Role-Based Access Control (RBAC) & Views:

System Owner (Super Admin): Has a dedicated "Global Dashboard" in the sidebar. Can view total SaaS metrics (total orgs, MRR, active users). Has an "Organization Management" page to create new Orgs, change subscription statuses, edit seat limits, and reset Org Admin passwords.

Org Admin: Has a "User Management" page to add/edit/delete users within their organization, up to their seats limit. Can change user roles and trigger password resets.

Org User (Manager/Auditor/Standard): Can only access the main ISMS modules: Dashboard (showing Org-specific charts), Risk Register, Log a Risk (form), and Annex A Controls.

4. Business Logic & Subscription Enforcement:

Seat Limits: When an Org Admin tries to add a new user in the User Management page, validate against the Organization's seats limit. Block creation if the limit is reached.

Trial / Unsubscribed State: If an Organization's subscription_status is 'Trial' or 'Unsubscribed', display a persistent, prominent warning banner at the top of the app: "This account is unsubscribed / on a trial and is for sample viewing only." Disable the "Log a Risk" and "Add User" buttons for these accounts (Read-Only mode).

5. UI / UX Design:

Use a clean, modern, enterprise SaaS design (similar to Atlassian or Datadog).

Include a persistent left-hand sidebar for navigation.

The Dashboard should include visual charts (bar charts for Risk by Domain, donut charts for Mitigation Status) and KPI metric cards (Total Active Risks, Critical Risks).

Include a functional authentication flow (Login, Sign Up, Forgot Password).

6. Seed Data:

Please generate SQL seed data for Supabase containing:

The "System Owner" account (owner@saas.com).

"Org 1" (Active, 25 seats) with an Admin (admin@org1.com) and a test user (testemailorg1@org1.com).

"Org 2" (Unsubscribed, 10 seats) with an Admin (admin@org2.com).

Include 5-10 sample risks and controls for Org 1 so the dashboard charts populate immediately.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://isms-cloud-core.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2fc600f-9cbc-45e7-995e-33e72f69f547).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
