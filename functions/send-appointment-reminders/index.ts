import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get appointments happening in 24 hours
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setHours(dayAfterTomorrow.getHours() + 25);

    const { data: appointments, error: appointmentsError } = await supabaseClient
      .from("appointments")
      .select(`
        id,
        appointment_date,
        duration_minutes,
        clients:client_id (
          first_name,
          last_name,
          email
        ),
        profiles:therapist_id (
          full_name
        )
      `)
      .gte("appointment_date", tomorrow.toISOString())
      .lt("appointment_date", dayAfterTomorrow.toISOString())
      .eq("status", "scheduled");

    if (appointmentsError) throw appointmentsError;

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No appointments to remind" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reminders = [];

    for (const appointment of appointments) {
      const client = Array.isArray(appointment.clients) ? appointment.clients[0] : appointment.clients;
      const profile = Array.isArray(appointment.profiles) ? appointment.profiles[0] : appointment.profiles;
      
      if (!client?.email) continue;

      const appointmentDate = new Date(appointment.appointment_date);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const subject = `Appointment Reminder - Tomorrow at ${formattedTime}`;
      const bodyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Appointment Reminder</h2>
          <p>Hello ${client.first_name},</p>
          <p>This is a reminder that you have an appointment scheduled with ${profile?.full_name || 'your therapist'}.</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${formattedTime}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration_minutes} minutes</p>
          </div>
          <p>Please log in to your client portal for session details or if you need to reschedule.</p>
          <p style="color: #6B7280; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact your therapist directly.
          </p>
        </div>
      `;

      const bodyText = `
Appointment Reminder

Hello ${client.first_name},

This is a reminder that you have an appointment scheduled with ${profile?.full_name || 'your therapist'}.

Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${appointment.duration_minutes} minutes

Please log in to your client portal for session details or if you need to reschedule.
      `;

      // Queue the reminder email
      const { error: emailError } = await supabaseClient
        .from("email_queue")
        .insert({
          recipient_email: client.email,
          recipient_name: `${client.first_name} ${client.last_name}`,
          subject,
          body_html: bodyHtml,
          body_text: bodyText,
          notification_type: "appointment_reminder",
          related_entity_id: appointment.id,
          status: 'pending',
          scheduled_for: new Date().toISOString()
        });

      if (emailError) {
        console.error(`Error queuing reminder for appointment ${appointment.id}:`, emailError);
      } else {
        reminders.push(appointment.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        reminders_queued: reminders.length,
        appointment_ids: reminders
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending appointment reminders:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
