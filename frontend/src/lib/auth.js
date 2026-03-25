import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId) => {
      if (!userId) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error('Error loading profile:', error.message);
          setLoading(false);
          return;
        }

        if (data) {
          setProfile(data);
        }
        setLoading(false);
      } catch (err) {
        console.error('Unexpected error in loadProfile:', err);
        if (mounted) setLoading(false);
      }
    };

    // Etape 1 : getSession() gere le chargement initial (refresh de page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Etape 2 : onAuthStateChange gere login / logout / token refresh
    // On ignore INITIAL_SESSION car getSession() s'en occupe deja
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;

      console.log('Auth event:', event, session?.user?.email);

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const register = async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role: 'student' }
      }
    });

    if (error) throw error;

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (data.user) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profileData) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            role: 'student'
          });
        }

        await supabase.from('applications').insert({
          user_id: data.user.id,
          status: 'Nouveau'
        });
      } catch (err) {
        console.error('Error in post-registration setup:', err);
      }
    }

    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    register,
    login,
    logout,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
