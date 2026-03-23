# ChinaStudy - Plateforme d'intermédiation universitaire

## Problem Statement
Plateforme d'intermédiation pour étudiants internationaux souhaitant s'inscrire en année de langue dans des universités chinoises. Formulaire simplifié multi-étapes, upload de documents, suivi de dossier, paiement Stripe, back-office admin CRM.

## Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Storage**: Emergent Object Storage (documents)
- **Payments**: Stripe (via emergentintegrations)
- **Auth**: JWT (email/password)

## User Personas
1. **Étudiant international** - Remplit formulaire, uploade documents, suit sa candidature, effectue le paiement
2. **Administrateur** - Vérifie dossiers, valide/rejette documents, fait avancer les statuts, copie-colle les infos vers les portails chinois

## Core Requirements
- Wizard multi-étapes (7 étapes): Identité, Éducation, Contacts, Urgence, Garant, Famille, Université
- Upload 6 types de documents: Passeport, Photo ID, Diplôme, Relevés, Casier, Certificat médical
- Statuts: Draft → Pending_Review → Awaiting_Payment → Paid → Submitted_to_Uni → Accepted
- Admin dashboard CRM dense avec gestion de statuts et documents
- Paiement Stripe (500€ frais de dossier) débloqué par l'admin
- 10 universités partenaires prédéfinies

## What's Been Implemented (2026-03-23)
- [x] Auth JWT (register/login) avec admin pré-créé
- [x] Formulaire wizard 6 étapes avec sauvegarde par étape (université retirée)
- [x] Téléphone avec sélecteur d'indicatif pays dans Contacts, Urgence, Garant
- [x] Contact d'urgence: Nom + Prénom, relation "Autre" avec champ de précision
- [x] Garant financier: Nom + Prénom, profession ajoutée
- [x] Famille: Nom + Prénom séparés pour père et mère
- [x] Upload de documents multiples pour diplômes
- [x] 9 slots de bulletins scolaires (2nde, 1ère, Terminale × 3 trimestres)
- [x] Dashboard étudiant avec barre de progression
- [x] Dashboard admin CRM avec filtres et recherche
- [x] Assignation d'université par l'admin (et non l'étudiant)
- [x] Vue détaillée étudiant admin (copier-coller facilité)
- [x] Gestion documents admin (valider/rejeter avec commentaire)
- [x] Avancement de statut manuel par l'admin
- [x] Intégration Stripe pour paiement (avec polling)
- [x] Interface entièrement en français
- [x] Design "Institution Numérique" (palette earthy, Chivo+IBM Plex Sans)

## Prioritized Backlog
### P0 (Critical)
- All done for MVP

### P1 (Important)
- Notifications email (confirmation inscription, changement statut, rejet document)
- Validation de formulaire plus stricte (champs obligatoires)
- Export CSV des données étudiants pour l'admin

### P2 (Nice to have)
- Dashboard analytics admin (graphiques, statistiques)
- Gestion multi-admin (inviter des collaborateurs)
- Historique des changements de statut
- Aperçu document en ligne (PDF viewer intégré)
- Traduction automatique des documents

## Admin Credentials
- Email: admin@chinastudy.com
- Password: admin123

## Next Tasks
1. Ajouter notifications email (SendGrid/Resend)
2. Ajouter validation stricte des champs du formulaire
3. Export données étudiant en CSV/PDF
4. Améliorer l'aperçu des documents (PDF viewer inline)
