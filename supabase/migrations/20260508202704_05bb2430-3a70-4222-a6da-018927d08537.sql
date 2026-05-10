
-- ============ NEW TABLES ============

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  color text DEFAULT '#10b981',
  status text DEFAULT 'active',
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  team_role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  custom_payout integer,
  enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.access_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_key_id uuid NOT NULL REFERENCES public.access_keys(id) ON DELETE CASCADE,
  user_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ ALTER EXISTING ============

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.access_keys ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.access_keys ADD COLUMN IF NOT EXISTS assigned_role text DEFAULT 'user';

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS stage text DEFAULT 'OTHER';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS payout_min integer DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS payout_max integer DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- ============ FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin') $$;

CREATE OR REPLACE FUNCTION public.is_team_lead(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'team_lead') $$;

CREATE OR REPLACE FUNCTION public.is_owner_team(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner_team') $$;

CREATE OR REPLACE FUNCTION public.get_user_team(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_access_team(_user_id uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin(_user_id)
    OR EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id)
    OR EXISTS (SELECT 1 FROM public.teams WHERE id = _team_id AND owner_user_id = _user_id)
$$;

-- ============ ENABLE RLS ============

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_key_usage ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: teams ============

CREATE POLICY "Admins manage teams" ON public.teams
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members can view their team" ON public.teams
  FOR SELECT TO authenticated USING (public.can_access_team(auth.uid(), id));

-- ============ POLICIES: team_members ============

CREATE POLICY "Admins manage team_members" ON public.team_members
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members can view their team_members" ON public.team_members
  FOR SELECT TO authenticated USING (public.can_access_team(auth.uid(), team_id));

CREATE POLICY "Team leads can add members" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_team(auth.uid(), team_id)
    AND (public.is_team_lead(auth.uid()) OR public.is_owner_team(auth.uid()))
  );

-- ============ POLICIES: team_offers ============

CREATE POLICY "Admins manage team_offers" ON public.team_offers
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Members view team_offers" ON public.team_offers
  FOR SELECT TO authenticated USING (public.can_access_team(auth.uid(), team_id));

-- ============ POLICIES: impersonation_logs ============

CREATE POLICY "Admins view impersonation_logs" ON public.impersonation_logs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert impersonation_logs" ON public.impersonation_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND auth.uid() = admin_user_id);

-- ============ POLICIES: access_key_usage ============

CREATE POLICY "Admins view access_key_usage" ON public.access_key_usage
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone insert access_key_usage" ON public.access_key_usage
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============ UPDATE LEADS POLICIES (team_lead/owner_team) ============

DROP POLICY IF EXISTS "Team leads view team leads" ON public.leads;
CREATE POLICY "Team leads view team leads" ON public.leads
  FOR SELECT TO authenticated USING (
    team_id IS NOT NULL AND public.can_access_team(auth.uid(), team_id)
  );

DROP POLICY IF EXISTS "Team leads update team leads" ON public.leads;
CREATE POLICY "Team leads update team leads" ON public.leads
  FOR UPDATE TO authenticated USING (
    team_id IS NOT NULL AND public.can_access_team(auth.uid(), team_id)
    AND (public.is_team_lead(auth.uid()) OR public.is_owner_team(auth.uid()))
  );

-- ============ TRIGGERS ============

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED TEAMS ============

INSERT INTO public.teams (name, slug, description, color) VALUES
  ('EXC Team', 'exc', 'Дебетовые карты, РКО и кредитки', '#10b981'),
  ('RR Team', 'rr', 'МФО офферы', '#f59e0b'),
  ('Xasl Team', 'xasl', 'Универсальная команда', '#8b5cf6')
ON CONFLICT (slug) DO NOTHING;
