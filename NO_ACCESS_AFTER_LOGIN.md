# 🔍 Diagnostic : Impossible d'accéder à l'espace admin/étudiant après connexion

## 🐛 Symptômes

- ✅ L'authentification réussit (SIGNED_IN visible)
- ❌ Mais pas de redirection vers le dashboard
- ❌ Erreur : "Body has already been consumed"
- ❌ Ou : "No profile found"

---

## 🎯 Cause racine

**Le problème principal** : Le profil utilisateur n'existe pas dans la table `profiles`

**Pourquoi ?**
1. Les tables Supabase ne sont pas créées
2. Le trigger de création automatique du profil n'existe pas
3. Le profil n'a pas été créé lors de l'inscription

---

## ✅ Solution étape par étape

### Étape 1 : Vérifier que les tables existent

1. Allez sur https://supabase.com/dashboard/project/nxhrpfwpwbjbcdynpngx
2. Menu gauche → **Table Editor**
3. Vous devez voir ces tables :
   - ✅ `profiles`
   - ✅ `applications`
   - ✅ `universities`
   - ✅ `application_universities`
   - ✅ `documents`
   - ✅ `notifications`

**Si les tables n'existent pas :**
- Menu gauche → **SQL Editor**
- Copiez TOUT le contenu de `/app/supabase-quick-setup.sql`
- Collez et cliquez **RUN**

---

### Étape 2 : Vérifier votre profil

Dans **SQL Editor**, exécutez :

```sql
-- Voir tous les profils
SELECT * FROM public.profiles;
```

**Résultat attendu :** Vous devriez voir votre email

**Si vide ou votre profil n'existe pas**, passez à l'étape 3

---

### Étape 3 : Créer votre profil manuellement

#### A. Récupérer votre User ID

1. Menu gauche → **Authentication** → **Users**
2. Trouvez votre email
3. Copiez l'**User ID** (format : `47cac873-55c7-4592-9306-e7426fe8a700`)

#### B. Créer le profil

Dans **SQL Editor**, exécutez (remplacez les valeurs) :

```sql
-- Remplacez ces valeurs
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES (
  '47cac873-55c7-4592-9306-e7426fe8a700',  -- Votre User ID
  'mvkdan@gmail.com',                        -- Votre email
  'Votre',                                   -- Prénom
  'Nom',                                     -- Nom
  'student'                                  -- 'student' ou 'admin'
);
```

#### C. Créer l'application (pour les étudiants)

```sql
-- Remplacez l'User ID
INSERT INTO public.applications (user_id, status)
VALUES (
  '47cac873-55c7-4592-9306-e7426fe8a700',  -- Votre User ID
  'Nouveau'
);
```

---

### Étape 4 : Vérifier le trigger de création automatique

Pour que les futurs utilisateurs aient leur profil créé automatiquement, vérifiez que le trigger existe :

```sql
-- Vérifier si le trigger existe
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Si vide**, créez le trigger :

```sql
-- Créer la fonction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### Étape 5 : Tester la connexion

1. **Déconnectez-vous** de l'application
2. **Videz le cache** (Ctrl+Shift+R)
3. **Reconnectez-vous**
4. **Ouvrez F12** → Console
5. Vous devriez voir :
   ```
   🔐 Initializing authentication...
   ✅ Session found for user: votre@email.com
   Loading profile for user: abc-123...
   ✅ Profile loaded successfully
   ```

---

## 🧪 Checklist de vérification

- [ ] Tables Supabase créées (6 tables visibles)
- [ ] Profil existe dans `public.profiles`
- [ ] Application existe dans `public.applications` (pour étudiants)
- [ ] Trigger `on_auth_user_created` existe
- [ ] RLS policies activées
- [ ] Cache navigateur vidé
- [ ] Console (F12) ouverte pour voir les logs

---

## 🔧 Si l'erreur "Body has already been consumed" persiste

### Vérifier la connexion Supabase

Dans la console (F12), tapez :

```javascript
// Tester la connexion
const { data, error } = await supabase.from('profiles').select('count');
console.log('Test result:', { data, error });
```

**Résultat attendu :**
```javascript
{
  data: [{ count: 1 }],  // ou le nombre de profils
  error: null
}
```

**Si erreur :**
- Code `42P01` → Table n'existe pas
- Code `42501` → RLS mal configurée
- "Body consumed" → Problème de connexion réseau

### Vérifier les variables d'environnement

```bash
# Dans le frontend
cat /app/frontend/.env
```

Doit contenir :
```
REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🎯 Solution rapide : Script SQL complet

Si vous voulez tout refaire, exécutez ce script qui :
1. Crée votre profil
2. Crée votre application
3. Configure le trigger

```sql
-- 1. Créer votre profil (REMPLACEZ LES VALEURS)
INSERT INTO public.profiles (id, email, first_name, last_name, role)
VALUES (
  '47cac873-55c7-4592-9306-e7426fe8a700',  -- ⚠️ REMPLACER
  'mvkdan@gmail.com',                       -- ⚠️ REMPLACER
  'Votre',                                  -- ⚠️ REMPLACER
  'Nom',                                    -- ⚠️ REMPLACER
  'student'                                 -- 'student' ou 'admin'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Créer l'application (pour étudiants uniquement)
INSERT INTO public.applications (user_id, status)
VALUES (
  '47cac873-55c7-4592-9306-e7426fe8a700',  -- ⚠️ REMPLACER
  'Nouveau'
)
ON CONFLICT DO NOTHING;

-- 3. Créer le trigger pour les futurs utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Utilisateur'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ✅ Terminé ! Testez la connexion
```

---

## 📊 Logs de debug

Après correction, vous devriez voir dans F12 :

```
🔐 Initializing authentication...
✅ Session found for user: mvkdan@gmail.com
Loading profile for user: 47cac873-55c7-4592-9306-e7426fe8a700
✅ Profile loaded successfully: {
  id: "47cac873...",
  email: "mvkdan@gmail.com",
  role: "student",
  ...
}
```

---

## ⚠️ Note importante

**Les cookies `__cf_bm` rejetés** sont normaux - ce sont des cookies Cloudflare qui ne sont pas critiques.

Le vrai problème est : **"No profile found" ou "Body consumed"**

---

**💡 Besoin d'aide ?** 
Ouvrez F12 → Console, prenez une capture d'écran des erreurs et partagez-la !
