import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE, PUT",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("[VALIDATION] Missing Supabase credentials", {
        hasUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
        hasAnon: !!anonKey,
      });
      return new Response(
        JSON.stringify({ error: "Missing backend configuration" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    const supabaseClient = createClient(supabaseUrl, anonKey);

    const { code, email } = await req.json();
    console.log("[VALIDATION] Received validation request", { code, email });

    const rawCode = typeof code === "string" ? code : String(code || "");
    const normalizedCode = rawCode.trim().toUpperCase();

    if (!normalizedCode) {
      console.log("[VALIDATION] No code provided");
      return new Response(
        JSON.stringify({ error: "Access code is required", valid: false }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    console.log("[VALIDATION] Normalized code & meta", {
      rawCode,
      normalizedCode,
      ipAddress,
    });

    // STEP 1: Check admin_access_codes table FIRST (no rate limiting)
    console.log("[VALIDATION] Step 1: Checking admin_access_codes table");
    const { data: adminCode, error: adminError } = await supabaseService
      .from("admin_access_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("active", true)
      .maybeSingle();

    if (adminError) {
      console.error("[VALIDATION] Admin query error", adminError);
      return new Response(
        JSON.stringify({
          error: "Database error during admin validation",
          valid: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (adminCode) {
      console.log("[VALIDATION] Admin code found!", {
        id: adminCode.id,
        code: adminCode.code,
      });

      // Log successful admin validation (mask code)
      await supabaseService.from("code_validation_attempts").insert({
        ip_address: ipAddress,
        code_attempted: "ADMIN",
        success: true,
      });

      return new Response(
        JSON.stringify({
          valid: true,
          isAdmin: true,
          type: "admin",
          clientId: "admin",
          professionalId: "admin",
          clientInfo: { first_name: "Admin", last_name: "User", email: email || "" },
          professionalInfo: { full_name: "System Admin" },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[VALIDATION] No admin code found, proceeding to rate limit & client validation");

    // STEP 2: Rate limiting by IP (non-admin codes only)
    console.log("[VALIDATION] Step 2: Checking rate limiting");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: recentAttempts, error: attemptsError } = await supabaseService
      .from("code_validation_attempts")
      .select("id, created_at, success")
      .eq("ip_address", ipAddress)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      console.error("[VALIDATION] Rate limit query error", attemptsError);
    }

    if (recentAttempts && recentAttempts.length > 0) {
      const failedAttempts = recentAttempts.filter((a) => !a.success);
      console.log("[VALIDATION] Recent attempts", {
        total: recentAttempts.length,
        failed: failedAttempts.length,
      });

      if (recentAttempts.length >= 10 || failedAttempts.length >= 5) {
        await supabaseService.from("code_validation_attempts").insert({
          ip_address: ipAddress,
          code_attempted: normalizedCode.substring(0, 2) + "***",
          success: false,
        });

        return new Response(
          JSON.stringify({
            valid: false,
            error:
              "Too many validation attempts. Please try again in an hour.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // STEP 3: Check client access codes
    console.log("[VALIDATION] Step 3: Checking client_access_codes table");
    const { data: accessCode, error: codeError } = await supabaseClient
      .from("client_access_codes")
      .select(
        `
        *,
        clients (
          id,
          first_name,
          last_name,
          email
        ),
        profiles:professional_id (
          full_name,
          email
        )
      `,
      )
      .eq("code", normalizedCode)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (codeError) {
      console.error("[VALIDATION] Client code query error", codeError);
      return new Response(
        JSON.stringify({
          error: "Database error during client validation",
          valid: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validationSuccess = !!accessCode;

    console.log("[VALIDATION] Validation result", {
      normalizedCode,
      validationSuccess,
      ipAddress,
    });

    // Log the validation attempt (mask code)
    await supabaseService.from("code_validation_attempts").insert({
      ip_address: ipAddress,
      code_attempted: normalizedCode.substring(0, 2) + "***",
      success: validationSuccess,
    });

    if (!accessCode) {
      console.log("[VALIDATION] Code not found or expired in client_access_codes");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid or expired code" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        type: "client",
        clientInfo: accessCode.clients,
        professionalInfo: accessCode.profiles,
        accessCodeId: accessCode.id,
        clientId: accessCode.client_id,
        professionalId: accessCode.professional_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[VALIDATION] Unexpected error", error);
    const message = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({ error: message, valid: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
