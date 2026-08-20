import { Player, Position } from '@/types';
import { createSeededRandom, randomInt, hashStringToSeed } from '@/utils/random';
import { seedTeams } from './seedTeams';

const NAME_POOL = [
  'Carlos Medina', 'Andrés Poblete', 'Luis Farías', 'Mateo Corvalán', 'Simón Bravo',
  'Julián Vera', 'Emilio Rojas', 'Nicolás Paredes', 'Rodrigo Sáenz', 'Ignacio Lira',
  'Franco Meza', 'Bruno Castillo', 'Álvaro Nuñez', 'Damián Ortiz', 'Gonzalo Reyes',
  'Fabián Correa', 'Tomás Guzmán', 'Diego Salazar', 'Sebastián Vidal', 'Martín Fuentes',
  'Cristóbal Aravena', 'Tomás Herrera', 'Vicente Molina', 'Joaquín Espinoza', 'Felipe Cárdenas',
  'Agustín Bustos', 'Maximiliano Soto', 'Benjamín Torres', 'Renato Campos', 'Leandro Duarte',
  'Pablo Ibáñez', 'Tomás Alarcón', 'Iván Cortés', 'Ariel Sepúlveda', 'Cristian Vega',
  'Hernán Toledo', 'Patricio Leiva', 'Óscar Miranda', 'Ramiro Godoy', 'Esteban Prado',
  'Marcelo Riquelme', 'Facundo Ponce', 'Adrián Zambrano', 'Nolberto Salinas', 'Wilson Andrade',
  'Bastián Roa', 'Camilo Herrera', 'Enzo Villagra', 'Matías Contreras', 'Lucas Bahamondes',
  'Alonso Fierro', 'Yerko Alvarado', 'Kevin Sandoval', 'Erick Manríquez', 'Nelson Quiroz',
  'Gabriel Escobar', 'Antonio Serrano', 'Rafael Concha', 'Maximiliano Yáñez', 'Danilo Recabarren',
];

const ROSTER_POSITIONS: Position[] = [
  'Portero',
  'Defensa',
  'Defensa',
  'Mediocampista',
  'Mediocampista',
  'Delantero',
];

const ROSTER_NUMBERS = [1, 4, 5, 8, 10, 9];

function buildRoster(teamId: string, nameOffset: number, seed: number): Player[] {
  const rand = createSeededRandom(seed);

  return ROSTER_POSITIONS.map((position, index) => {
    const name = NAME_POOL[(nameOffset + index) % NAME_POOL.length];
    const gamesPlayed = randomInt(rand, 4, 9);
    const isAttacker = position === 'Delantero' || position === 'Mediocampista';

    return {
      id: `player-${teamId}-${index + 1}`,
      userId: null,
      teamId,
      name,
      position,
      jerseyNumber: ROSTER_NUMBERS[index],
      photoUrl: null,
      stats: {
        gamesPlayed,
        goals: isAttacker ? randomInt(rand, 1, 9) : randomInt(rand, 0, 2),
        assists: isAttacker ? randomInt(rand, 0, 6) : randomInt(rand, 0, 3),
        yellowCards: randomInt(rand, 0, 4),
        redCards: rand() > 0.85 ? 1 : 0,
        minutesPlayed: gamesPlayed * randomInt(rand, 60, 90),
        mvpAwards: randomInt(rand, 0, 3),
      },
    };
  });
}

export const seedPlayers: Player[] = seedTeams.flatMap((team, teamIndex) =>
  buildRoster(team.id, teamIndex * 6, hashStringToSeed(team.id)),
);

const captainPlayer = seedPlayers.find((player) => player.teamId === 'team-aguilas' && player.position === 'Delantero');
if (captainPlayer) {
  captainPlayer.userId = 'user-captain';
  captainPlayer.name = 'Diego Salazar';
}

const playerRolePlayer = seedPlayers.find((player) => player.teamId === 'team-lobos' && player.position === 'Mediocampista');
if (playerRolePlayer) {
  playerRolePlayer.userId = 'user-player';
  playerRolePlayer.name = 'Tomás Herrera';
}
