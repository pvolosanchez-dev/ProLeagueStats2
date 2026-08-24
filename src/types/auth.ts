export type Role =
  | 'owner'
  | 'admin'
  | 'captain'
  | 'player';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatarColor: string;
  avatarUrl: string | null;
profileGifUrl: string | null;
  createdAt: string;
}

export interface StoredUser extends User {
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface Session {
  userId: string;
}