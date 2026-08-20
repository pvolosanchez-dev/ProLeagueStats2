import { useCallback, useEffect, useState } from 'react';
import { User } from '@/types';
import { authService } from '@/services';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authService.getCurrentUser().then((currentUser) => {
      if (active) {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedInUser = await authService.login({ email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const newUser = await authService.register({ name, email, password });
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const loginAsDemo = useCallback(async (email: string) => {
    const demoUser = await authService.loginAsDemo(email);
    setUser(demoUser);
    return demoUser;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Pick<User, 'name' | 'avatarUrl' | 'avatarColor'>>) => {
    if (!user) return;
    const updated = await authService.updateProfile(user.id, updates);
    setUser(updated);
    return updated;
  }, [user]);

  return { user, loading, login, register, logout, loginAsDemo, updateProfile };
}
