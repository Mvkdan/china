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
          console.error('❌ Error getting session:', error.message);
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
        console.error('❌ Unexpected error initializing auth:', error.message);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user && mounted) {
        setUser(session.user);
        await loadProfile(session.user.id, mounted);
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
      
      // Utiliser try-catch pour capturer toutes les erreurs possibles
      let data = null;
      let error = null;
      
      try {
        const result = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      } catch (fetchError) {
        // Capturer les erreurs de fetch/network
        console.error('❌ Network error during profile fetch:', fetchError);
        
        if (fetchError.message && (fetchError.message.includes('body') || fetchError.message.includes('Body'))) {
          console.error('⚠️ Body consumption error detected');
          console.error('This usually means the Supabase tables are not set up correctly');
          console.error('👉 Please run the SQL setup script in Supabase');
        }
        
        if (mounted) setLoading(false);
        return;
      }

      if (error) {
        console.error('Error loading profile from Supabase:', {
          message: error.message,
          code: error.code
        });
        
        if (error.code === 'PGRST116') {
          console.error('❌ No profile found');
        } else if (error.code === '42P01') {
          console.error('❌ Table profiles does not exist');
          console.error('👉 Please run: /app/supabase-quick-setup.sql');
        }
        
        if (mounted) setLoading(false);
        return;
      }

      if (!data) {
        console.warn('⚠️ No profile found for user:', userId);
        console.warn('👉 The profile might not exist in the profiles table');
        if (mounted) setLoading(false);
        return;
      }

      console.log('✅ Profile loaded successfully:', data);
      if (mounted) {
        setProfile(data);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Unexpected error in loadProfile:', error);
      
      if (mounted) {
        setLoading(false);
      }
    }
  };

  const register = async (email, password, firstName, lastName) => {
    console.log('📝 Registering new user:', email);
    
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

    if (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }

    console.log('✅ User registered:', data.user?.email);

    // Attendre un peu que le trigger Supabase crée le profil
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Créer l'application vide pour l'étudiant si l'utilisateur est créé
    if (data.user) {
      try {
        // Vérifier si le profil existe
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profileData && !profileError) {
          console.log('⚠️ Profile not created by trigger, creating manually...');
          
          // Créer le profil manuellement
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              first_name: firstName,
              last_name: lastName,
              role: 'student'
            });

          if (insertError) {
            console.error('❌ Error creating profile manually:', insertError);
          } else {
            console.log('✅ Profile created manually');
          }
        }

        // Créer l'application
        const { error: appError } = await supabase
          .from('applications')
          .insert({
            user_id: data.user.id,
            status: 'Nouveau'
          });

        if (appError) {
          console.error('❌ Error creating application:', appError);
        } else {
          console.log('✅ Application created');
        }
      } catch (err) {
        console.error('❌ Error in post-registration setup:', err);
      }
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
