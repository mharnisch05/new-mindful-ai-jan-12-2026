import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const { clientId } = await req.json();
    if (!clientId) throw new Error("Client ID is required");

    // Verify the professional owns this client
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("therapist_id", userData.user.id)
      .single();

    if (clientError || !client) {
      throw new Error("Client not found or unauthorized");
    }

    // Generate unique code (never 67YEW which is reserved for admin)
    let code: string;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: generatedCode, error: codeError } = await supabaseClient
        .rpc("generate_access_code");

      if (codeError) throw codeError;
      code = generatedCode;

      // Never allow admin code to be generated
      if (code === '67YEW') {
        attempts++;
        continue;
      }

      // Check if code already exists
      const { data: existing } = await supabaseClient
        .from("client_access_codes")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error("Failed to generate unique code");
    }

    // Create the access code
    const { data: accessCode, error: insertError } = await supabaseClient
      .from("client_access_codes")
      .insert({
        code: code!,
        professional_id: userData.user.id,
        client_id: clientId,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ code: accessCode.code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating client code:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
