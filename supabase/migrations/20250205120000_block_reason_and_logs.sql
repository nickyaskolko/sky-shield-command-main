-- סיבת חסימה + לוג חסימות (לפי חוק / שקיפות)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.profiles.banned_reason IS 'סיבת חסימת הגישה (נבחר/נכתב באדמין)';
COMMENT ON COLUMN public.profiles.banned_at IS 'מתי נחסם';
COMMENT ON COLUMN public.profiles.banned_by IS 'אדמין שחסם (user_id)';

-- לוג פעולות חסימה/ביטול חסימה
CREATE TABLE IF NOT EXISTS public.block_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('block', 'unblock')),
  reason text,
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_block_logs_target_user_id ON public.block_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_block_logs_created_at ON public.block_logs(created_at DESC);
ALTER TABLE public.block_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "block_logs_admin_only" ON public.block_logs;
CREATE POLICY "block_logs_admin_only" ON public.block_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
