'use client';

// ============================================================
// AuthProvider — Firebase Auth Context
// ============================================================
// Wraps the app tree. Provides user state, loading flag, and
// signOut to all client components via React context.
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { onAuthChange, signOut as firebaseSignOut, type User } from '@/lib/firebase/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = useCallback(async () => {
    // Clear the server-side session cookie first
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with client-side sign out even if cookie clear fails
    }
    // Sign out from Firebase client SDK
    await firebaseSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signOut: handleSignOut }),
    [user, loading, handleSignOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state in client components.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
