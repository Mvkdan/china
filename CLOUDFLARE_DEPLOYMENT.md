# 🚀 Guide de déploiement ChinaStudy sur Cloudflare Pages

## 📋 Prérequis

1. **Compte Supabase** : Créé et configuré
2. **Compte Cloudflare** : Avec accès à Cloudflare Pages
3. **Git Repository** : Code source de l'application

---

## 🗄️ Étape 1 : Configuration de Supabase

### 1.1 Exécuter le schéma SQL

1. Connectez-vous à votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (menu de gauche)
4. Copiez tout le contenu du fichier `/supabase-schema.sql`
5. Collez-le dans l'éditeur SQL
6. Cliquez sur **Run** pour exécuter

Cela créera :
- ✅ Tables : `profiles`, `applications`, `universities`, `application_universities`, `documents`, `notifications`
- ✅ Row Level Security (RLS) policies
- ✅ Triggers automatiques
- ✅ Indexes pour performance
- ✅ Données de test (10 universités)

### 1.2 Configurer le Storage

1. Dans le dashboard Supabase, allez dans **Storage** (menu de gauche)
2. Cliquez sur **Create bucket**
3. Nom du bucket : `documents`
4. **Public bucket** : Décoché (privé)
5. Cliquez sur **Create bucket**

#### Configurer les politiques RLS pour le bucket

6. Cliquez sur le bucket `documents` → **Policies**
7. Ajoutez les politiques suivantes :

**Policy 1 : Students can upload their own documents**
```sql
CREATE POLICY "Students can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2 : Students can read their own documents**
```sql
CREATE POLICY "Students can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3 : Students can delete their own documents**
```sql
CREATE POLICY "Students can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 4 : Admins can manage all documents**
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

### 1.3 Créer un utilisateur admin

1. Dans le dashboard Supabase, allez dans **Authentication** → **Users**
2. Cliquez sur **Add user** → **Create new user**
3. Remplissez :
   - Email : `admin@chinastudy.com`
   - Password : `admin123` (changez-le en production !)
   - Auto confirm user : **Coché**
4. Cliquez sur **Create user**

5. **Important** : Mettre à jour le rôle de l'admin
   - Allez dans **SQL Editor**
   - Exécutez :
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'admin@chinastudy.com';
   ```

### 1.4 Récupérer vos clés d'API Supabase

1. Dans le dashboard Supabase, allez dans **Settings** → **API**
2. Notez :
   - **Project URL** : `https://xxx.supabase.co`
   - **anon public key** : `eyJhbGc...` (clé longue)

---

## 🌐 Étape 2 : Configuration de Cloudflare Pages

### 2.1 Préparer le build

Dans votre projet local, naviguez vers le dossier frontend :

```bash
cd /app/frontend
```

Vérifiez que votre `package.json` contient bien :

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  }
}
```

### 2.2 Variables d'environnement locales

Créez/modifiez le fichier `/app/frontend/.env` :

```env
REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ ATTENTION** : Ne commitez jamais `.env` dans Git ! Ajoutez-le dans `.gitignore`

### 2.3 Déployer sur Cloudflare Pages

#### Option A : Via le Dashboard Cloudflare (recommandé)

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Allez dans **Workers & Pages**
3. Cliquez sur **Create application** → **Pages** → **Connect to Git**
4. Autorisez Cloudflare à accéder à votre repository Git
5. Sélectionnez votre repository `ChinaStudy`

**Configuration du build :**

- **Framework preset** : Create React App
- **Build command** : `cd frontend && yarn build`
- **Build output directory** : `frontend/build`
- **Root directory** : `/` (laissez vide si le frontend est à la racine)

6. **Variables d'environnement** (très important) :

Ajoutez ces variables dans **Environment variables** :

```
REACT_APP_SUPABASE_URL = https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

7. Cliquez sur **Save and Deploy**

#### Option B : Via Wrangler CLI

```bash
# Installer Wrangler
npm install -g wrangler

# Se connecter à Cloudflare
wrangler login

# Builder l'application
cd /app/frontend
yarn build

# Déployer
wrangler pages deploy build --project-name=chinastudy
```

---

## ✅ Étape 3 : Vérification post-déploiement

### 3.1 Tester l'authentification

1. Accédez à votre site déployé : `https://chinastudy.pages.dev`
2. Testez l'inscription d'un nouvel étudiant
3. Vérifiez que l'email de confirmation Supabase arrive
4. Confirmez l'email et connectez-vous
5. Testez la connexion admin avec `admin@chinastudy.com`

### 3.2 Tester les fonctionnalités

**Pour un étudiant :**
- ✅ Remplir le formulaire wizard (6 étapes)
- ✅ Uploader des documents
- ✅ Vérifier le dashboard

**Pour un admin :**
- ✅ Voir la liste des étudiants
- ✅ Assigner plusieurs universités à un étudiant
- ✅ Valider/rejeter des documents
- ✅ Changer le statut d'une candidature

---

## 🔧 Configuration avancée

### Domaine personnalisé

1. Dans Cloudflare Pages, allez dans **Custom domains**
2. Ajoutez votre domaine (ex: `chinastudy.com`)
3. Suivez les instructions pour configurer les DNS

### Build automatique

Cloudflare Pages détectera automatiquement les commits sur votre branche principale et déploiera automatiquement.

Pour désactiver/personnaliser :
- **Settings** → **Builds & deployments** → **Build configuration**

### Preview deployments

Chaque Pull Request créera automatiquement un déploiement de preview avec une URL unique.

---

## 🐛 Troubleshooting

### Erreur : "Failed to fetch"

**Cause** : Variables d'environnement manquantes ou incorrectes

**Solution** :
1. Vérifiez que `REACT_APP_SUPABASE_URL` et `REACT_APP_SUPABASE_ANON_KEY` sont bien définies dans Cloudflare Pages
2. Redéployez l'application

### Erreur : "Row Level Security violation"

**Cause** : Policies RLS Supabase mal configurées

**Solution** :
1. Retournez dans Supabase SQL Editor
2. Revérifiez toutes les policies dans `supabase-schema.sql`
3. Assurez-vous que le trigger `on_auth_user_created` est bien créé

### Documents ne s'uploadent pas

**Cause** : Bucket Storage ou policies incorrectes

**Solution** :
1. Vérifiez que le bucket `documents` existe
2. Vérifiez les 4 policies RLS du Storage (voir section 1.2)

### Page blanche après déploiement

**Cause** : Chemin de build incorrect ou erreur de build

**Solution** :
1. Vérifiez les logs de build dans Cloudflare Pages
2. Vérifiez que `frontend/build` contient bien un `index.html`
3. Testez localement avec `yarn build` puis `npx serve -s build`

---

## 📚 Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎉 Félicitations !

Votre application ChinaStudy est maintenant déployée sur Cloudflare Pages avec Supabase comme backend !

**URLs utiles :**
- 🌐 Application : `https://chinastudy.pages.dev` (ou votre domaine personnalisé)
- 🗄️ Supabase Dashboard : `https://supabase.com/dashboard/project/nxhrpfwpwbjbcdynpngx`
- ☁️ Cloudflare Dashboard : `https://dash.cloudflare.com/`

**Identifiants admin par défaut :**
- Email : `admin@chinastudy.com`
- Mot de passe : `admin123`

**⚠️ Changez le mot de passe admin en production !**
