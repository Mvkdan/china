# 🚨 Guide de résolution des problèmes

## Problème 1 : Tables manquantes dans Supabase

### Symptômes
- L'application ne fonctionne pas
- Erreurs de base de données dans la console
- "Table does not exist" ou similaire

### Solution : Exécuter le schéma SQL

#### Étape 1 : Ouvrir Supabase Dashboard
1. Allez sur : https://supabase.com/dashboard/project/nxhrpfwpwbjbcdynpngx
2. Connectez-vous avec votre compte Supabase

#### Étape 2 : Ouvrir le SQL Editor
1. Dans le menu de gauche, cliquez sur **"SQL Editor"** (icône <>)
2. Cliquez sur le bouton **"New query"** en haut à droite

#### Étape 3 : Copier le schéma SQL
1. Ouvrez le fichier `/app/supabase-schema.sql` sur votre machine locale
2. **Sélectionnez TOUT le contenu** du fichier (Ctrl+A ou Cmd+A)
3. **Copiez** (Ctrl+C ou Cmd+C)

#### Étape 4 : Exécuter le schéma
1. Retournez dans le SQL Editor de Supabase
2. **Collez** le contenu copié (Ctrl+V ou Cmd+V)
3. Cliquez sur le bouton **"RUN"** en bas à droite (ou Ctrl+Enter)
4. Attendez quelques secondes - vous devriez voir "Success. No rows returned"

#### Étape 5 : Vérifier que tout est créé
1. Dans le menu de gauche, cliquez sur **"Table Editor"**
2. Vous devriez maintenant voir ces tables :
   - ✅ `profiles`
   - ✅ `applications`
   - ✅ `universities` (avec 10 lignes de données)
   - ✅ `application_universities`
   - ✅ `documents`
   - ✅ `notifications`

#### Étape 6 : Créer le bucket Storage
1. Dans le menu de gauche, cliquez sur **"Storage"**
2. Cliquez sur **"Create a new bucket"**
3. Nom du bucket : `documents`
4. **Décochez** "Public bucket" (le bucket doit être privé)
5. Cliquez sur **"Create bucket"**

#### Étape 7 : Configurer les policies du bucket
1. Cliquez sur le bucket `documents` que vous venez de créer
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New policy"**
4. Sélectionnez **"For full customization"**
5. Ajoutez ces 4 policies (une par une) :

**Policy 1 : Students can upload**
```sql
CREATE POLICY "Students can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2 : Students can read**
```sql
CREATE POLICY "Students can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3 : Students can delete**
```sql
CREATE POLICY "Students can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 4 : Admins can manage all**
```sql
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

#### Étape 8 : Créer l'utilisateur admin
1. Dans le menu de gauche, cliquez sur **"Authentication"**
2. Cliquez sur **"Users"**
3. Cliquez sur **"Add user"** → **"Create new user"**
4. Remplissez :
   - Email : `admin@chinastudy.com`
   - Password : `admin123`
   - ✅ Cochez "Auto confirm user"
5. Cliquez sur **"Create user"**

6. **Maintenant, donnez-lui le rôle admin :**
   - Retournez dans **"SQL Editor"**
   - Exécutez cette commande :
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'admin@chinastudy.com';
   ```

---

## Problème 2 : Erreur HMR (Hot Module Replacement)

### Symptômes
```
ERROR
[HMR] Hot Module Replacement is disabled.
```

### Solution : Désactiver HMR

Le fichier `.env` a été mis à jour avec :
```env
WDS_SOCKET_PORT=0
FAST_REFRESH=false
```

**Redémarrez le serveur de développement :**
```bash
# Arrêtez le serveur actuel (Ctrl+C)
# Puis relancez :
cd /app/frontend
yarn start
```

---

## Problème 3 : L'application ne se connecte pas à Supabase

### Vérifiez les variables d'environnement

Le fichier `/app/frontend/.env` doit contenir :
```env
REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aHJwZndwd2JqYmNkeW5wbmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDYzODgsImV4cCI6MjA4OTg4MjM4OH0.pwiLCntG5ydY9xOmfawCp-Fo6FXRf9R4RI-2dCRGo-0
WDS_SOCKET_PORT=0
ENABLE_HEALTH_CHECK=false
FAST_REFRESH=false
```

**Si vous avez modifié le .env, redémarrez l'app !**

---

## ✅ Checklist finale

Avant de tester l'application, vérifiez que tout est fait :

- [ ] Schéma SQL exécuté dans Supabase SQL Editor
- [ ] 6 tables visibles dans Table Editor
- [ ] Bucket `documents` créé dans Storage
- [ ] 4 policies RLS configurées pour le bucket
- [ ] Utilisateur admin créé (admin@chinastudy.com)
- [ ] Rôle admin assigné (UPDATE profiles SET role = 'admin'...)
- [ ] Fichier `.env` configuré avec les bonnes variables
- [ ] Serveur de développement redémarré

---

## 🧪 Tester l'application

### Test 1 : Créer un étudiant
1. Ouvrez l'application : http://localhost:3000 (ou votre URL preview)
2. Cliquez sur "Créer un compte"
3. Remplissez le formulaire
4. Vérifiez que vous êtes redirigé vers le dashboard

### Test 2 : Connexion admin
1. Déconnectez-vous
2. Connectez-vous avec :
   - Email : `admin@chinastudy.com`
   - Password : `admin123`
3. Vous devriez voir le dashboard admin

### Test 3 : Assigner des universités
1. En tant qu'admin, cliquez sur un étudiant
2. Dans la sidebar droite, sélectionnez une université
3. Cliquez sur "Assigner"
4. Répétez pour assigner plusieurs universités
5. Vérifiez qu'elles s'affichent bien

---

## 🆘 Besoin d'aide ?

Si vous voyez encore des erreurs après avoir suivi toutes les étapes :

1. **Ouvrez la console du navigateur** (F12)
2. Regardez l'onglet **Console** pour les erreurs JavaScript
3. Regardez l'onglet **Network** pour les erreurs d'API
4. Partagez les messages d'erreur complets

**Erreurs courantes :**
- "relation does not exist" → Les tables n'ont pas été créées
- "RLS policy violation" → Les policies RLS ne sont pas correctes
- "Failed to fetch" → Variables d'environnement incorrectes
- "User not found" → L'admin n'a pas été créé ou le rôle n'est pas assigné
