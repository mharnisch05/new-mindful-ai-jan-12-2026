-- Allow clients to create, update, and delete progress goals
CREATE POLICY "Clients can create goals" ON progress_goals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_goals.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update goals" ON progress_goals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_goals.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete goals" ON progress_goals
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_goals.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Allow clients to create, update, and delete progress milestones
CREATE POLICY "Clients can create milestones" ON progress_milestones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_milestones.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update milestones" ON progress_milestones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_milestones.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete milestones" ON progress_milestones
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_milestones.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Allow clients to create, update, and delete progress tools
CREATE POLICY "Clients can create tools" ON progress_tools
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_tools.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update tools" ON progress_tools
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_tools.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete tools" ON progress_tools
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_tools.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Allow clients to create and update progress metrics
CREATE POLICY "Clients can create metrics" ON progress_metrics
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_metrics.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can update metrics" ON progress_metrics
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_metrics.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can delete metrics" ON progress_metrics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM progress_paths pp
      JOIN client_users cu ON cu.client_id = pp.client_id
      WHERE pp.id = progress_metrics.progress_path_id
      AND cu.user_id = auth.uid()
    )
  );

-- Allow clients to update their progress paths
CREATE POLICY "Clients can update their progress paths" ON progress_paths
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM client_users
      WHERE client_users.client_id = progress_paths.client_id
      AND client_users.user_id = auth.uid()
    )
  );