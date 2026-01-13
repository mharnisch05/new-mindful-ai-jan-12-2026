import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending emails
    const { data: emails, error: fetchError } = await supabaseClient
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("scheduled_for", { ascending: true })
      .limit(10);

    if (fetchError) throw fetchError;

    console.log(`Processing ${emails?.length || 0} emails`);

    for (const email of emails || []) {
      try {
        // Send email with Resend
        const { data, error } = await resend.emails.send({
          from: "Mindful AI <notifications@usemindful.ai>",
          to: [email.recipient_email],
          subject: email.subject,
          html: email.body_html,
          text: email.body_text || undefined,
        });

        if (error) throw error;

        // Mark as sent
        await supabaseClient
          .from("email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", email.id);

        console.log(`Email sent successfully: ${email.id}`);
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);

        // Increment attempts and update error
        const newAttempts = email.attempts + 1;
        const status = newAttempts >= 3 ? "failed" : "pending";

        await supabaseClient
          .from("email_queue")
          .update({
            attempts: newAttempts,
            status,
            error_message: error instanceof Error ? error.message : "Unknown error",
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", email.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: emails?.length || 0 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing email queue:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
