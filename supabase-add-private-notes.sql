-- Migration : Ajout du champ private_notes à la table applications
-- À exécuter dans Supabase SQL Editor

-- Ajouter la colonne private_notes
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS private_notes TEXT;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_applications_private_notes ON public.applications(private_notes) 
WHERE private_notes IS NOT NULL;

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applications' 
AND column_name = 'private_notes';
