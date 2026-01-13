import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/corsHeaders.ts";
import { 
  validateEmail, 
  sanitizeString, 
  isSafeString,
  assertValid,
  ValidationError
} from "../_shared/validation.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let email = "";

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { email: rawEmail, password, fullName, phone, officialTitle, specialty } = body;

    // Log signup attempt
    console.log("[Professional Signup] Request received", {
      timestamp: new Date().toISOString(),
      hasEmail: !!rawEmail,
      hasPassword: !!password,
      hasFullName: !!fullName,
      hasPhone: !!phone,
      hasTitle: !!officialTitle
    });

    // Validate required fields
    assertValid(rawEmail && password && fullName && officialTitle, 
      "Missing required fields: email, password, fullName, or officialTitle", 
      "required_fields");

    // Sanitize and validate email
    email = sanitizeString(rawEmail.toLowerCase(), 255);
    assertValid(validateEmail(email), "Invalid email format", "email");

    // Validate name
    const sanitizedName = sanitizeString(fullName, 100);
    assertValid(sanitizedName.length >= 2, "Name must be at least 2 characters", "fullName");
    assertValid(isSafeString(sanitizedName), "Invalid characters in name", "fullName");

    // Validate phone if provided
    if (phone) {
      const sanitizedPhone = sanitizeString(phone, 20);
      assertValid(/^\+?[1-9]\d{1,14}$/.test(sanitizedPhone.replace(/[\s()-]/g, '')), 
        "Invalid phone format (use international format with country code)", 
        "phone");
    }

    // Validate official title
    const sanitizedTitle = sanitizeString(officialTitle, 100);
    assertValid(sanitizedTitle.length >= 2, "Official title must be at least 2 characters", "officialTitle");
    assertValid(isSafeString(sanitizedTitle), "Invalid characters in official title", "officialTitle");

    // Validate specialty if provided
    let sanitizedSpecialty = null;
    if (specialty) {
      sanitizedSpecialty = sanitizeString(specialty, 200);
      assertValid(isSafeString(sanitizedSpecialty), "Invalid characters in specialty", "specialty");
    }

    // Validate password complexity
    assertValid(password.length >= 8, "Password must be at least 8 characters", "password");
    assertValid(/[A-Z]/.test(password), "Password must include at least one uppercase letter", "password");
    assertValid(/[a-z]/.test(password), "Password must include at least one lowercase letter", "password");
    assertValid(/\d/.test(password), "Password must include at least one number", "password");
    assertValid(/[^A-Za-z0-9]/.test(password), "Password must include at least one special character", "password");

    // Check for duplicate email
    const { data: existingProfile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      console.warn("[Professional Signup] Duplicate email attempt", {
        timestamp: new Date().toISOString(),
        email,
        emailDomain: email.split('@')[1]
      });
      throw new Error("An account with this email already exists");
    }

    // Create user account
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: sanitizedName,
      },
    });

    if (authError) {
      console.error("[Professional Signup] Auth creation failed", {
        timestamp: new Date().toISOString(),
        error: authError.message,
        email
      });
      throw authError;
    }

    // Create profile
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name: sanitizedName,
        email: email,
        phone: phone || null,
        official_title: sanitizedTitle,
        specialty: sanitizedSpecialty,
      });

    if (profileError) {
      console.error("[Professional Signup] Profile creation failed", {
        timestamp: new Date().toISOString(),
        error: profileError.message,
        userId: authData.user.id
      });
      
      // Rollback: delete auth user
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Assign professional role
    const { error: roleError } = await supabaseClient
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: "professional",
      });

    if (roleError) {
      console.error("[Professional Signup] Role assignment failed", {
        timestamp: new Date().toISOString(),
        error: roleError.message,
        userId: authData.user.id
      });
      
      // Rollback: delete profile and auth user
      await supabaseClient.from("profiles").delete().eq("id", authData.user.id);
      await supabaseClient.auth.admin.deleteUser(authData.user.id);
      throw roleError;
    }

    const duration = Date.now() - startTime;
    console.log("[Professional Signup] Success", {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      userId: authData.user.id,
      emailDomain: email.split('@')[1],
      hasPhone: !!phone,
      hasSpecialty: !!sanitizedSpecialty
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        message: "Professional account created successfully."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof ValidationError) {
      console.warn("[Professional Signup] Validation error", {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        field: error.field,
        message: error.message,
        email
      });
      
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Professional Signup] Unexpected error", {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      email
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
