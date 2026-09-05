ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS champion_team_id text REFERENCES public.teams(id) ON DELETE SET NULL;
