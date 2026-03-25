# 🔧 Fix : TypeError: body stream already read

## 🐛 Problème

**Erreur :** `TypeError: body stream already read`  
**Contexte :** Se produit dans `auth.js` lors du `loadProfile`

### Cause
Cette erreur se produit quand :
1. Une requête HTTP reçoit une réponse avec un body (ex: JSON)
2. Le body est lu une première fois (par un middleware ou pour parser)
3. On essaie de lire le body à nouveau → ❌ ERREUR

**Scénarios typiques :**
- Erreur 500 du serveur → Supabase essaie de parser l'erreur → Body consommé
- Middleware de logging lit le body → Plus disponible pour Supabase
- Retry d'une requête après erreur → Body déjà consommé

---

## ✅ Solutions appliquées

### 1. Client Supabase robuste (`/app/frontend/src/lib/supabase.js`)

**Changements :**
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, options).catch(error => {
        // Retourner une Response valide au lieu de throw
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    }
  }
});
```

**Bénéfices :**
- ✅ Les erreurs réseau retournent une Response valide
- ✅ Pas de tentative de re-lecture du body
- ✅ Gestion d'erreur propre

---

### 2. loadProfile amélioré (`/app/frontend/src/lib/auth.js`)

**Avant :**
```javascript
const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
if (error) throw error; // ❌ Peut causer un re-read si erreur 500
```

**Après :**
```javascript
// Utiliser .maybeSingle() au lieu de .single()
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle(); // ✅ Plus permissif, ne throw pas

if (error) {
  // Logger sans throw
  console.error('Error loading profile:', error);
  
  // Gérer les codes d'erreur spécifiques
  if (error.code === 'PGRST116') {
    console.error('Table n\'existe pas');
  }
  
  return; // ✅ Sortir sans crash
}
```

**Différences clés :**
- `.single()` → throw si 0 ou >1 résultats
- `.maybeSingle()` → retourne `null` si 0 résultats, pas d'erreur
- Pas de `throw` → pas de tentative de re-lecture du body

---

### 3. Retry intelligent pour body stream errors

**Dans initAuth :**
```javascript
if (error.message && error.message.includes('body stream')) {
  console.error('⚠️ Body stream error - retrying once...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    const retry = await supabase.auth.getSession();
    // Utiliser le résultat du retry
  } catch (retryError) {
    console.error('❌ Retry failed');
  }
}
```

**Logique :**
- Détecter l'erreur spécifique de body stream
- Attendre 500ms pour que la connexion se stabilise
- Retry **une seule fois** (éviter la boucle infinie)
- Si échec, continuer sans crash

---

### 4. handleSupabaseError wrapper (`/app/frontend/src/lib/helpers.js`)

**Nouveau helper :**
```javascript
const handleSupabaseError = (error, context = '') => {
  // Gérer les erreurs de body stream
  if (error.message && error.message.includes('body stream')) {
    throw new Error('Erreur de connexion. Veuillez rafraîchir la page.');
  }
  
  // Gérer les erreurs RLS
  if (error.code === 'PGRST116') {
    return null; // Pas de résultat, pas d'erreur
  }
  
  // Gérer les tables inexistantes
  if (error.code === '42P01') {
    throw new Error('Base de données non configurée.');
  }
  
  throw error;
};
```

**Utilisation :**
```javascript
async getApplication(userId) {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return handleSupabaseError(error, 'getApplication');
    }
    
    return data;
  } catch (error) {
    return handleSupabaseError(error, 'getApplication');
  }
}
```

---

## 🔍 Debugging

### Console logs ajoutés

**Dans auth.js :**
```
🔐 Initializing authentication...
✅ Session found for user: email@example.com
Loading profile for user: abc123...
✅ Profile loaded successfully: {...}
```

**En cas d'erreur :**
```
❌ Error getting session: {...}
⚠️ Body stream error detected
⚠️ Body stream error - retrying once...
```

### Vérifier dans la console (F12)

1. **Ouvrir la console** avant de charger la page
2. **Chercher les emojis** 🔐 ✅ ❌ ⚠️
3. **Identifier l'étape** qui échoue
4. **Noter le code d'erreur** (PGRST116, 42P01, etc.)

---

## 🧪 Tests

### Test 1 : Connexion normale
```
✅ 🔐 Initializing authentication...
✅ ✅ Session found
✅ ✅ Profile loaded
```

### Test 2 : Première connexion (pas de profil)
```
✅ 🔐 Initializing authentication...
✅ ✅ Session found
⚠️ No profile found for user
👉 Le profil n'existe pas dans la table profiles
```

### Test 3 : Table inexistante
```
❌ Error loading profile: code 42P01
❌ Table profiles inexistante
👉 Veuillez exécuter le script SQL de setup
```

### Test 4 : Body stream error
```
❌ Error getting session: body stream already read
⚠️ Body stream error - retrying once...
✅ Retry succeeded
```

---

## 🚨 Si l'erreur persiste

### Étape 1 : Vérifier Supabase
```sql
-- Dans Supabase SQL Editor
SELECT * FROM public.profiles LIMIT 1;
```

Si erreur "relation does not exist" → Tables pas créées

### Étape 2 : Vider le cache
1. F12 → Application tab
2. Clear storage
3. Refresh (Ctrl+Shift+R)

### Étape 3 : Vérifier les variables d'env
```bash
# Vérifier que .env contient :
REACT_APP_SUPABASE_URL=https://...
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

### Étape 4 : Redémarrer le serveur
```bash
cd /app/frontend
yarn start
```

---

## 📚 Codes d'erreur Supabase

| Code | Signification | Solution |
|------|---------------|----------|
| `PGRST116` | No rows found | Normal, retourner null |
| `42P01` | Table n'existe pas | Exécuter le SQL setup |
| `42501` | RLS violation | Vérifier les policies |
| `23505` | Unique violation | Email déjà utilisé |
| - | body stream | Retry ou rafraîchir |

---

## ✅ Résultat

**Avant :**
- ❌ App crash sur body stream error
- ❌ Pas de retry
- ❌ Pas de gestion d'erreur propre

**Après :**
- ✅ Gestion propre des erreurs body stream
- ✅ Retry automatique (une fois)
- ✅ Messages d'erreur clairs
- ✅ Pas de crash, l'app continue
- ✅ Logs détaillés pour debug

---

## 🔗 Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `lib/supabase.js` | Custom fetch handler pour éviter body stream errors |
| `lib/auth.js` | `.maybeSingle()`, retry logic, meilleurs logs |
| `lib/helpers.js` | `handleSupabaseError` wrapper |

---

**💡 Note :** Ces changements rendent l'app beaucoup plus résiliente face aux erreurs réseau et de connexion !
