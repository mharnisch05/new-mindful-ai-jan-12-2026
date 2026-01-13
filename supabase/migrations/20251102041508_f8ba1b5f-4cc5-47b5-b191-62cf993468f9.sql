-- Password reset codes table
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  UNIQUE(code)
);

ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check reset code validity"
  ON public.password_reset_codes
  FOR SELECT
  USING (NOT used AND expires_at > NOW());

CREATE POLICY "Service role can insert reset codes"
  ON public.password_reset_codes
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update reset codes"
  ON public.password_reset_codes
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  link TEXT
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Update progress_paths RLS to allow client access
DROP POLICY IF EXISTS "Clients can view their progress paths" ON public.progress_paths;
CREATE POLICY "Clients can view their progress paths"
  ON public.progress_paths
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = progress_paths.client_id
      AND client_users.user_id = auth.uid()
    )
  );

-- Update progress_goals RLS to allow client access
DROP POLICY IF EXISTS "Clients can view their goals" ON public.progress_goals;
CREATE POLICY "Clients can view their goals"
  ON public.progress_goals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_goals.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Update progress_milestones RLS to allow client access
DROP POLICY IF EXISTS "Clients can view their milestones" ON public.progress_milestones;
CREATE POLICY "Clients can view their milestones"
  ON public.progress_milestones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_milestones.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Update progress_tools RLS to allow client access
DROP POLICY IF EXISTS "Clients can view their tools" ON public.progress_tools;
CREATE POLICY "Clients can view their tools"
  ON public.progress_tools
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_tools.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Update progress_metrics RLS to allow client access
DROP POLICY IF EXISTS "Clients can view their metrics" ON public.progress_metrics;
CREATE POLICY "Clients can view their metrics"
  ON public.progress_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_metrics.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;