export const RESPONSES = ["Yes", "Partial", "No", "N/A"] as const;
export const NC_GRADES = ["Major", "Minor", "Observation"] as const;
export const NC_STATUSES = ["Open", "In Progress", "Closed"] as const;
export const RELEASE_ROLES = ["org_admin", "director", "manager", "analyst", "auditor", "standard"];

export interface Assessment {
  id: string;
  organization_id: string;
  title: string;
  audit_type: string;
  standard: string;
  auditor: string;
  status: string;
  released: boolean;
  release_roles: string[];
  released_at: string | null;
  created_at: string;
}
export interface AssessmentItem {
  id: string;
  assessment_id: string;
  ref: string;
  section: string;
  requirement: string;
  response: string;
  evidence: string;
  sort: number;
}
export interface NonConformity {
  id: string;
  assessment_id: string;
  item_id: string | null;
  ref: string;
  title: string;
  grade: string;
  corrective_action: string;
  owner: string;
  due_date: string | null;
  status: string;
  created_at: string;
}

/** Readiness = (Yes + 0.5 × Partial) / answered items excluding N/A. */
export function readiness(items: Pick<AssessmentItem, "response">[]) {
  const scored = items.filter((i) => ["Yes", "Partial", "No"].includes(i.response));
  const answered = items.filter((i) => i.response !== "Unanswered").length;
  const score = scored.length
    ? Math.round(
        (scored.reduce((s, i) => s + (i.response === "Yes" ? 1 : i.response === "Partial" ? 0.5 : 0), 0) /
          scored.length) *
          100,
      )
    : 0;
  return { score, answered, total: items.length };
}

export const scoreTone = (s: number) =>
  s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--destructive)";

export const CHECKLIST: [string, string, string][] = [
  ["4.1", "Clause 4 · Context", "External and internal issues relevant to the ISMS are determined"],
  ["4.2", "Clause 4 · Context", "Interested parties and their requirements are identified"],
  ["4.3", "Clause 4 · Context", "ISMS scope is defined and documented"],
  ["5.1", "Clause 5 · Leadership", "Top management demonstrates leadership and commitment"],
  ["5.2", "Clause 5 · Leadership", "An information security policy is approved and communicated"],
  ["5.3", "Clause 5 · Leadership", "ISMS roles, responsibilities and authorities are assigned"],
  ["6.1.2", "Clause 6 · Planning", "A risk assessment process is defined and applied"],
  ["6.1.3", "Clause 6 · Planning", "Risk treatment plan and Statement of Applicability exist"],
  ["6.2", "Clause 6 · Planning", "Information security objectives are set and measurable"],
  ["7.2", "Clause 7 · Support", "Competence of personnel is determined and evidenced"],
  ["7.3", "Clause 7 · Support", "Staff are aware of the policy and their contribution"],
  ["7.5", "Clause 7 · Support", "Documented information is controlled"],
  ["8.1", "Clause 8 · Operation", "Operational processes are planned and controlled"],
  ["8.2", "Clause 8 · Operation", "Risk assessments are performed at planned intervals"],
  ["9.1", "Clause 9 · Evaluation", "ISMS performance is monitored and measured"],
  ["9.2", "Clause 9 · Evaluation", "Internal audit programme is established and conducted"],
  ["9.3", "Clause 9 · Evaluation", "Management review is performed at planned intervals"],
  ["10.1", "Clause 10 · Improvement", "Continual improvement of the ISMS is evidenced"],
  ["10.2", "Clause 10 · Improvement", "Nonconformities are corrected and root causes addressed"],
  ["A.5.1", "Annex A · Organizational", "Policies for information security are defined"],
  ["A.5.9", "Annex A · Organizational", "Inventory of information and assets is maintained"],
  ["A.5.15", "Annex A · Organizational", "Access control rules are established"],
  ["A.5.19", "Annex A · Organizational", "Supplier security requirements are agreed"],
  ["A.5.24", "Annex A · Organizational", "Incident management is planned and prepared"],
  ["A.5.30", "Annex A · Organizational", "ICT readiness for business continuity is planned"],
  ["A.6.3", "Annex A · People", "Security awareness and training is delivered"],
  ["A.7.1", "Annex A · Physical", "Physical security perimeters are defined"],
  ["A.8.5", "Annex A · Technological", "Secure authentication (MFA) is implemented"],
  ["A.8.8", "Annex A · Technological", "Technical vulnerabilities are managed"],
  ["A.8.13", "Annex A · Technological", "Information backups are taken and tested"],
  ["A.8.15", "Annex A · Technological", "Logging of activities is in place"],
  ["A.8.24", "Annex A · Technological", "Use of cryptography is defined"],
];
