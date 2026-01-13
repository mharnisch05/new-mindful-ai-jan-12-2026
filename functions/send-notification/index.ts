import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  recipient_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  meta?: Record<string, any>;
  send_email?: boolean;
}

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

    const { 
      recipient_id, 
      type, 
      title, 
      message, 
      link, 
      meta,
      send_email = true 
    }: NotificationRequest = await req.json();

    if (!recipient_id || !type || !title || !message) {
      throw new Error("Missing required fields: recipient_id, type, title, message");
    }

    // Insert notification into database
    const { data: notificationData, error: notificationError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: recipient_id,
        type,
        title,
        message,
        link,
      })
      .select()
      .single();

    if (notificationError) throw notificationError;
    logStep("Notification inserted", { notificationId: notificationData.id });

    // Get recipient profile to check email preferences
    const { data: recipientProfile } = await supabaseClient
      .from("profiles")
      .select("full_name, email, notify_via_email")
      .eq("id", recipient_id)
      .single();

    if (!recipientProfile) throw new Error("Recipient not found");

    // Send email if requested and user has email notifications enabled
    if (send_email && recipientProfile.notify_via_email && recipientProfile.email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        
        try {
          const emailResponse = await resend.emails.send({
            from: "Mindful AI <notifications@usemindful.ai>",
            to: [recipientProfile.email],
            subject: title,
            html: `
              <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">${title}</h2>
                <p style="color: #666; line-height: 1.6;">${message}</p>
                ${link ? `<p style="margin-top: 20px;"><a href="${link}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>` : ''}
                <p style="color: #999; font-size: 12px; margin-top: 40px;">You received this email because you have notifications enabled in your Mindful AI account.</p>
              </div>
            `,
          });

          logStep("Email sent successfully");
        } catch (emailError) {
          const errorMsg = emailError instanceof Error ? emailError.message : String(emailError);
          logStep("Warning: Failed to send email", { error: errorMsg });
          // Don't fail the entire request if email fails
        }
      } else {
        logStep("Warning: RESEND_API_KEY not configured, skipping email");
      }
    }

    // Trigger realtime event
    // Supabase Realtime will automatically handle this via the database insert
    logStep("Realtime notification triggered");

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notificationData.id 
      }),
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
