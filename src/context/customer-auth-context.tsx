'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { CustomerProfile } from '@/types/customer';

interface AuthContextType {
  user: User | null;
  customer: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  customer: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
  refreshCustomer: async () => {},
});

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (u: User) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', u.id)
        .single();
      if (!error) {
        setCustomer(data ?? null);
        return;
      }
      // Wait 1s before the retry on first failure
      if (attempt === 0) await new Promise<void>((r) => setTimeout(r, 1000));
    }
    // Both attempts failed — user is still authenticated, profile just unavailable
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsLoading(true);
        loadProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setUser(null);
        setCustomer(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    if (user) await loadProfile(user);
  };

  return (
    <AuthContext.Provider value={{
      user,
      customer,
      isAuthenticated: !!user,
      isLoading,
      logout,
      refreshCustomer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useCustomerAuth() {
  return useContext(AuthContext);
}
