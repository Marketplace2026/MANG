-- ============================================================
-- MANG — Migration 34: Correction Diffusion Notifications & Push (Auto-suffisant)
-- ============================================================

-- 1. Colonnes requises sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- Définir le compte master administrateur
UPDATE public.profiles 
SET is_admin = TRUE, role = 'admin' 
WHERE id = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid;

-- 2. Fonction centrale de vérification administrateur
CREATE OR REPLACE FUNCTION public.is_admin_user(p_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super-admin Master ID de secours
  IF p_uid = 'd9f97369-ae78-4da2-844c-1c9c97b12445'::uuid THEN
    RETURN TRUE;
  END IF;

  -- Vérification sur le profil
  SELECT (COALESCE(is_admin, FALSE) = TRUE OR COALESCE(role, '') = 'admin')
  INTO v_is_admin
  FROM public.profiles
  WHERE id = p_uid;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Table des logs d'audit admin si pas encore existante
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    TEXT,
  details      JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Supprimer toute contrainte restrictive bloquant les types de notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 5. Activer RLS sur notifications et autoriser l'administrateur
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin peut créer des notifications pour tout le monde" ON public.notifications;
CREATE POLICY "Admin peut créer des notifications pour tout le monde"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Notifications visibles par leur destinataire ou admin" ON public.notifications;
CREATE POLICY "Notifications visibles par leur destinataire ou admin"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 6. Fonction RPC sécurisée d'envoi broadcast en masse (contourne RLS via SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.admin_broadcast_notification(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_broadcast_notification(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'system'
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Vérification des droits administrateur
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Accès refusé : privilège administrateur requis.';
  END IF;

  -- Insertion en masse pour tous les profils de la base
  INSERT INTO public.notifications (user_id, type, title, body, created_at, is_read)
  SELECT id, p_type, p_title, p_body, NOW(), FALSE
  FROM public.profiles;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Journalisation dans les logs d'audit admin
  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, details)
  VALUES (
    auth.uid(),
    'broadcast_notification',
    'all_users',
    jsonb_build_object('title', p_title, 'count', v_count)
  );

  RETURN jsonb_build_object('success', true, 'sent_to', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Assurer l'activation du canal Realtime pour la table notifications
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
