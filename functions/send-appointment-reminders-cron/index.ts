import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[REMINDER-CRON] Starting appointment reminder check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all enabled integrations for SMS/Email reminders
    const { data: integrations } = await supabase
      .from("integration_settings")
      .select("*")
      .eq("is_enabled", true)
      .in("integration_type", ["twilio", "resend"]);

    console.log(`[REMINDER-CRON] Found ${integrations?.length || 0} enabled notification integrations`);

    // Get appointments in the next 24-48 hours that haven't had reminders sent
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    const reminderWindowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000); // 26 hours from now

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        appointment_date,
        duration_minutes,
        zoom_meeting_url,
        reminder_sent,
        therapist_id,
        client_id,
        clients (
          first_name,
          last_name,
          email,
          phone
        ),
        profiles:therapist_id (
          full_name,
          official_title
        )
      `)
      .gte("appointment_date", reminderWindow.toISOString())
      .lte("appointment_date", reminderWindowEnd.toISOString())
      .eq("status", "scheduled")
      .eq("reminder_sent", false);

    if (appointmentsError) {
      console.error("[REMINDER-CRON] Error fetching appointments:", appointmentsError);
      throw appointmentsError;
    }

    console.log(`[REMINDER-CRON] Found ${appointments?.length || 0} appointments needing reminders`);

    let emailsSent = 0;
    let smsSent = 0;
    const errors: string[] = [];

    // Process each appointment
    for (const appointment of appointments || []) {
      const client = appointment.clients as any;
      const therapist = appointment.profiles as any;
      
      if (!client || !therapist) continue;

      const appointmentTime = new Date(appointment.appointment_date).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      // Get integration configs
      const twilioIntegration = integrations?.find(i => i.integration_type === "twilio");
      
      // Prepare message content
      const defaultTemplate = `Hi {client_name}, reminder for your appointment with {therapist_name} on {time}. {zoom_link}`;
      const template = twilioIntegration?.config?.reminder_template || defaultTemplate;
      
      const message = template
        .replace("{client_name}", `${client.first_name} ${client.last_name}`)
        .replace("{therapist_name}", therapist.official_title ? `${therapist.official_title} ${therapist.full_name}` : therapist.full_name)
        .replace("{time}", appointmentTime)
        .replace("{zoom_link}", appointment.zoom_meeting_url || "");

      // Send SMS if Twilio is enabled and phone exists
      if (twilioIntegration && client.phone) {
        try {
          const { error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              to: client.phone,
              message: message,
              appointmentId: appointment.id,
            },
          });

          if (smsError) {
            errors.push(`SMS failed for ${client.first_name}: ${smsError.message}`);
          } else {
            smsSent++;
          }
        } catch (err: any) {
          console.error("[REMINDER-CRON] SMS error:", err);
          errors.push(`SMS error for ${client.first_name}: ${err.message}`);
        }
      }

      // Send email if email exists
      if (client.email) {
        try {
          const { error: emailError } = await supabase.from("email_queue").insert({
            recipient_email: client.email,
            recipient_name: `${client.first_name} ${client.last_name}`,
            subject: "Appointment Reminder - Mindful AI",
            body_html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Appointment Reminder</h2>
                <p>Hi ${client.first_name},</p>
                <p>This is a reminder for your upcoming appointment:</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>With:</strong> ${therapist.official_title ? `${therapist.official_title} ` : ""}${therapist.full_name}</p>
                  <p style="margin: 5px 0;"><strong>When:</strong> ${appointmentTime}</p>
                  ${appointment.zoom_meeting_url ? `<p style="margin: 5px 0;"><strong>Join Zoom:</strong> <a href="${appointment.zoom_meeting_url}">${appointment.zoom_meeting_url}</a></p>` : ""}
                </div>
                <p>We look forward to seeing you!</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                  If you need to reschedule, please contact us as soon as possible.
                </p>
              </div>
            `,
            body_text: message,
            notification_type: "appointment_reminder",
            related_entity_id: appointment.id,
          });

          if (emailError) {
            errors.push(`Email failed for ${client.first_name}: ${emailError.message}`);
          } else {
            emailsSent++;
          }
        } catch (err: any) {
          console.error("[REMINDER-CRON] Email error:", err);
          errors.push(`Email error for ${client.first_name}: ${err.message}`);
        }
      }

      // Mark reminder as sent
      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appointment.id);
    }

    console.log(`[REMINDER-CRON] Complete - Emails: ${emailsSent}, SMS: ${smsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        smsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[REMINDER-CRON] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});