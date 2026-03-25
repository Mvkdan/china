# 🔧 Fix : Documents dans Storage mais pas dans la table SQL

## 🐛 Problème identifié

**Symptômes :**
- ✅ Documents uploadés avec succès dans Supabase Storage
- ❌ Table `public.documents` vide
- ❌ Documents invisibles sur l'interface étudiant
- ❌ Documents invisibles sur l'interface admin

**Cause :** L'upload dans Storage réussissait mais l'insertion dans la table SQL échouait silencieusement.

---

## ✅ Corrections appliquées

### 1. Fonction uploadDocument renforcée (`lib/helpers.js`)

**Ajouts :**
- ✅ Logs détaillés à chaque étape
- ✅ Gestion d'erreur robuste avec try-catch
- ✅ Cleanup automatique du Storage si l'insert SQL échoue
- ✅ Messages d'erreur clairs dans la console

**Logs ajoutés :**
```javascript
📤 Starting document upload
📦 Uploading to Storage: path/to/file
✅ File uploaded to Storage
💾 Creating database entry...
✅ Document saved to database
```

**En cas d'erreur :**
```javascript
❌ Storage upload error: {...}
❌ Database insert error: {...}
🗑️ Cleaned up Storage file after DB error
```

---

### 2. Fonction getDocuments améliorée

**Ajouts :**
- ✅ Logs pour tracer les requêtes
- ✅ Retourne tableau vide au lieu de null
- ✅ Gestion d'erreur propre

**Logs :**
```javascript
📄 Fetching documents for application: abc-123
✅ Found 3 documents
```

---

### 3. Système de demande de correction avec message

**Nouvelle fonctionnalité :**
- ✅ Interface admin avec dialogue pour demander une correction
- ✅ Message personnalisé pour chaque document
- ✅ Notification envoyée automatiquement à l'étudiant
- ✅ Document marqué comme "rejeté" avec feedback visible

**Workflow :**
1. Admin clique sur le bouton "Message" (🗨️) d'un document
2. Dialogue s'ouvre avec champ de texte
3. Admin saisit le message de correction
4. Clic sur "Envoyer la demande"
5. Document rejeté + Notification créée + Toast de confirmation

**Composants ajoutés :**
- `Dialog` pour la demande de correction
- `MessageSquare` icon pour le bouton
- `notificationHelpers.requestCorrection()` helper

---

## 🔍 Diagnostic : Pourquoi les documents n'apparaissaient pas

### Étape 1 : Vérifier la console (F12)

Après correction, vous devriez voir ces logs lors d'un upload :

```
📤 Starting document upload: {...}
📦 Uploading to Storage: 123abc/passport_scan/1234567890.pdf
✅ File uploaded to Storage: {...}
💾 Creating database entry...
✅ Document saved to database: {id: "...", file_name: "...", ...}
📄 Fetching documents for application: abc-123
✅ Found 1 documents
```

### Étape 2 : Vérifier les policies RLS

Les documents peuvent être uploadés dans Storage mais pas insérés dans SQL si les policies RLS bloquent.

**Test SQL dans Supabase :**
```sql
-- Vérifier les policies de la table documents
SELECT * FROM pg_policies WHERE tablename = 'documents';

-- Tester l'insertion manuelle
INSERT INTO public.documents (
  application_id,
  document_type,
  file_name,
  file_path,
  file_size,
  content_type,
  status
) VALUES (
  'votre-application-id',
  'test',
  'test.pdf',
  'test/test.pdf',
  1000,
  'application/pdf',
  'pending'
);
```

**Si erreur RLS :** Les policies ne sont pas correctement configurées.

**Solution :** Exécutez `/app/supabase-quick-setup.sql` qui contient toutes les policies.

---

### Étape 3 : Vérifier le Storage bucket

1. Supabase Dashboard → **Storage**
2. Bucket `documents` existe ?
3. Cliquez dessus → Vous devez voir les dossiers par User ID
4. Les fichiers sont là ?

**Si bucket manquant :**
- Storage → Create bucket → `documents` (privé)

**Si policies Storage manquantes :**
Voir `/app/QUICKSTART.md` section 3 pour les 4 policies RLS du Storage.

