-- ============================================
-- SCRIPT SQL SIMPLIFIÉ POUR DÉMARRAGE RAPIDE
-- ============================================
-- Copiez-collez ce script COMPLET dans le SQL Editor de Supabase
-- puis cliquez sur RUN
-- ============================================

-- 1. Créer les tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Nouveau',
  identity JSONB DEFAULT '{}',
  education JSONB DEFAULT '{}',
  contacts JSONB DEFAULT '{}',
  emergency_contact JSONB DEFAULT '{}',
  financial_guarantor JSONB DEFAULT '{}',
  family JSONB DEFAULT '{}',
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  submission_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.universities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.application_universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  university_id TEXT REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(application_id, university_id)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  status TEXT DEFAULT 'pending',
  feedback TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Policies pour profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Policies pour applications
DROP POLICY IF EXISTS "Students can view own application" ON public.applications;
CREATE POLICY "Students can view own application" ON public.applications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can insert own application" ON public.applications;
CREATE POLICY "Students can insert own application" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Students can update own application" ON public.applications;
CREATE POLICY "Students can update own application" ON public.applications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all applications" ON public.applications;
CREATE POLICY "Admins can manage all applications" ON public.applications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Policies pour universities
DROP POLICY IF EXISTS "Anyone can view universities" ON public.universities;
CREATE POLICY "Anyone can view universities" ON public.universities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage universities" ON public.universities;
CREATE POLICY "Admins can manage universities" ON public.universities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Policies pour application_universities
DROP POLICY IF EXISTS "Students can view own app universities" ON public.application_universities;
CREATE POLICY "Students can view own app universities" ON public.application_universities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage app universities" ON public.application_universities;
CREATE POLICY "Admins can manage app universities" ON public.application_universities FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Policies pour documents
DROP POLICY IF EXISTS "Students can view own documents" ON public.documents;
CREATE POLICY "Students can view own documents" ON public.documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Students can insert own documents" ON public.documents;
CREATE POLICY "Students can insert own documents" ON public.documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Students can delete own documents" ON public.documents;
CREATE POLICY "Students can delete own documents" ON public.documents FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
CREATE POLICY "Admins can manage all documents" ON public.documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Policies pour notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 9. Trigger pour auto-création du profil
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

-- 10. Insérer les universités
INSERT INTO public.universities (id, name, city, deadline) VALUES
  ('blcu', 'Beijing Language and Culture University (BLCU)', 'Beijing', '2026-06-15'),
  ('shanghai', 'Shanghai University', 'Shanghai', '2026-05-30'),
  ('fudan', 'Fudan University', 'Shanghai', '2026-05-15'),
  ('peking', 'Peking University', 'Beijing', '2026-04-30'),
  ('tsinghua', 'Tsinghua University', 'Beijing', '2026-05-01'),
  ('zhejiang', 'Zhejiang University', 'Hangzhou', '2026-06-01'),
  ('wuhan', 'Wuhan University', 'Wuhan', '2026-06-30'),
  ('sun_yatsen', 'Sun Yat-sen University', 'Guangzhou', '2026-06-15'),
  ('nanjing', 'Nanjing University', 'Nanjing', '2026-05-31'),
  ('sichuan', 'Sichuan University', 'Chengdu', '2026-07-15')
ON CONFLICT (id) DO NOTHING;

-- 11. Créer les indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON public.documents(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_universities_application_id ON public.application_universities(application_id);

-- ============================================
-- ✅ TERMINÉ !
-- Vérifiez maintenant dans Table Editor que vous avez :
-- - profiles
-- - applications
-- - universities (avec 10 lignes)
-- - application_universities
-- - documents
-- - notifications
-- 
-- N'OUBLIEZ PAS de créer le bucket Storage "documents" !
-- ============================================
