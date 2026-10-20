-- ============================================================
-- MANG — Migration 34: Correction Diffusion Notifications & Push
-- ============================================================

-- 1. Supprimer toute contrainte restrictive bloquant les notifications système / broadcast
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Activer RLS sur notifications et autoriser l'administrateur à insérer pour tous
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin peut créer des notifications pour tout le monde" ON public.notifications;
CREATE POLICY "Admin peut créer des notifications pour tout le monde"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Notifications visibles par leur destinataire ou admin" ON public.notifications;
CREATE POLICY "Notifications visibles par leur destinataire ou admin"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user(auth.uid()));

-- 3. Fonction RPC sécurisée d'envoi broadcast en masse (contourne RLS via SECURITY DEFINER)
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

-- 4. Assurer l'activation du canal Realtime pour la table notifications
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
