
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'teamlead', 'user');

-- Create lead_status enum
CREATE TYPE public.lead_status AS ENUM ('NEW', 'IN_PROGRESS', 'SUCCESS', 'REJECTED');

-- Create offer_category enum
CREATE TYPE public.offer_category AS ENUM ('RKO', 'CREDIT', 'DEBIT', 'REGBIZ', 'MFO', 'HR');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  team TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  status TEXT DEFAULT 'offline',
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'super_admin')
  )
$$;

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles RLS
CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- User roles RLS
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create offers table
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category offer_category NOT NULL DEFAULT 'RKO',
  rate TEXT DEFAULT '0%',
  payout INTEGER DEFAULT 0,
  geo TEXT DEFAULT 'РФ',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view offers"
  ON public.offers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage offers"
  ON public.offers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  email TEXT DEFAULT '',
  source TEXT DEFAULT '',
  offer TEXT DEFAULT '',
  offer_category TEXT DEFAULT '',
  manager_id UUID REFERENCES public.profiles(id),
  status lead_status NOT NULL DEFAULT 'NEW',
  amount INTEGER DEFAULT 0,
  ai_score INTEGER DEFAULT 0,
  comment TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Leads RLS: admin sees all, user sees only assigned
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own leads"
  ON public.leads FOR SELECT TO authenticated
  USING (
    created_by = auth.uid() OR
    manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated can create leads"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update any lead"
  ON public.leads FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid() OR
    manager_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create lead_history table
CREATE TABLE public.lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all history"
  ON public.lead_history FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view history of own leads"
  ON public.lead_history FOR SELECT TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE created_by = auth.uid() OR
            manager_id IN (SELECT pid.id FROM public.profiles pid WHERE pid.user_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated can insert history"
  ON public.lead_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create access_keys table
CREATE TABLE public.access_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage access keys"
  ON public.access_keys FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_leads_manager ON public.leads(manager_id);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
