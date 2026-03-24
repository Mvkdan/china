# ChinaStudy - Migration Supabase ✅

## 🎉 Changements effectués

### 1. ✅ Badge "Made with Emergent" retiré
- Supprimé du fichier `/app/frontend/public/index.html`

### 2. ✅ Backend migré vers Supabase
- **Base de données** : MongoDB → Supabase PostgreSQL
- **Authentification** : JWT manuel → Supabase Auth
- **Storage** : Emergent Object Storage → Supabase Storage
- **Paiements** : Section Stripe complètement retirée

### 3. ✅ Nouvelle fonctionnalité : Multi-universités
- Les admins peuvent désormais assigner **plusieurs universités** à un même étudiant
- Nouvelle table de liaison `application_universities` (many-to-many)
- Interface admin mise à jour pour gérer les assignations multiples

### 4. ✅ Architecture simplifiée
- **Plus de backend FastAPI !** L'application est maintenant 100% frontend React
- Toute la logique métier utilise directement Supabase
- Parfait pour le déploiement sur Cloudflare Pages

---

## 📂 Fichiers créés/modifiés

### Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `/app/supabase-schema.sql` | Schéma complet de la base de données Supabase |
| `/app/CLOUDFLARE_DEPLOYMENT.md` | Guide de déploiement sur Cloudflare Pages |
| `/app/frontend/src/lib/supabase.js` | Client Supabase |
| `/app/frontend/src/lib/helpers.js` | Helpers pour toutes les opérations Supabase |

### Fichiers modifiés

| Fichier | Changements |
|---------|-------------|
| `/app/frontend/public/index.html` | Badge Emergent retiré |
| `/app/frontend/.env` | Ajout des variables Supabase |
| `/app/frontend/src/lib/auth.js` | Migration vers Supabase Auth |
| `/app/frontend/src/App.js` | Route `/payment` retirée |
| `/app/frontend/src/pages/LoginPage.js` | Utilise Supabase Auth |
| `/app/frontend/src/pages/RegisterPage.js` | Utilise Supabase Auth |
| `/app/frontend/src/pages/StudentDashboard.js` | Affiche les universités multiples, section paiement retirée |
| `/app/frontend/src/pages/ApplicationWizard.js` | Utilise helpers Supabase |
| `/app/frontend/src/pages/DocumentVault.js` | Upload vers Supabase Storage |
| `/app/frontend/src/pages/AdminDashboard.js` | Affiche les universités assignées |
| `/app/frontend/src/pages/AdminStudentDetail.js` | Gestion multi-universités |
| `/app/frontend/src/components/StudentLayout.js` | Menu sans paiement |

---

## 🚀 Déploiement

### Étape 1 : Configuration Supabase

1. **Exécuter le schéma SQL**
   ```bash
   # Copiez le contenu de /app/supabase-schema.sql
   # Collez-le dans le SQL Editor de Supabase
   # Cliquez sur "Run"
   ```

2. **Créer le bucket Storage**
   - Dashboard Supabase → Storage → Create bucket
   - Nom : `documents`
   - Type : Private

3. **Créer un admin**
   - Authentication → Users → Add user
   - Email : `admin@chinastudy.com`
   - Password : `admin123`
   - Puis exécuter :
   ```sql
   UPDATE public.profiles 
   SET role = 'admin' 
   WHERE email = 'admin@chinastudy.com';
   ```

### Étape 2 : Déploiement sur Cloudflare Pages

Consultez le guide complet : **[CLOUDFLARE_DEPLOYMENT.md](/app/CLOUDFLARE_DEPLOYMENT.md)**

