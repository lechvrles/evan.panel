import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadEmployeeProfile = useCallback(async (userId) => {
    if (!userId) {
      setEmployee(null);
      return;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      setEmployee(null);
      return;
    }
    setEmployee(data);
  }, []);

  const refreshEmployee = useCallback(async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    if (current?.user?.id) {
      await loadEmployeeProfile(current.user.id);
    }
  }, [loadEmployeeProfile]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!active) return;
      setSession(initialSession);
      await loadEmployeeProfile(initialSession?.user?.id);
      if (active) setIsLoadingAuth(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      await loadEmployeeProfile(newSession?.user?.id);
      setIsLoadingAuth(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadEmployeeProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setEmployee(null);
  };

  const isAuthenticated = !!session?.user && !!employee;

  return (
    <AuthContext.Provider
      value={{
        session,
        employee,
        isAuthenticated,
        isLoadingAuth,
        logout,
        refreshEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
