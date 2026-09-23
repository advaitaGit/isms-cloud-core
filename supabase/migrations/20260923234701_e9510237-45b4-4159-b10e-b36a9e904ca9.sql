
CREATE TYPE public.app_role AS ENUM ('system_owner','org_admin','manager','auditor','standard');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'Trial' CHECK (subscription_status IN ('Active','Trial','Unsubscribed')),
  tier text NOT NULL DEFAULT 'Basic' CHECK (tier IN ('Basic','Pro','Enterprise')),
  seats integer NOT NULL DEFAULT 5 CHECK (seats > 0),
  monthly_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  domain text NOT NULL DEFAULT 'Internal' CHECK (domain IN ('Internal','IT','External','Physical','Supplier','Compliance')),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In-Progress','Resolved','Monitor')),
  severity text NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low','Medium','High','Critical')),
  owner text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_ref text NOT NULL DEFAULT '',
  control_name text NOT NULL,
  status text NOT NULL DEFAULT 'Not Implemented' CHECK (status IN ('Implemented','In-Progress','Not Implemented','Not Applicable')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invites (
  email text PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'standard',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risks TO authenticated;
GRANT ALL ON public.risks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controls TO authenticated;
GRANT ALL ON public.controls TO service_role;
GRANT ALL ON public.invites TO service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_system_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'system_owner');
$$;

CREATE OR REPLACE FUNCTION public.current_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_org(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'org_admin');
$$;

CREATE OR REPLACE FUNCTION public.org_is_active(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org AND subscription_status = 'Active');
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org read own" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_system_owner() OR id = public.current_org());
CREATE POLICY "org insert owner" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (public.is_system_owner());
CREATE POLICY "org update owner" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_system_owner()) WITH CHECK (public.is_system_owner());
CREATE POLICY "org delete owner" ON public.organizations FOR DELETE TO authenticated
  USING (public.is_system_owner());

CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_system_owner() OR id = auth.uid() OR organization_id = public.current_org());
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_system_owner() OR id = auth.uid() OR (public.is_org_admin() AND organization_id = public.current_org()))
  WITH CHECK (public.is_system_owner() OR id = auth.uid() OR (public.is_org_admin() AND organization_id = public.current_org()));
CREATE POLICY "profiles delete" ON public.profiles FOR DELETE TO authenticated
  USING (public.is_system_owner() OR (public.is_org_admin() AND organization_id = public.current_org() AND id <> auth.uid()));

CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_system_owner() OR user_id = auth.uid() OR public.user_org(user_id) = public.current_org());
CREATE POLICY "roles insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_system_owner() OR (public.is_org_admin() AND public.user_org(user_id) = public.current_org() AND role <> 'system_owner'));
CREATE POLICY "roles update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_system_owner() OR (public.is_org_admin() AND public.user_org(user_id) = public.current_org()))
  WITH CHECK (public.is_system_owner() OR (public.is_org_admin() AND public.user_org(user_id) = public.current_org() AND role <> 'system_owner'));
CREATE POLICY "roles delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_system_owner() OR (public.is_org_admin() AND public.user_org(user_id) = public.current_org()));

CREATE POLICY "risks read" ON public.risks FOR SELECT TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org());
CREATE POLICY "risks insert" ON public.risks FOR INSERT TO authenticated
  WITH CHECK (public.is_system_owner() OR (organization_id = public.current_org() AND public.org_is_active(organization_id)));
CREATE POLICY "risks update" ON public.risks FOR UPDATE TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org())
  WITH CHECK (public.is_system_owner() OR organization_id = public.current_org());
CREATE POLICY "risks delete" ON public.risks FOR DELETE TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org());

CREATE POLICY "controls read" ON public.controls FOR SELECT TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org());
CREATE POLICY "controls insert" ON public.controls FOR INSERT TO authenticated
  WITH CHECK (public.is_system_owner() OR (organization_id = public.current_org() AND public.org_is_active(organization_id)));
CREATE POLICY "controls update" ON public.controls FOR UPDATE TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org())
  WITH CHECK (public.is_system_owner() OR organization_id = public.current_org());
CREATE POLICY "controls delete" ON public.controls FOR DELETE TO authenticated
  USING (public.is_system_owner() OR organization_id = public.current_org());

CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  used integer;
  allowed integer;
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;
  SELECT seats INTO allowed FROM public.organizations WHERE id = NEW.organization_id;
  SELECT count(*) INTO used FROM public.profiles WHERE organization_id = NEW.organization_id;
  IF allowed IS NOT NULL AND used >= allowed THEN
    RAISE EXCEPTION 'Seat limit reached for this organization';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_seat_limit BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();

INSERT INTO public.organizations (id, name, subscription_status, tier, seats, monthly_price) VALUES
  ('11111111-1111-1111-1111-111111111111','Org 1','Active','Pro',25,499),
  ('22222222-2222-2222-2222-222222222222','Org 2','Unsubscribed','Basic',10,0);

INSERT INTO public.invites (email, organization_id, role) VALUES
  ('owner@saas.com', NULL, 'system_owner'),
  ('admin@org1.com','11111111-1111-1111-1111-111111111111','org_admin'),
  ('testemailorg1@org1.com','11111111-1111-1111-1111-111111111111','standard'),
  ('admin@org2.com','22222222-2222-2222-2222-222222222222','org_admin');

INSERT INTO public.risks (organization_id, title, description, domain, status, severity, owner) VALUES
  ('11111111-1111-1111-1111-111111111111','Unpatched VPN appliance','Edge VPN running firmware with known CVEs.','IT','Open','Critical','A. Chandra'),
  ('11111111-1111-1111-1111-111111111111','Shared admin credentials','Infrastructure admin account shared across ops team.','Internal','In-Progress','High','J. Mensah'),
  ('11111111-1111-1111-1111-111111111111','Third-party data processor without DPA','Marketing vendor processing PII without agreement.','Supplier','Open','High','L. Novak'),
  ('11111111-1111-1111-1111-111111111111','Phishing susceptibility','Simulation click rate at 18%.','External','Monitor','Medium','S. Patel'),
  ('11111111-1111-1111-1111-111111111111','Server room access log gaps','Badge logs missing for two weeks.','Physical','Resolved','Medium','R. Silva'),
  ('11111111-1111-1111-1111-111111111111','Backup restore untested','No restore test performed in 12 months.','IT','In-Progress','High','A. Chandra'),
  ('11111111-1111-1111-1111-111111111111','GDPR records incomplete','Processing register missing three systems.','Compliance','Open','Medium','L. Novak'),
  ('11111111-1111-1111-1111-111111111111','Offboarding delays','Accounts active 10+ days after exit.','Internal','Monitor','Low','J. Mensah');

INSERT INTO public.controls (organization_id, control_ref, control_name, status) VALUES
  ('11111111-1111-1111-1111-111111111111','A.5.1','Policies for information security','Implemented'),
  ('11111111-1111-1111-1111-111111111111','A.5.15','Access control','In-Progress'),
  ('11111111-1111-1111-1111-111111111111','A.5.23','Information security for cloud services','In-Progress'),
  ('11111111-1111-1111-1111-111111111111','A.6.3','Information security awareness and training','Implemented'),
  ('11111111-1111-1111-1111-111111111111','A.7.2','Physical entry controls','Implemented'),
  ('11111111-1111-1111-1111-111111111111','A.8.7','Protection against malware','Implemented'),
  ('11111111-1111-1111-1111-111111111111','A.8.13','Information backup','Not Implemented'),
  ('11111111-1111-1111-1111-111111111111','A.8.16','Monitoring activities','Not Applicable');
