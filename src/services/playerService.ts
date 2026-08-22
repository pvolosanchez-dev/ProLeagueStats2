import { Player, Position } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedPlayers } from '@/data';

function readPlayers(): Player[] {
  return storageService.getCollection<Player>(STORAGE_KEYS.players, seedPlayers);
}

function writePlayers(players: Player[]): void {
  storageService.setItem(STORAGE_KEYS.players, players);
}

async function getPlayers(): Promise<Player[]> {
  return readPlayers();
}

async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  return readPlayers().filter((player) => player.teamId === teamId);
}

async function getPlayersByLeague(leagueId: string, teams: { id: string; leagueId: string }[]): Promise<Player[]> {
  const leagueTeamIds = teams.filter((t) => t.leagueId === leagueId).map((t) => t.id);
  return readPlayers().filter((p) => leagueTeamIds.includes(p.teamId));
}

async function getPlayerById(id: string): Promise<Player | null> {
  return readPlayers().find((player) => player.id === id) ?? null;
}

interface NewPlayerInput {
  teamId: string;
  userId?: string | null;
  name: string;
  position: Position;
  jerseyNumber: number;
  photoUrl?: string | null;
}

async function addPlayer(input: NewPlayerInput): Promise<Player> {
  const players = readPlayers();
  const newPlayer: Player = {
    id: `player-${Date.now()}`,
    userId: input.userId ?? null,
    teamId: input.teamId,
    name: input.name.trim(),
    position: input.position,
    jerseyNumber: input.jerseyNumber,
    photoUrl: input.photoUrl ?? null,
    stats: {
      gamesPlayed: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      minutesPlayed: 0,
      mvpAwards: 0,
    },
  };
  writePlayers([...players, newPlayer]);
  return newPlayer;
}

async function updatePlayer(
  id: string,
  updates: Partial<Player>,
): Promise<Player> {
  const players = readPlayers();

  const player = players.find(
    (p) => p.id === id,
  );

  if (!player) {
    throw new Error('Jugador no encontrado.');
  }

  const updated: Player = {
    ...player,
    ...updates,
    id: player.id,
  };

  writePlayers(
    players.map((p) =>
      p.id === id ? updated : p,
    ),
  );

  return updated;
}

async function removePlayer(id: string): Promise<void> {
  writePlayers(readPlayers().filter((player) => player.id !== id));
}

async function getPlayersByLeagueDirect(leagueId: string, allTeams: { id: string; leagueId: string }[]): Promise<Player[]> {
  return getPlayersByLeague(leagueId, allTeams);
}

export const playerService = {
  getPlayers,
  getPlayersByTeam,
  getPlayersByLeague: getPlayersByLeagueDirect,
  getPlayerById,
  addPlayer,
  updatePlayer,
  removePlayer,
};
