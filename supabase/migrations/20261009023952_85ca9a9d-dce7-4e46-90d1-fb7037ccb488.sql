CREATE TABLE public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'My dashboard',
  layouts jsonb NOT NULL DEFAULT '[]'::jsonb,
  active_layout integer NOT NULL DEFAULT 0,
  dataset jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO authenticated;
GRANT ALL ON public.dashboards TO service_role;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own dashboards" ON public.dashboards FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND (organization_id IS NULL OR organization_id = current_org() OR is_system_owner()));
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER dashboards_touch BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();