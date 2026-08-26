import { Match } from '@/types';
import { matchService } from './matchService';

export interface PlayoffSeriesResult {
  decided: boolean;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  aggregateHomeGoals: number;
  aggregateAwayGoals: number;
  wentToOvertime: boolean;
}

export async function getSeriesResult(
  seriesId: string,
): Promise<PlayoffSeriesResult> {
  const matches: Match[] = (await matchService.getMatches()).filter(
    (match) => match.playoffSeriesId === seriesId,
  );

  if (matches.length === 0) {
    throw new Error('Serie de playoff no encontrada.');
  }

  const firstLeg = matches.find((match) => match.playoffLeg === 1);
  const secondLeg = matches.find((match) => match.playoffLeg === 2);

  if (!firstLeg && matches.length === 1) {
    const match = matches[0];

    if (
      match.status !== 'finished' ||
      match.homeScore === null ||
      match.awayScore === null
    ) {
      return {
        decided: false,
        winnerTeamId: null,
        loserTeamId: null,
        aggregateHomeGoals: 0,
        aggregateAwayGoals: 0,
        wentToOvertime: match.wentToOvertime,
      };
    }

    if (match.homeScore === match.awayScore) {
      return {
        decided: false,
        winnerTeamId: null,
        loserTeamId: null,
        aggregateHomeGoals: match.homeScore,
        aggregateAwayGoals: match.awayScore,
        wentToOvertime: match.wentToOvertime,
      };
    }

    return {
      decided: true,
      winnerTeamId:
        match.homeScore > match.awayScore
          ? match.homeTeamId
          : match.awayTeamId,
      loserTeamId:
        match.homeScore > match.awayScore
          ? match.awayTeamId
          : match.homeTeamId,
      aggregateHomeGoals: match.homeScore,
      aggregateAwayGoals: match.awayScore,
      wentToOvertime: match.wentToOvertime,
    };
  }

  if (!firstLeg || !secondLeg) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals: 0,
      aggregateAwayGoals: 0,
      wentToOvertime: false,
    };
  }

  if (
    firstLeg.status !== 'finished' ||
    secondLeg.status !== 'finished' ||
    firstLeg.homeScore === null ||
    firstLeg.awayScore === null ||
    secondLeg.homeScore === null ||
    secondLeg.awayScore === null
  ) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals: 0,
      aggregateAwayGoals: 0,
      wentToOvertime: secondLeg.wentToOvertime,
    };
  }

  const teamA = firstLeg.homeTeamId;
  const teamB = firstLeg.awayTeamId;
  const teamAGoals = firstLeg.homeScore + secondLeg.awayScore;
  const teamBGoals = firstLeg.awayScore + secondLeg.homeScore;

  if (teamAGoals !== teamBGoals) {
    return {
      decided: true,
      winnerTeamId: teamAGoals > teamBGoals ? teamA : teamB,
      loserTeamId: teamAGoals > teamBGoals ? teamB : teamA,
      aggregateHomeGoals: teamAGoals,
      aggregateAwayGoals: teamBGoals,
      wentToOvertime: secondLeg.wentToOvertime,
    };
  }

  if (!secondLeg.wentToOvertime) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals: teamAGoals,
      aggregateAwayGoals: teamBGoals,
      wentToOvertime: false,
    };
  }

  if (secondLeg.homeScore === secondLeg.awayScore) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals: teamAGoals,
      aggregateAwayGoals: teamBGoals,
      wentToOvertime: true,
    };
  }

  const winnerTeamId =
    secondLeg.homeScore > secondLeg.awayScore
      ? secondLeg.homeTeamId
      : secondLeg.awayTeamId;

  const loserTeamId =
    winnerTeamId === secondLeg.homeTeamId
      ? secondLeg.awayTeamId
      : secondLeg.homeTeamId;

  return {
    decided: true,
    winnerTeamId,
    loserTeamId,
    aggregateHomeGoals: teamAGoals,
    aggregateAwayGoals: teamBGoals,
    wentToOvertime: true,
  };
}

export const playoffSeriesService = {
  getSeriesResult,
};
