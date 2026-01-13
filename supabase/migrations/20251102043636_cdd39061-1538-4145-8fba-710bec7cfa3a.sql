-- Set up admin client record and linking
DO $$
DECLARE
  admin_user_id UUID;
  admin_professional_id UUID;
  new_client_id UUID;
BEGIN
  -- Get the admin user ID from auth
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'matthewharnisch@icloud.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Admin user not found';
  END IF;

  -- Get the professional ID (should be same as user_id for professionals)
  SELECT id INTO admin_professional_id
  FROM profiles
  WHERE id = admin_user_id
  LIMIT 1;

  IF admin_professional_id IS NULL THEN
    RAISE EXCEPTION 'Admin professional profile not found';
  END IF;

  -- Check if admin client already exists
  SELECT id INTO new_client_id
  FROM clients
  WHERE email = 'matthewharnisch@icloud.com' 
    AND therapist_id = admin_professional_id
  LIMIT 1;

  -- Create client record if it doesn't exist
  IF new_client_id IS NULL THEN
    INSERT INTO clients (
      therapist_id,
      first_name,
      last_name,
      email,
      phone,
      notes
    ) VALUES (
      admin_professional_id,
      'Matthew',
      'Harnisch',
      'matthewharnisch@icloud.com',
      '2087864555',
      'has bipolar disorder'
    )
    RETURNING id INTO new_client_id;
  END IF;

  -- Create client_users link if it doesn't exist
  INSERT INTO client_users (user_id, client_id)
  VALUES (admin_user_id, new_client_id)
  ON CONFLICT DO NOTHING;

  -- Create client_professional_links if it doesn't exist
  INSERT INTO client_professional_links (client_user_id, professional_id, client_id)
  VALUES (admin_user_id, admin_professional_id, new_client_id)
  ON CONFLICT DO NOTHING;

END $$;