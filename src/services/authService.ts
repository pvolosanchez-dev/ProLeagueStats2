import {
  LoginCredentials,
  RegisterData,
  User,
} from '@/types';
import { supabase } from '@/lib/supabaseClient';

type ProfileRow = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  bio: string | null;
  avatar_color: string;
  avatar_url: string | null;
  profile_gif_url: string | null;
  created_at: string;
};

function mapProfile(profile: ProfileRow): User {
  return {
    id: profile.id,
    name: profile.name,
    username: profile.username,
    email: profile.email ?? '',
    bio: profile.bio ?? '',
    avatarColor: profile.avatar_color,
    avatarUrl: profile.avatar_url,
    profileGifUrl: profile.profile_gif_url,
    createdAt: profile.created_at,
  };
}

async function getProfileById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,username,email,bio,avatar_color,avatar_url,profile_gif_url,created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data as ProfileRow) : null;
}

async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return getProfileById(data.user.id);
}

async function login({
  email,
  password,
}: LoginCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    throw new Error(
      error?.message ?? 'Correo o contraseña incorrectos.',
    );
  }

  const profile = await getProfileById(data.user.id);

  if (!profile) {
    throw new Error('La cuenta no tiene un perfil configurado.');
  }

  return profile;
}

async function register({
  name,
  email,
  password,
}: RegisterData): Promise<User> {
  const cleanName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!cleanName) {
    throw new Error('Debes indicar tu nombre.');
  }

  if (cleanName.length > 40) {
    throw new Error('El nombre no puede superar 40 caracteres.');
  }

  const baseUsername =
    cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 16) || 'usuario';

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        name: cleanName,
        username: baseUsername,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('No se pudo crear la cuenta.');
  }

  if (!data.session) {
    throw new Error(
      'Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.',
    );
  }

  const profile = await getProfileById(data.user.id);

  if (!profile) {
    throw new Error('La cuenta se creó pero no se pudo crear el perfil.');
  }

  return profile;
}

async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

async function loginAsDemo(_email: string): Promise<User> {
  throw new Error(
    'Las cuentas de demostración todavía no están migradas a Supabase.',
  );
}

async function updateProfile(
  userId: string,
  updates: Partial<
    Pick<
      User,
      'name' | 'username' | 'avatarUrl' | 'avatarColor' | 'profileGifUrl'
    >
  >,
): Promise<User> {
  const payload: Record<string, string | null> = {};

  if (updates.name !== undefined) {
    const name = updates.name.trim();

    if (!name) {
      throw new Error('El nombre no puede estar vacío.');
    }

    if (name.length > 40) {
      throw new Error('El nombre no puede superar 40 caracteres.');
    }

    payload.name = name;
  }

  if (updates.username !== undefined) {
    const username = updates.username.trim().toLowerCase();

    if (username.length < 3 || username.length > 20) {
      throw new Error('El nombre de usuario debe tener entre 3 y 20 caracteres.');
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      throw new Error(
        'El nombre de usuario solo puede contener letras, números y guiones bajos.',
      );
    }

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      throw new Error('Ese nombre de usuario ya está ocupado.');
    }

    payload.username = username;
  }

  if (updates.avatarUrl !== undefined) {
    payload.avatar_url = updates.avatarUrl;
  }

  if (updates.avatarColor !== undefined) {
    payload.avatar_color = updates.avatarColor;
  }

  if (updates.profileGifUrl !== undefined) {
    payload.profile_gif_url = updates.profileGifUrl;
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('id,name,username,email,bio,avatar_color,avatar_url,profile_gif_url,created_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'No se pudo actualizar el perfil.');
  }

  return mapProfile(data as ProfileRow);
}

async function getUserById(id: string): Promise<User | null> {
  return getProfileById(id);
}

async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,username,email,bio,avatar_color,avatar_url,profile_gif_url,created_at')
    .in('id', ids);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((profile) =>
    mapProfile(profile as ProfileRow),
  );
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
