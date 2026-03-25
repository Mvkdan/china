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

    // Vérifier la session au chargement
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user) {
          if (mounted) {
            setUser(session.user);
            await loadProfile(session.user.id, mounted);
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        if (mounted) {
          setUser(session.user);
          await loadProfile(session.user.id, mounted);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId, mounted = true) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        throw error;
      }

      console.log('Profile loaded:', data);
      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error in loadProfile:', error);
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const register = async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: 'student'
        }
      }
    });

    if (error) throw error;

    // Créer l'application vide pour l'étudiant
    if (data.user) {
      const { error: appError } = await supabase
        .from('applications')
        .insert({
          user_id: data.user.id,
          status: 'Nouveau'
        });

      if (appError) console.error('Error creating application:', appError);
    }

    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

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
