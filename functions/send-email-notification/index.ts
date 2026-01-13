import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  recipient_email: string;
  recipient_name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  notification_type: string;
  related_entity_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const emailData: EmailRequest = await req.json();

    // Queue email for processing
    const { data, error } = await supabaseClient
      .from("email_queue")
      .insert({
        recipient_email: emailData.recipient_email,
        recipient_name: emailData.recipient_name,
        subject: emailData.subject,
        body_html: emailData.body_html,
        body_text: emailData.body_text,
        notification_type: emailData.notification_type,
        related_entity_id: emailData.related_entity_id,
        status: 'pending',
        scheduled_for: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    console.log("Email queued successfully:", data.id);

    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error queuing email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