---

## 🧪 Test du fix

### Test 1 : Upload d'un document

1. Connectez-vous en tant qu'étudiant
2. Allez dans **Documents**
3. Uploadez un fichier (ex: photo d'identité)
4. **Ouvrez F12 → Console**
5. Vous devriez voir :
   ```
   📤 Starting document upload
   📦 Uploading to Storage
   ✅ File uploaded to Storage
   💾 Creating database entry...
   ✅ Document saved to database
   Document uploadé avec succès (toast)
   📄 Fetching documents
   ✅ Found 1 documents
   ```
6. Le document s'affiche immédiatement dans la liste

### Test 2 : Visibilité admin

1. Connectez-vous en tant qu'admin
2. Allez sur un étudiant
3. Section **Documents** → Vous devez voir les documents uploadés
4. Status "En attente" (jaune)

### Test 3 : Demande de correction

1. En tant qu'admin, sur un document "En attente"
2. Cliquez sur le bouton **🗨️ Message**
3. Dialogue s'ouvre
4. Saisissez : "La photo n'est pas sur fond blanc"
5. Cliquez **Envoyer la demande**
6. Document passe en statut "Rejeté" (rouge)
7. Le message s'affiche sous le nom du document
8. L'étudiant reçoit une notification

### Test 4 : Notification étudiant

1. Déconnectez-vous de l'admin
2. Connectez-vous en tant qu'étudiant
3. Dashboard → Bannière jaune avec notifications
4. Cliquez "Tout marquer lu"
5. Ou allez dans Documents → Le feedback est visible sous le document

---

## 📊 Vérification SQL

### Vérifier que les documents sont dans la table

```sql
-- Lister tous les documents
SELECT 
  d.id,
  d.file_name,
  d.document_type,
  d.status,
  d.uploaded_at,
  a.user_id,
  p.email
FROM public.documents d
JOIN public.applications a ON a.id = d.application_id
JOIN public.profiles p ON p.id = a.user_id
ORDER BY d.uploaded_at DESC;
```

**Résultat attendu :** Liste des documents avec email de l'étudiant

**Si vide :**
1. Vérifiez les logs de console lors d'un upload
2. Cherchez "❌ Database insert error"
3. Vérifiez les policies RLS

---

## 🚨 Erreurs courantes et solutions

| Erreur | Cause | Solution |
|--------|-------|----------|
| "new row violates RLS policy" | Policies mal configurées | Exécuter `/app/supabase-quick-setup.sql` |
| "relation does not exist" | Table documents pas créée | Exécuter le schéma SQL complet |
| "null value in column application_id" | Application_id non fourni | Vérifier que l'étudiant a une application |
| Storage ok mais SQL vide | Insert SQL échoue | Vérifier logs console F12 |

---

## 🎯 Fonctionnalités ajoutées

### 1. Logs détaillés
Chaque étape de l'upload est loggée avec des emojis pour faciliter le debug.

### 2. Cleanup automatique
Si l'insert SQL échoue, le fichier est automatiquement supprimé du Storage.

### 3. Dialogue de correction
Interface moderne pour demander des corrections avec message personnalisé.

### 4. Notifications automatiques
Quand un document est rejeté, une notification est créée automatiquement.

### 5. Feedback visible
Les messages de correction sont affichés sous chaque document rejeté.

---

## 📂 Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `lib/helpers.js` | Logs, try-catch, cleanup, requestCorrection |
| `pages/AdminStudentDetail.js` | Dialogue correction, MessageSquare button |

---

## ✅ Checklist de vérification

Après correction, assurez-vous que :

- [ ] Les logs d'upload s'affichent dans F12
- [ ] Les documents apparaissent dans la liste après upload
- [ ] La table `public.documents` contient des lignes
- [ ] Les documents sont visibles sur l'interface admin
- [ ] Le bouton Message (🗨️) fonctionne
- [ ] Le dialogue de correction s'ouvre
- [ ] Les notifications sont créées
- [ ] Le feedback s'affiche sous les documents rejetés

---

**💡 Si les documents n'apparaissent toujours pas, ouvrez F12 et cherchez les erreurs rouges dans la Console !**
