import {
  LoginCredentials,
  RegisterData,
  Session,
  StoredUser,
  User,
} from '@/types';
import { storageService } from './storageService';
import { STORAGE_KEYS } from './storageKeys';
import { seedUsers } from '@/data';

const SESSION_KEY =
  'proleaguestats:session';

function getSession(): Session | null {
  try {
    const raw =
      sessionStorage.getItem(
        SESSION_KEY,
      );

    return raw
      ? (JSON.parse(raw) as Session)
      : null;
  } catch {
    return null;
  }
}

function setSession(
  session: Session,
): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

function clearSession(): void {
  sessionStorage.removeItem(
    SESSION_KEY,
  );
}

function readUsers(): StoredUser[] {
  return storageService.getCollection<StoredUser>(
    STORAGE_KEYS.users,
    seedUsers,
  );
}

function writeUsers(
  users: StoredUser[],
): void {
  storageService.setItem(
    STORAGE_KEYS.users,
    users,
  );
}

function toPublicUser(
  user: StoredUser,
): User {
  const {
    password,
    ...publicUser
  } = user;

  return publicUser;
}

async function getCurrentUser(): Promise<User | null> {
  const session = getSession();

  if (!session) {
    return null;
  }

  const user = readUsers().find(
    (candidate) =>
      candidate.id === session.userId,
  );

  return user
    ? toPublicUser(user)
    : null;
}

async function login({
  email,
  password,
}: LoginCredentials): Promise<User> {
  const user = readUsers().find(
    (candidate) =>
      candidate.email
        .toLowerCase() ===
        email.trim().toLowerCase(),
  );

  if (
    !user ||
    user.password !== password
  ) {
    throw new Error(
      'Correo o contraseña incorrectos.',
    );
  }

  setSession({
    userId: user.id,
  });

  return toPublicUser(user);
}

async function register({
  name,
  email,
  password,
}: RegisterData): Promise<User> {
  const users = readUsers();

  const normalizedEmail =
    email.trim().toLowerCase();

  if (
    users.some(
      (candidate) =>
        candidate.email.toLowerCase() ===
        normalizedEmail,
    )
  ) {
    throw new Error(
      'Ya existe una cuenta registrada con ese correo.',
    );
  }

  const cleanName =
    name.trim();

  if (!cleanName) {
    throw new Error(
      'Debes indicar tu nombre.',
    );
  }

  /*
   * Generar username automáticamente
   * a partir del nombre.
   */
  const baseUsername =
    cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /[^a-z0-9_]/g,
        '',
      )
      .slice(0, 16) ||
    'usuario';

  let username =
    baseUsername;

  let counter = 1;

  while (
    users.some(
      (candidate) =>
        candidate.username ===
        username,
    )
  ) {
    username =
      `${baseUsername}${counter}`;

    counter++;
  }

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: cleanName,
    username,
    email: normalizedEmail,
    password,
    avatarColor: '#0ea5e9',
    avatarUrl: null,
    profileGifUrl: null,
    createdAt:
      new Date().toISOString(),
  };

  writeUsers([
    ...users,
    newUser,
  ]);

  setSession({
    userId: newUser.id,
  });

  return toPublicUser(
    newUser,
  );
}

async function logout(): Promise<void> {
  clearSession();
}

async function loginAsDemo(
  email: string,
): Promise<User> {
  return login({
    email,
    password: 'demo1234',
  });
}

async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      User,
      | 'name'
      | 'username'
      | 'avatarUrl'
      | 'avatarColor'
      | 'profileGifUrl'
    >
  >,
): Promise<User> {
  const users = readUsers();

  const user = users.find(
    (candidate) =>
      candidate.id === userId,
  );

  if (!user) {
    throw new Error(
      'Usuario no encontrado.',
    );
  }

  /*
   * Validar nombre.
   */
  if (
    updates.name !== undefined
  ) {
    const name =
      updates.name.trim();

    if (!name) {
      throw new Error(
        'El nombre no puede estar vacío.',
      );
    }

    if (name.length > 40) {
      throw new Error(
        'El nombre no puede superar 40 caracteres.',
      );
    }

    updates = {
      ...updates,
      name,
    };
  }

  /*
   * Validar username.
   */
  if (
    updates.username !==
    undefined
  ) {
    const username =
      updates.username
        .trim()
        .toLowerCase();

    if (
      username.length < 3
    ) {
      throw new Error(
        'El nombre de usuario debe tener al menos 3 caracteres.',
      );
    }

    if (
      username.length > 20
    ) {
      throw new Error(
        'El nombre de usuario no puede superar 20 caracteres.',
      );
    }

    if (
      !/^[a-z0-9_]+$/.test(
        username,
      )
    ) {
      throw new Error(
        'El nombre de usuario solo puede contener letras, números y guiones bajos.',
      );
    }

    const usernameTaken =
      users.some(
        (candidate) =>
          candidate.id !== userId &&
          candidate.username ===
            username,
      );

    if (usernameTaken) {
      throw new Error(
        'Ese nombre de usuario ya está ocupado.',
      );
    }

    updates = {
      ...updates,
      username,
    };
  }

  /*
   * Limitar la bio si posteriormente
   * se agrega al modelo.
   */
  if (
    'bio' in updates &&
    typeof (
      updates as Record<
        string,
        unknown
      >
    ).bio === 'string'
  ) {
    const bio = (
      updates as Record<
        string,
        unknown
      >
    ).bio as string;

    if (bio.length > 160) {
      throw new Error(
        'La biografía no puede superar 160 caracteres.',
      );
    }
  }

  const updated: StoredUser = {
    ...user,
    ...updates,
  };

  writeUsers(
    users.map(
      (candidate) =>
        candidate.id === userId
          ? updated
          : candidate,
    ),
  );

  return toPublicUser(
    updated,
  );
}

async function getUserById(
  id: string,
): Promise<User | null> {
  const user = readUsers().find(
    (candidate) =>
      candidate.id === id,
  );

  return user
    ? toPublicUser(user)
    : null;
}

async function getUsersByIds(
  ids: string[],
): Promise<User[]> {
  const users = readUsers();

  return users
    .filter((user) =>
      ids.includes(user.id),
    )
    .map(toPublicUser);
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