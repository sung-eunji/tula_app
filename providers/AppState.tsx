import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getCurrentUser } from '@/services/supabase';
import type { AppLanguage, User } from '@/types';

type AppStateContextValue = {
  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  user: User | null;
  setUser: (next: User | null) => void;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshUser = async () => {
    setAuthLoading(true);
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      user,
      setUser,
      authLoading,
      refreshUser,
    }),
    [authLoading, language, user],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
