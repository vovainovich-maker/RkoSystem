
-- Extend roles enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner_team';
