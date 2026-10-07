CREATE TABLE public.sub_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.sub_organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'Department',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_organizations TO authenticated;
GRANT ALL ON public.sub_organizations TO service_role;
ALTER TABLE public.sub_organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suborg read" ON public.sub_organizations FOR SELECT TO authenticated USING (is_system_owner() OR organization_id = current_org());
CREATE POLICY "suborg insert" ON public.sub_organizations FOR INSERT TO authenticated WITH CHECK (is_system_owner() OR (is_org_admin() AND organization_id = current_org()));
CREATE POLICY "suborg update" ON public.sub_organizations FOR UPDATE TO authenticated USING (is_system_owner() OR (is_org_admin() AND organization_id = current_org())) WITH CHECK (is_system_owner() OR (is_org_admin() AND organization_id = current_org()));
CREATE POLICY "suborg delete" ON public.sub_organizations FOR DELETE TO authenticated USING (is_system_owner() OR (is_org_admin() AND organization_id = current_org()));

CREATE TABLE public.user_scope_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sub_organization_id uuid NOT NULL REFERENCES public.sub_organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sub_organization_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_scope_roles TO authenticated;
GRANT ALL ON public.user_scope_roles TO service_role;
ALTER TABLE public.user_scope_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scope read" ON public.user_scope_roles FOR SELECT TO authenticated USING (is_system_owner() OR organization_id = current_org());
CREATE POLICY "scope insert" ON public.user_scope_roles FOR INSERT TO authenticated WITH CHECK (is_system_owner() OR (is_org_admin() AND organization_id = current_org() AND user_org(user_id) = current_org()));
CREATE POLICY "scope update" ON public.user_scope_roles FOR UPDATE TO authenticated USING (is_system_owner() OR (is_org_admin() AND organization_id = current_org())) WITH CHECK (is_system_owner() OR (is_org_admin() AND organization_id = current_org()));
CREATE POLICY "scope delete" ON public.user_scope_roles FOR DELETE TO authenticated USING (is_system_owner() OR (is_org_admin() AND organization_id = current_org()));

ALTER TABLE public.profiles ADD COLUMN sub_organization_id uuid REFERENCES public.sub_organizations(id) ON DELETE SET NULL,
  ADD COLUMN policy_level text NOT NULL DEFAULT 'submit';

ALTER TABLE public.risks ADD COLUMN sub_organization_id uuid REFERENCES public.sub_organizations(id) ON DELETE SET NULL,
  ADD COLUMN workflow_status text NOT NULL DEFAULT 'Draft',
  ADD COLUMN created_by uuid DEFAULT auth.uid(),
  ADD COLUMN reviewed_by uuid,
  ADD COLUMN review_note text NOT NULL DEFAULT '';
UPDATE public.risks SET workflow_status = 'Approved';

CREATE OR REPLACE FUNCTION public.my_policy() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT policy_level FROM public.profiles WHERE id = auth.uid()), 'view');
$$;
CREATE OR REPLACE FUNCTION public.can_approve() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_system_owner() OR is_org_admin() OR my_policy() = 'approve';
$$;
REVOKE EXECUTE ON FUNCTION public.my_policy() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_approve() FROM anon, public;

CREATE OR REPLACE FUNCTION public.enforce_risk_workflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR can_approve() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF my_policy() = 'view' THEN RAISE EXCEPTION 'Your policy is view-only'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.workflow_status NOT IN ('Draft','Submitted') THEN NEW.workflow_status := 'Draft'; END IF;
    IF NEW.workflow_status = 'Submitted' AND my_policy() <> 'submit' THEN RAISE EXCEPTION 'Your policy does not allow submitting'; END IF;
    NEW.created_by := auth.uid();
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.workflow_status <> 'Draft' AND OLD.workflow_status <> 'Returned' THEN RAISE EXCEPTION 'Submitted or approved risks can only be removed by an approver'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.workflow_status IN ('Submitted','Approved') THEN RAISE EXCEPTION 'This risk is locked (%). Ask an admin.', OLD.workflow_status; END IF;
  IF NEW.workflow_status NOT IN ('Draft','Submitted') THEN RAISE EXCEPTION 'Only approvers can approve or return risks'; END IF;
  IF NEW.workflow_status = 'Submitted' AND my_policy() <> 'submit' THEN RAISE EXCEPTION 'Your policy does not allow submitting'; END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_risk_workflow() FROM anon, public, authenticated;
CREATE TRIGGER risks_workflow BEFORE INSERT OR UPDATE OR DELETE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.enforce_risk_workflow();
CREATE TRIGGER audit_sub_organizations AFTER INSERT OR UPDATE OR DELETE ON public.sub_organizations FOR EACH ROW EXECUTE FUNCTION public.log_row_change();

CREATE TABLE public.risk_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT 'IT',
  severity text NOT NULL DEFAULT 'Medium',
  keywords text NOT NULL DEFAULT '',
  suggested_control text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.risk_library TO authenticated;
GRANT ALL ON public.risk_library TO service_role;
ALTER TABLE public.risk_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "library read" ON public.risk_library FOR SELECT TO authenticated USING (true);
INSERT INTO public.risk_library (code,title,description,domain,severity,keywords,suggested_control) VALUES
('RL-001','Data centre power outage','Loss of utility power causing system downtime','Physical','High','outage power downtime ups electricity','A.7.11 Supporting utilities'),
('RL-002','Cloud service provider outage','Primary cloud region unavailable','Supplier','High','outage cloud aws azure downtime region','A.5.30 ICT readiness for business continuity'),
('RL-003','Network/ISP outage','Internet connectivity loss at office or DC','IT','Medium','outage network isp internet connectivity','A.8.14 Redundancy of information processing'),
('RL-004','Application outage after change','Unplanned downtime from faulty deployment','IT','Medium','outage change deployment release downtime','A.8.32 Change management'),
('RL-005','Phishing credential theft','Staff tricked into disclosing credentials','External','High','phishing email credential social engineering','A.6.3 Security awareness training'),
('RL-006','Ransomware infection','Malware encrypts business data','External','Critical','ransomware malware encryption attack','A.8.7 Protection against malware'),
('RL-007','Unpatched vulnerabilities','Known CVEs left unpatched on servers','IT','High','patch vulnerability cve update','A.8.8 Management of technical vulnerabilities'),
('RL-008','Insider data leakage','Employee exfiltrates confidential data','Internal','High','insider leak exfiltration dlp employee','A.8.12 Data leakage prevention'),
('RL-009','Lost or stolen laptop','Unencrypted endpoint lost','Physical','Medium','laptop stolen lost device encryption','A.8.1 User endpoint devices'),
('RL-010','Supplier data breach','Third party processing our data is breached','Supplier','High','supplier vendor third party breach','A.5.19 Supplier relationships'),
('RL-011','Backup failure','Backups incomplete or not restorable','IT','High','backup restore recovery failure','A.8.13 Information backup'),
('RL-012','Excessive access rights','Users retain privileges beyond need','Internal','Medium','access privilege rights leaver joiner','A.5.18 Access rights'),
('RL-013','Regulatory non-compliance (PDPA/GDPR)','Personal data processed unlawfully','Compliance','High','pdpa gdpr privacy regulation compliance','A.5.34 Privacy and protection of PII'),
('RL-014','DDoS attack','Service overwhelmed by malicious traffic','External','High','ddos attack outage traffic availability','A.8.20 Networks security'),
('RL-015','Fire or flood at premises','Physical damage to facilities','Physical','Critical','fire flood disaster premises','A.7.5 Protecting against physical threats');