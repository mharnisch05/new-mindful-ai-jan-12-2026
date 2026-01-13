import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  recipientId: string;
  message: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-MESSAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { recipientId, message }: MessageRequest = await req.json();
    if (!recipientId || !message) {
      throw new Error("Missing recipientId or message");
    }

    // Insert message into database
    const { data: messageData, error: messageError } = await supabaseClient
      .from("messages")
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content: message.trim(),
      })
      .select()
      .single();

    if (messageError) throw messageError;
    logStep("Message inserted", { messageId: messageData.id });

    // Get sender profile
    const { data: senderProfile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Get recipient profile
    const { data: recipientProfile } = await supabaseClient
      .from("profiles")
      .select("full_name, email, notify_via_email")
      .eq("id", recipientId)
      .single();

    if (!recipientProfile) throw new Error("Recipient not found");

    // Create in-app notification
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: recipientId,
        title: "New Message",
        message: `You have a new message from ${senderProfile?.full_name || 'a user'}`,
        type: "info",
        link: "/messages",
      });

    if (notifError) {
      logStep("Warning: Failed to create notification", { error: notifError.message });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: messageData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
