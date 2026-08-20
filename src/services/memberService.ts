import { LeagueMember, Role } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedMembers } from '@/data';

function readMembers(): LeagueMember[] {
  return storageService.getCollection<LeagueMember>(STORAGE_KEYS.members, seedMembers);
}

function writeMembers(members: LeagueMember[]): void {
  storageService.setItem(STORAGE_KEYS.members, members);
}

async function getMembersByLeague(leagueId: string): Promise<LeagueMember[]> {
  return readMembers().filter((m) => m.leagueId === leagueId);
}

async function getMemberByUser(leagueId: string, userId: string): Promise<LeagueMember | null> {
  return readMembers().find((m) => m.leagueId === leagueId && m.userId === userId) ?? null;
}

async function getMembershipsByUser(userId: string): Promise<LeagueMember[]> {
  return readMembers().filter((m) => m.userId === userId);
}

function createMember(leagueId: string, userId: string, role: Role, teamId: string | null = null): LeagueMember {
  const members = readMembers();
  const existing = members.find((m) => m.leagueId === leagueId && m.userId === userId);
  if (existing) return existing;

  const member: LeagueMember = {
    id: `member-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    leagueId,
    userId,
    role,
    teamId,
    status: 'active',
    joinedAt: new Date().toISOString(),
  };
  writeMembers([...members, member]);
  return member;
}

function updateMemberRole(leagueId: string, userId: string, role: Role): LeagueMember | null {
  const members = readMembers();
  let updated: LeagueMember | null = null;
  const next = members.map((m) => {
    if (m.leagueId === leagueId && m.userId === userId) {
      updated = { ...m, role };
      return updated;
    }
    return m;
  });
  writeMembers(next);
  return updated;
}

function updateMemberTeam(leagueId: string, userId: string, teamId: string | null): LeagueMember | null {
  const members = readMembers();
  let updated: LeagueMember | null = null;
  const next = members.map((m) => {
    if (m.leagueId === leagueId && m.userId === userId) {
      updated = { ...m, teamId };
      return updated;
    }
    return m;
  });
  writeMembers(next);
  return updated;
}

function expelMember(leagueId: string, userId: string): void {
  const members = readMembers();
  const next = members.map((m) => {
    if (m.leagueId === leagueId && m.userId === userId && m.role !== 'owner') {
      return { ...m, status: 'expelled' as const };
    }
    return m;
  });
  writeMembers(next);
}

function removeMember(leagueId: string, userId: string): void {
  writeMembers(readMembers().filter((m) => !(m.leagueId === leagueId && m.userId === userId)));
}

export const memberService = {
  getMembersByLeague,
  getMemberByUser,
  getMembershipsByUser,
  createMember,
  updateMemberRole,
  updateMemberTeam,
  expelMember,
  removeMember,
};
