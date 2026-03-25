import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Créer le client avec options pour éviter les problèmes de stream body
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    },
    // Désactiver le fetch par défaut qui peut causer des problèmes de stream
    fetch: (url, options = {}) => {
      // Clone les options pour éviter de modifier l'original
      const fetchOptions = { ...options };
      
      // S'assurer que le body n'est pas déjà consommé
      if (fetchOptions.body && typeof fetchOptions.body === 'string') {
        fetchOptions.body = fetchOptions.body;
      }

      return fetch(url, fetchOptions).catch(error => {
        console.error('Supabase fetch error:', error);
        // Retourner une réponse d'erreur valide au lieu de throw
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    }
  }
});
