-- Function to create notification for progress path updates
CREATE OR REPLACE FUNCTION notify_progress_path_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  path_record RECORD;
  therapist_id UUID;
  client_user_id UUID;
  entity_name TEXT;
BEGIN
  -- Get progress path info
  SELECT pp.therapist_id, pp.client_id, cu.user_id as client_user_id
  INTO path_record
  FROM progress_paths pp
  LEFT JOIN client_users cu ON cu.client_id = pp.client_id
  WHERE pp.id = COALESCE(NEW.progress_path_id, OLD.progress_path_id);

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  therapist_id := path_record.therapist_id;
  client_user_id := path_record.client_user_id;

  -- Determine what was updated
  CASE TG_TABLE_NAME
    WHEN 'progress_goals' THEN entity_name := 'goal';
    WHEN 'progress_milestones' THEN entity_name := 'milestone';
    WHEN 'progress_tools' THEN entity_name := 'tool';
    WHEN 'progress_metrics' THEN entity_name := 'metric';
    ELSE entity_name := 'item';
  END CASE;

  -- Notify therapist
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      therapist_id,
      'Progress Path Updated',
      'A new ' || entity_name || ' was added to a progress path',
      'info',
      '/clients'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      therapist_id,
      'Progress Path Updated',
      'A ' || entity_name || ' was updated in a progress path',
      'info',
      '/clients'
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      therapist_id,
      'Progress Path Updated',
      'A ' || entity_name || ' was removed from a progress path',
      'warning',
      '/clients'
    );
  END IF;

  -- Notify client if they have a user account
  IF client_user_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        client_user_id,
        'Progress Path Updated',
        'Your therapist added a new ' || entity_name || ' to your progress path',
        'success',
        '/client-portal'
      );
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        client_user_id,
        'Progress Path Updated',
        'Your therapist updated a ' || entity_name || ' in your progress path',
        'info',
        '/client-portal'
      );
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        client_user_id,
        'Progress Path Updated',
        'A ' || entity_name || ' was removed from your progress path',
        'warning',
        '/client-portal'
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for progress path tables
CREATE TRIGGER progress_goals_notify
  AFTER INSERT OR UPDATE OR DELETE ON progress_goals
  FOR EACH ROW
  EXECUTE FUNCTION notify_progress_path_update();

CREATE TRIGGER progress_milestones_notify
  AFTER INSERT OR UPDATE OR DELETE ON progress_milestones
  FOR EACH ROW
  EXECUTE FUNCTION notify_progress_path_update();

CREATE TRIGGER progress_tools_notify
  AFTER INSERT OR UPDATE OR DELETE ON progress_tools
  FOR EACH ROW
  EXECUTE FUNCTION notify_progress_path_update();

CREATE TRIGGER progress_metrics_notify
  AFTER INSERT OR UPDATE OR DELETE ON progress_metrics
  FOR EACH ROW
  EXECUTE FUNCTION notify_progress_path_update();