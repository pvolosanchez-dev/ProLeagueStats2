import { Match } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';

function readMatches(): Match[] {
  return storageService.getCollection<Match>(
    STORAGE_KEYS.matches,
    [],
  );
}

export interface PlayoffSeriesResult {
  decided: boolean;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  aggregateHomeGoals: number;
  aggregateAwayGoals: number;
  wentToOvertime: boolean;
}

export function getSeriesResult(
  seriesId: string,
): PlayoffSeriesResult {
  const matches = readMatches().filter(
    (match) =>
      match.playoffSeriesId ===
      seriesId,
  );

  if (matches.length === 0) {
    throw new Error(
      'Serie de playoff no encontrada.',
    );
  }

  const firstLeg = matches.find(
    (match) =>
      match.playoffLeg === 1,
  );

  const secondLeg = matches.find(
    (match) =>
      match.playoffLeg === 2,
  );

  /*
   * Partido único
   */
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
        wentToOvertime:
          match.wentToOvertime,
      };
    }

    if (
      match.homeScore ===
      match.awayScore
    ) {
      return {
        decided: false,
        winnerTeamId: null,
        loserTeamId: null,
        aggregateHomeGoals:
          match.homeScore,
        aggregateAwayGoals:
          match.awayScore,
        wentToOvertime:
          match.wentToOvertime,
      };
    }

    return {
      decided: true,
      winnerTeamId:
        match.homeScore >
        match.awayScore
          ? match.homeTeamId
          : match.awayTeamId,
      loserTeamId:
        match.homeScore >
        match.awayScore
          ? match.awayTeamId
          : match.homeTeamId,
      aggregateHomeGoals:
        match.homeScore,
      aggregateAwayGoals:
        match.awayScore,
      wentToOvertime:
        match.wentToOvertime,
    };
  }

  /*
   * Ida y vuelta
   */
  if (
    !firstLeg ||
    !secondLeg
  ) {
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
    firstLeg.status !==
      'finished' ||
    secondLeg.status !==
      'finished' ||
    firstLeg.homeScore ===
      null ||
    firstLeg.awayScore ===
      null ||
    secondLeg.homeScore ===
      null ||
    secondLeg.awayScore ===
      null
  ) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals: 0,
      aggregateAwayGoals: 0,
      wentToOvertime:
        secondLeg.wentToOvertime,
    };
  }

  const teamA =
    firstLeg.homeTeamId;

  const teamB =
    firstLeg.awayTeamId;

  const teamAGoals =
    firstLeg.homeScore +
    secondLeg.awayScore;

  const teamBGoals =
    firstLeg.awayScore +
    secondLeg.homeScore;

  /*
   * Global claramente decidido.
   */
  if (
    teamAGoals !==
    teamBGoals
  ) {
    return {
      decided: true,
      winnerTeamId:
        teamAGoals >
        teamBGoals
          ? teamA
          : teamB,
      loserTeamId:
        teamAGoals >
        teamBGoals
          ? teamB
          : teamA,
      aggregateHomeGoals:
        teamAGoals,
      aggregateAwayGoals:
        teamBGoals,
      wentToOvertime:
        secondLeg.wentToOvertime,
    };
  }

  /*
   * Global empatado.
   *
   * La serie solo puede decidirse
   * mediante tiempo extra en la vuelta.
   */
  if (
    !secondLeg.wentToOvertime
  ) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals:
        teamAGoals,
      aggregateAwayGoals:
        teamBGoals,
      wentToOvertime: false,
    };
  }

  /*
   * Si la vuelta tuvo OT,
   * el ganador de la vuelta gana
   * la serie.
   */
  if (
    secondLeg.homeScore ===
    secondLeg.awayScore
  ) {
    return {
      decided: false,
      winnerTeamId: null,
      loserTeamId: null,
      aggregateHomeGoals:
        teamAGoals,
      aggregateAwayGoals:
        teamBGoals,
      wentToOvertime: true,
    };
  }

  const winnerTeamId =
    secondLeg.homeScore >
    secondLeg.awayScore
      ? secondLeg.homeTeamId
      : secondLeg.awayTeamId;

  const loserTeamId =
    winnerTeamId ===
    secondLeg.homeTeamId
      ? secondLeg.awayTeamId
      : secondLeg.homeTeamId;

  return {
    decided: true,
    winnerTeamId,
    loserTeamId,
    aggregateHomeGoals:
      teamAGoals,
    aggregateAwayGoals:
      teamBGoals,
    wentToOvertime: true,
  };
}

export const playoffSeriesService = {
  getSeriesResult,
};