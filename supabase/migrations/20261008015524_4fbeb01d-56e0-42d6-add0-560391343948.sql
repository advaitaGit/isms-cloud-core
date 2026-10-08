CREATE OR REPLACE FUNCTION public.can_audit() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_system_owner() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('org_admin','manager','auditor'));
$$;
REVOKE EXECUTE ON FUNCTION public.can_audit() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_audit() TO authenticated;

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  audit_type text NOT NULL DEFAULT 'Internal',
  standard text NOT NULL DEFAULT 'ISO/IEC 27001:2022',
  auditor text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'In Progress',
  released boolean NOT NULL DEFAULT false,
  release_roles text[] NOT NULL DEFAULT '{}',
  released_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_assessment(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_system_owner() OR EXISTS (
    SELECT 1 FROM assessments a WHERE a.id = _id AND a.organization_id = current_org()
      AND (can_audit() OR (a.released AND EXISTS (
        SELECT 1 FROM user_roles r WHERE r.user_id = auth.uid() AND r.role::text = ANY (a.release_roles)))));
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_assessment(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_assessment(uuid) TO authenticated;

CREATE POLICY "assess read" ON public.assessments FOR SELECT TO authenticated USING (can_view_assessment(id));
CREATE POLICY "assess insert" ON public.assessments FOR INSERT TO authenticated WITH CHECK (is_system_owner() OR (organization_id = current_org() AND can_audit() AND org_is_active(organization_id)));
CREATE POLICY "assess update" ON public.assessments FOR UPDATE TO authenticated USING (is_system_owner() OR (organization_id = current_org() AND can_audit())) WITH CHECK (is_system_owner() OR (organization_id = current_org() AND can_audit()));
CREATE POLICY "assess delete" ON public.assessments FOR DELETE TO authenticated USING (is_system_owner() OR (organization_id = current_org() AND is_org_admin()));

CREATE TABLE public.assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref text NOT NULL,
  section text NOT NULL DEFAULT '',
  requirement text NOT NULL,
  response text NOT NULL DEFAULT 'Unanswered',
  evidence text NOT NULL DEFAULT '',
  sort integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_items TO authenticated;
GRANT ALL ON public.assessment_items TO service_role;
ALTER TABLE public.assessment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items read" ON public.assessment_items FOR SELECT TO authenticated USING (can_view_assessment(assessment_id));
CREATE POLICY "items write" ON public.assessment_items FOR ALL TO authenticated USING (is_system_owner() OR (organization_id = current_org() AND can_audit())) WITH CHECK (is_system_owner() OR (organization_id = current_org() AND can_audit()));

CREATE TABLE public.nonconformities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  item_id uuid UNIQUE REFERENCES public.assessment_items(id) ON DELETE CASCADE,
  ref text NOT NULL DEFAULT '',
  title text NOT NULL,
  grade text NOT NULL DEFAULT 'Minor',
  corrective_action text NOT NULL DEFAULT '',
  owner text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nonconformities TO authenticated;
GRANT ALL ON public.nonconformities TO service_role;
ALTER TABLE public.nonconformities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nc read" ON public.nonconformities FOR SELECT TO authenticated USING (can_view_assessment(assessment_id));
CREATE POLICY "nc write" ON public.nonconformities FOR ALL TO authenticated USING (is_system_owner() OR (organization_id = current_org() AND can_audit())) WITH CHECK (is_system_owner() OR (organization_id = current_org() AND can_audit()));

CREATE TRIGGER audit_assessments AFTER INSERT OR UPDATE OR DELETE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.log_row_change();
CREATE TRIGGER audit_nonconformities AFTER INSERT OR UPDATE OR DELETE ON public.nonconformities FOR EACH ROW EXECUTE FUNCTION public.log_row_change();