**Résumé rapide :**

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → Create application → Pages → Connect to Git
3. Sélectionnez votre repository
4. Configuration :
   - **Build command** : `cd frontend && yarn build`
   - **Build output directory** : `frontend/build`
   - **Environment variables** :
     ```
     REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
     REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
5. Cliquez sur **Save and Deploy**

---

## 📊 Nouvelles tables Supabase

| Table | Description |
|-------|-------------|
| `profiles` | Extension de auth.users avec first_name, last_name, role |
| `applications` | Candidatures étudiants avec formulaire en JSONB |
| `universities` | Liste des 10 universités partenaires |
| `application_universities` | **NOUVEAU** : Relation many-to-many pour multi-universités |
| `documents` | Métadonnées des documents uploadés |
| `notifications` | Notifications pour les étudiants |

---

## 🔐 Sécurité : Row Level Security (RLS)

Toutes les tables sont protégées par RLS :

- ✅ **Étudiants** : Ne peuvent voir/modifier que leurs propres données
- ✅ **Admins** : Accès complet à toutes les données
- ✅ **Storage** : Les étudiants n'accèdent qu'à leurs propres documents

---

## 🎯 Fonctionnalités

### Pour les étudiants
- ✅ Inscription/Connexion avec Supabase Auth
- ✅ Formulaire wizard en 6 étapes
- ✅ Upload de documents vers Supabase Storage
- ✅ Visualisation du statut de candidature
- ✅ Voir les universités assignées par l'admin
- ✅ Notifications en temps réel
- ❌ Paiement (retiré)

### Pour les admins
- ✅ Dashboard avec liste de tous les étudiants
- ✅ Filtres par statut et recherche
- ✅ **Assigner plusieurs universités à un étudiant**
- ✅ **Retirer des universités assignées**
- ✅ Valider/rejeter des documents avec feedback
- ✅ Changer le statut des candidatures
- ✅ Copier-coller facilité des informations

---

## 🔧 Variables d'environnement

### Frontend (.env)
```env
REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

---

## 📝 Identifiants de test

### Admin
- **Email** : `admin@chinastudy.com`
- **Password** : `admin123`

⚠️ **Important** : Changez le mot de passe admin en production !

---

## 🐛 Troubleshooting

### "Failed to fetch" après déploiement
- Vérifiez les variables d'environnement dans Cloudflare Pages
- Assurez-vous que `REACT_APP_SUPABASE_URL` et `REACT_APP_SUPABASE_ANON_KEY` sont correctement définies

### Documents ne s'uploadent pas
- Vérifiez que le bucket `documents` existe dans Supabase Storage
- Vérifiez les policies RLS du Storage (voir CLOUDFLARE_DEPLOYMENT.md)

### Erreur "Row Level Security violation"
- Vérifiez que le schéma SQL complet a été exécuté
- Vérifiez le rôle de l'utilisateur dans la table `profiles`

---

## 📚 Documentation

- **Schéma complet** : `/app/supabase-schema.sql`
- **Guide déploiement** : `/app/CLOUDFLARE_DEPLOYMENT.md`
- **Supabase Docs** : https://supabase.com/docs
- **Cloudflare Pages Docs** : https://developers.cloudflare.com/pages/

---

## ✨ Prochaines étapes suggérées

1. Tester l'application localement avec Supabase
2. Exécuter le schéma SQL dans Supabase
3. Configurer le bucket Storage
4. Créer l'utilisateur admin
5. Déployer sur Cloudflare Pages
6. Tester toutes les fonctionnalités
7. Changer le mot de passe admin
8. Configurer un domaine personnalisé (optionnel)

---

## 🎓 Architecture finale

```
┌─────────────────────────────────────────┐
│     Cloudflare Pages (React Frontend)    │
│  - Authentification                      │
│  - Formulaire wizard                     │
│  - Upload documents                      │
│  - Dashboard étudiant/admin             │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────┐
│          Supabase (Backend)              │
│  ┌──────────────────────────────────┐   │
│  │  PostgreSQL Database             │   │
│  │  - profiles                      │   │
│  │  - applications                  │   │
│  │  - universities                  │   │
│  │  - application_universities ★    │   │
│  │  - documents                     │   │
│  │  - notifications                 │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Supabase Auth                   │   │
│  │  - Gestion utilisateurs          │   │
│  │  - JWT tokens                    │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Supabase Storage                │   │
│  │  - Bucket "documents"            │   │
│  │  - RLS policies                  │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘

★ = Nouvelle table pour multi-universités
```

---

## 💡 Points clés de la migration

1. **Plus de backend FastAPI** → Tout est géré par Supabase
2. **Paiements retirés** → Workflow simplifié
3. **Multi-universités** → Admins peuvent assigner plusieurs écoles
4. **Déploiement simple** → Un seul build React sur Cloudflare Pages
5. **Sécurité renforcée** → RLS Supabase pour toutes les tables

---

**🎉 Migration terminée avec succès !**

Pour toute question, consultez :
- `/app/CLOUDFLARE_DEPLOYMENT.md` (guide détaillé)
- `/app/supabase-schema.sql` (schéma complet)
