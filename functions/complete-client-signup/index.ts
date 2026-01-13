import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/corsHeaders.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, password, accessCode, clientId, professionalId, firstName, lastName } = await req.json();

    if (!email || !password || !accessCode) {
      throw new Error("Missing required fields");
    }

    // Validate password
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, number, and special character');
    }

    // Handle admin code
    if (accessCode.toUpperCase() === '67YEW') {
      // Check if admin override exists
      const { data: existingOverride } = await supabaseClient
        .from('admin_overrides')
        .select('*')
        .eq('user_email', email)
        .maybeSingle();

      if (existingOverride) {
        throw new Error('Admin account already exists for this email');
      }

      // Create admin user with profile
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: `${firstName || ''} ${lastName || ''}`.trim() }
      });

      if (authError) throw authError;

      // Create profile for admin
      await supabaseClient
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: `${firstName || ''} ${lastName || ''}`.trim()
        });

      // Create admin override
      await supabaseClient
        .from('admin_overrides')
        .insert({
          user_email: email,
          plan_tier: 'enterprise',
          grant_client_portal: true
        });

      // Assign admin role
      await supabaseClient
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Admin account created successfully', userId: authData.user.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!clientId || !professionalId) {
      throw new Error("Client and professional IDs required");
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Assign client role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "client",
      });

    if (roleError) throw roleError;

    // Link client user to client_users table
    const { error: clientUserError } = await supabaseClient
      .from("client_users")
      .insert({
        user_id: authData.user.id,
        client_id: clientId,
      });

    if (clientUserError) throw clientUserError;

    // Create client-professional link
    const { error: linkError } = await supabaseClient
      .from("client_professional_links")
      .insert({
        client_user_id: authData.user.id,
        professional_id: professionalId,
        client_id: clientId,
      });

    if (linkError) throw linkError;

    // Mark access code as used
    const { error: updateError } = await supabaseClient
      .from("client_access_codes")
      .update({
        used: true,
        used_by: authData.user.id,
        used_at: new Date().toISOString(),
      })
      .eq("code", accessCode.toUpperCase());

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error completing client signup:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
