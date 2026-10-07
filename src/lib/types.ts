export type AppRole = "system_owner" | "org_admin" | "manager" | "auditor" | "standard";

export const ROLE_LABELS: Record<AppRole, string> = {
  system_owner: "System Owner",
  org_admin: "Org Admin",
  manager: "Manager",
  auditor: "Auditor",
  standard: "Standard",
};

export const ASSIGNABLE_ROLES: AppRole[] = ["org_admin", "manager", "auditor", "standard"];

export const RISK_DOMAINS = [
  "Internal",
  "IT",
  "External",
  "Physical",
  "Supplier",
  "Compliance",
] as const;
export const RISK_STATUSES = ["Open", "In-Progress", "Resolved", "Monitor"] as const;
export const RISK_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export const CONTROL_STATUSES = [
  "Implemented",
  "In-Progress",
  "Not Implemented",
  "Not Applicable",
] as const;
export const SUBSCRIPTION_STATUSES = ["Active", "Trial", "Unsubscribed"] as const;
export const TIERS = ["Basic", "Pro", "Enterprise"] as const;

export interface Organization {
  id: string;
  name: string;
  subscription_status: (typeof SUBSCRIPTION_STATUSES)[number];
  tier: (typeof TIERS)[number];
  seats: number;
  monthly_price: number;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  name: string;
  email: string;
  created_at: string;
  sub_organization_id?: string | null;
  policy_level?: string;
}

export interface Risk {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  domain: string;
  status: string;
  severity: string;
  owner: string;
  created_at: string;
  sub_organization_id?: string | null;
  workflow_status?: string;
  created_by?: string | null;
  review_note?: string;
}

export interface Control {
  id: string;
  organization_id: string;
  control_ref: string;
  control_name: string;
  status: string;
  created_at: string;
}

export const POLICY_LEVELS = ["view", "edit", "submit", "approve"] as const;
export const POLICY_LABELS: Record<string, string> = {
  view: "View only",
  edit: "View + edit drafts",
  submit: "View, edit & submit",
  approve: "Approver",
};
export const WORKFLOW_STYLES: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-info/15 text-info",
  Approved: "bg-success/15 text-success",
  Returned: "bg-warning/20 text-warning",
};
export interface SubOrganization {
  id: string;
  organization_id: string;
  parent_id: string | null;
  name: string;
  kind: string;
  created_at: string;
}
