export type GroupStageFormat = 'group-stage-knockout';

export interface GroupStageConfig {
  groupCount: number;
  teamsPerGroup: number | null;
  qualifiersPerGroup: number;
  knockoutTeams: number;
  playoffFormat: 'single-match' | 'home-and-away';
}
