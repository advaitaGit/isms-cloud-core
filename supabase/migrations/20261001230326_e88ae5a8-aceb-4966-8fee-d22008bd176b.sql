CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id text,
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_org_created ON public.audit_logs (organization_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated
USING (
  is_system_owner()
  OR (organization_id = current_org()
      AND (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'manager')))
);
CREATE POLICY "audit insert auth events" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (organization_id IS NOT DISTINCT FROM current_org())
  AND action IN ('auth.login', 'auth.logout', 'auth.password_change')
);

CREATE OR REPLACE FUNCTION public.log_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec jsonb;
  old_rec jsonb;
  changes jsonb := '{}'::jsonb;
  k text;
  org uuid;
  label text;
  email text := '';
BEGIN
  IF TG_OP = 'DELETE' THEN rec := to_jsonb(OLD); ELSE rec := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'organizations' THEN org := (rec->>'id')::uuid;
  ELSE org := (rec->>'organization_id')::uuid; END IF;
  label := COALESCE(rec->>'title', rec->>'control_name', rec->>'name', '');
  IF TG_OP = 'UPDATE' THEN
    old_rec := to_jsonb(OLD);
    FOR k IN SELECT jsonb_object_keys(rec) LOOP
      IF rec->k IS DISTINCT FROM old_rec->k THEN
        changes := changes || jsonb_build_object(k, jsonb_build_object('from', old_rec->k, 'to', rec->k));
      END IF;
    END LOOP;
    IF changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    changes := rec;
  END IF;
  IF auth.uid() IS NOT NULL THEN
    SELECT p.email INTO email FROM profiles p WHERE p.id = auth.uid();
  END IF;
  INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, entity_type, entity_id, summary, details)
  VALUES (org, auth.uid(), COALESCE(email, ''),
          left(TG_TABLE_NAME, -1) || '.' || lower(CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END),
          left(TG_TABLE_NAME, -1), rec->>'id', label, changes);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_row_change() FROM anon, public;

CREATE TRIGGER audit_risks AFTER INSERT OR UPDATE OR DELETE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.log_row_change();
CREATE TRIGGER audit_controls AFTER INSERT OR UPDATE OR DELETE ON public.controls FOR EACH ROW EXECUTE FUNCTION public.log_row_change();
CREATE TRIGGER audit_organizations AFTER INSERT OR UPDATE OR DELETE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.log_row_change();