import { LoginCredentials, RegisterData, Session, StoredUser, User } from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedUsers } from '@/data';

function readUsers(): StoredUser[] {
  return storageService.getCollection<StoredUser>(STORAGE_KEYS.users, seedUsers);
}

function writeUsers(users: StoredUser[]): void {
  storageService.setItem(STORAGE_KEYS.users, users);
}

function toPublicUser(user: StoredUser): User {
  const { password, ...publicUser } = user;
  return publicUser;
}

async function getCurrentUser(): Promise<User | null> {
  const session = storageService.getItem<Session | null>(STORAGE_KEYS.session, null);
  if (!session) return null;
  const user = readUsers().find((candidate) => candidate.id === session.userId);
  return user ? toPublicUser(user) : null;
}

async function login({ email, password }: LoginCredentials): Promise<User> {
  const user = readUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    throw new Error('Correo o contraseña incorrectos.');
  }
  storageService.setItem<Session>(STORAGE_KEYS.session, { userId: user.id });
  return toPublicUser(user);
}

async function register({ name, email, password }: RegisterData): Promise<User> {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();
  if (users.some((candidate) => candidate.email.toLowerCase() === normalizedEmail)) {
    throw new Error('Ya existe una cuenta registrada con ese correo.');
  }
  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    password,
    avatarColor: '#0ea5e9',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
  writeUsers([...users, newUser]);
  storageService.setItem<Session>(STORAGE_KEYS.session, { userId: newUser.id });
  return toPublicUser(newUser);
}

async function logout(): Promise<void> {
  storageService.removeItem(STORAGE_KEYS.session);
}

async function loginAsDemo(email: string): Promise<User> {
  return login({ email, password: 'demo1234' });
}

async function updateProfile(userId: string, updates: Partial<Pick<User, 'name' | 'avatarUrl' | 'avatarColor'>>): Promise<User> {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) throw new Error('Usuario no encontrado.');
  const updated = { ...user, ...updates };
  writeUsers(users.map((u) => (u.id === userId ? updated : u)));
  return toPublicUser(updated);
}

async function getUserById(id: string): Promise<User | null> {
  const user = readUsers().find((u) => u.id === id);
  return user ? toPublicUser(user) : null;
}

async function getUsersByIds(ids: string[]): Promise<User[]> {
  const users = readUsers();
  return users.filter((u) => ids.includes(u.id)).map(toPublicUser);
}

export const authService = {
  getCurrentUser,
  login,
  register,
  logout,
  loginAsDemo,
  updateProfile,
  getUserById,
  getUsersByIds,
};
