-- Fase de grupos + eliminación directa
ALTER TABLE public.leagues
  DROP CONSTRAINT IF EXISTS leagues_format_check;

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_format_check
  CHECK (format = ANY (ARRAY[
    'league'::text,
    'league-playoff'::text,
    'league-knockout'::text,
    'group-knockout'::text,
    'custom'::text
  ]));

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS group_stage_config jsonb;

ALTER TABLE public.seasons
  DROP CONSTRAINT IF EXISTS seasons_phase_check;

ALTER TABLE public.seasons
  ADD CONSTRAINT seasons_phase_check
  CHECK (phase = ANY (ARRAY[
    'regular'::text,
    'group'::text,
    'playoff'::text,
    'knockout'::text
  ]));

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_phase_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_phase_check
  CHECK (phase = ANY (ARRAY[
    'regular'::text,
    'group'::text,
    'playoff'::text,
    'knockout'::text
  ]));

CREATE TABLE IF NOT EXISTS public.season_groups (
  id text PRIMARY KEY,
  season_id text NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL CHECK (position >= 1),
  UNIQUE (season_id, position),
  UNIQUE (season_id, name)
);

CREATE TABLE IF NOT EXISTS public.season_group_teams (
  id text PRIMARY KEY,
  group_id text NOT NULL REFERENCES public.season_groups(id) ON DELETE CASCADE,
  team_id text NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  UNIQUE (group_id, team_id)
);

ALTER TABLE public.season_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_group_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS season_groups_read_active_member ON public.season_groups;
CREATE POLICY season_groups_read_active_member
  ON public.season_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.league_members lm
      JOIN public.seasons s ON s.id = season_groups.season_id
      WHERE lm.league_id = s.league_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

DROP POLICY IF EXISTS season_groups_manage_admin ON public.season_groups;
CREATE POLICY season_groups_manage_admin
  ON public.season_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.seasons s
      WHERE s.id = season_groups.season_id
        AND public.is_league_admin(s.league_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seasons s
      WHERE s.id = season_groups.season_id
        AND public.is_league_admin(s.league_id)
    )
  );

DROP POLICY IF EXISTS season_group_teams_read_active_member ON public.season_group_teams;
CREATE POLICY season_group_teams_read_active_member
  ON public.season_group_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.season_groups sg
      JOIN public.seasons s ON s.id = sg.season_id
      JOIN public.league_members lm ON lm.league_id = s.league_id
      WHERE sg.id = season_group_teams.group_id
        AND lm.user_id = auth.uid()
        AND lm.status = 'active'
    )
  );

DROP POLICY IF EXISTS season_group_teams_manage_admin ON public.season_group_teams;
CREATE POLICY season_group_teams_manage_admin
  ON public.season_group_teams FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.season_groups sg
      JOIN public.seasons s ON s.id = sg.season_id
      WHERE sg.id = season_group_teams.group_id
        AND public.is_league_admin(s.league_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.season_groups sg
      JOIN public.seasons s ON s.id = sg.season_id
      WHERE sg.id = season_group_teams.group_id
        AND public.is_league_admin(s.league_id)
    )
  );
