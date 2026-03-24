# 🚀 Guide de démarrage RAPIDE - 5 minutes

## ⚠️ Vous avez ces erreurs ?
- Tables manquantes dans Supabase
- Erreur HMR dans l'application

## ✅ Solution en 5 étapes

### 📍 Étape 1 : Exécuter le SQL (2 min)

1. Ouvrez https://supabase.com/dashboard/project/nxhrpfwpwbjbcdynpngx
2. Menu gauche → **SQL Editor** → **New query**
3. Ouvrez `/app/supabase-quick-setup.sql` sur votre machine
4. **Copiez TOUT** et collez dans l'éditeur
5. Cliquez **RUN** ✅

**Vérification :** Menu gauche → **Table Editor** → Vous devez voir 6 tables

---

### 📍 Étape 2 : Créer le bucket Storage (1 min)

1. Menu gauche → **Storage**
2. Cliquez **Create a new bucket**
3. Nom : `documents`
4. **Décochez** "Public bucket"
5. **Create bucket**

---

### 📍 Étape 3 : Policies Storage (1 min)

1. Cliquez sur le bucket `documents`
2. Onglet **Policies** → **New policy** → **For full customization**

**Ajoutez ces 4 policies (copiez-collez une par une) :**

```sql
-- Policy 1
CREATE POLICY "Students can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 2
CREATE POLICY "Students can read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 3
CREATE POLICY "Students can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy 4
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'documents' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

### 📍 Étape 4 : Créer l'admin (1 min)

1. Menu gauche → **Authentication** → **Users**
2. **Add user** → **Create new user**
   - Email: `admin@chinastudy.com`
   - Password: `admin123`
   - ✅ Cochez "Auto confirm user"
3. **Create user**

4. Menu gauche → **SQL Editor** → **New query**
5. Exécutez :
```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@chinastudy.com';
```

---

### 📍 Étape 5 : Redémarrer l'app (30 sec)

```bash
# Arrêtez le serveur (Ctrl+C)
cd /app/frontend
yarn start
```

---

## ✅ Checklist finale

- [ ] 6 tables dans Table Editor
- [ ] Bucket `documents` créé
- [ ] 4 policies Storage configurées
- [ ] Admin créé et rôle assigné
- [ ] Serveur redémarré

---

## 🧪 Test rapide

### Tester l'inscription étudiant
1. Allez sur votre app
2. Créer un compte → Remplissez
3. Vous devez voir le dashboard étudiant ✅

### Tester la connexion admin
1. Déconnectez-vous
2. Email: `admin@chinastudy.com`, Password: `admin123`
3. Vous devez voir le dashboard admin ✅

### Tester multi-universités
1. En tant qu'admin, cliquez sur un étudiant
2. Sidebar droite → Sélectionnez université → **Assigner**
3. Répétez pour en assigner plusieurs
4. Elles doivent s'afficher ✅

---

## 🐛 Ça ne marche toujours pas ?

Ouvrez la **Console du navigateur** (F12) et regardez les erreurs.

**Erreurs fréquentes :**

| Erreur | Solution |
|--------|----------|
| "relation does not exist" | Retournez à l'étape 1 |
| "RLS policy violation" | Retournez à l'étape 3 |
| "User not found" | Retournez à l'étape 4 |
| "Failed to fetch" | Vérifiez `/app/frontend/.env` |

---

## 📚 Besoin de plus de détails ?

Consultez `/app/TROUBLESHOOTING.md` pour le guide complet.
