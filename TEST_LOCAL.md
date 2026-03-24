# Guide de test local

## Prérequis
- Node.js 16+
- Yarn

## Étapes

### 1. Configuration Supabase
Exécutez d'abord le schéma SQL dans votre projet Supabase (voir CLOUDFLARE_DEPLOYMENT.md)

### 2. Variables d'environnement
Créez le fichier `/app/frontend/.env` :

```env
REACT_APP_SUPABASE_URL=https://nxhrpfwpwbjbcdynpngx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aHJwZndwd2JqYmNkeW5wbmd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMDYzODgsImV4cCI6MjA4OTg4MjM4OH0.pwiLCntG5ydY9xOmfawCp-Fo6FXRf9R4RI-2dCRGo-0
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

### 3. Installation et lancement

```bash
cd /app/frontend
yarn install
yarn start
```

L'application devrait s'ouvrir sur http://localhost:3000

### 4. Test

1. Créez un compte étudiant
2. Remplissez le formulaire
3. Uploadez des documents
4. Connectez-vous en tant qu'admin (admin@chinastudy.com / admin123)
5. Testez l'assignation de plusieurs universités

### 5. Build de production

```bash
cd /app/frontend
yarn build
```

Le dossier `build/` contient l'application prête pour le déploiement.

### 6. Test du build

```bash
npx serve -s build
```

L'application devrait être accessible sur http://localhost:3000
