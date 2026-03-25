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
        console.log('🔐 Initializing authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          
          // Gérer spécifiquement les erreurs de stream body
          if (error.message && error.message.includes('body stream')) {
            console.error('⚠️ Body stream error - retrying once...');
            // Attendre un peu et réessayer une seule fois
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
              const retry = await supabase.auth.getSession();
              if (retry.data?.session?.user && mounted) {
                setUser(retry.data.session.user);
                await loadProfile(retry.data.session.user.id, mounted);
                return;
              }
            } catch (retryError) {
              console.error('❌ Retry failed:', retryError);
            }
          }
          
          if (mounted) setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ Session found for user:', session.user.email);
          if (mounted) {
            setUser(session.user);
            await loadProfile(session.user.id, mounted);
          }
        } else {
          console.log('ℹ️ No active session');
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error('❌ Unexpected error initializing auth:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
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
    if (!userId) {
      console.error('loadProfile called without userId');
      if (mounted) setLoading(false);
      return;
    }

    try {
      console.log('Loading profile for user:', userId);
      
      // Utiliser .maybeSingle() au lieu de .single() pour éviter les erreurs si pas de résultat
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // Ne pas throw, juste logger et continuer
        console.error('Error loading profile from Supabase:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Si l'erreur est une violation RLS ou table n'existe pas
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.error('❌ Table profiles inexistante ou RLS mal configurée');
          console.error('👉 Veuillez exécuter le script SQL de setup dans Supabase');
        }
        
        if (mounted) setLoading(false);
        return;
      }

      if (!data) {
        console.warn('No profile found for user:', userId);
        console.warn('👉 Le profil n\'existe pas dans la table profiles');
        if (mounted) setLoading(false);
        return;
      }

      console.log('✅ Profile loaded successfully:', data);
      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    } catch (error) {
      // Catch global pour toute autre erreur (network, parsing, etc.)
      console.error('❌ Unexpected error in loadProfile:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      if (error.message && error.message.includes('body stream')) {
        console.error('⚠️ Body stream error detected - This might be a network issue');
        console.error('Try refreshing the page or clearing your cache');
      }
      
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
