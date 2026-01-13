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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("Starting payment reminder process...");

    // Get overdue invoices (due date passed and status is pending)
    const today = new Date().toISOString().split('T')[0];
      const { data: overdueInvoices, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select(`
        id,
        invoice_number,
        amount,
        due_date,
        client_id,
        therapist_id,
        clients!inner(first_name, last_name, email),
        profiles!therapist_id(full_name, email)
      `)
      .eq("status", "pending")
      .lt("due_date", today);

    if (invoiceError) throw invoiceError;

    console.log(`Found ${overdueInvoices?.length || 0} overdue invoices`);

    for (const invoice of overdueInvoices || []) {
      // Check if we've sent a reminder in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentReminders } = await supabaseClient
        .from("payment_reminders")
        .select("id")
        .eq("invoice_id", invoice.id)
        .gte("sent_at", sevenDaysAgo.toISOString())
        .limit(1);

      if (recentReminders && recentReminders.length > 0) {
        console.log(`Skipping invoice ${invoice.invoice_number} - reminder sent recently`);
        continue;
      }

      // Queue email notification
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      const client = invoice.clients?.[0];
      const profile = invoice.profiles?.[0];

      if (!client || !profile) {
        console.log(`Skipping invoice ${invoice.invoice_number} - missing client or profile data`);
        continue;
      }

      await supabaseClient.from("email_queue").insert({
        recipient_email: client.email,
        recipient_name: `${client.first_name} ${client.last_name}`,
        subject: `Payment Reminder: Invoice ${invoice.invoice_number} is ${daysOverdue} days overdue`,
        body_html: `
          <h2>Payment Reminder</h2>
          <p>Dear ${client.first_name},</p>
          <p>This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>$${invoice.amount}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
          <p>Original due date: <strong>${new Date(invoice.due_date).toLocaleDateString()}</strong></p>
          <p>Please log in to your client portal to make a payment or contact ${profile.full_name} if you have any questions.</p>
          <p>Thank you,<br>${profile.full_name}</p>
        `,
        body_text: `Payment Reminder\n\nDear ${client.first_name},\n\nThis is a friendly reminder that invoice ${invoice.invoice_number} for $${invoice.amount} is now ${daysOverdue} days overdue.\n\nOriginal due date: ${new Date(invoice.due_date).toLocaleDateString()}\n\nPlease log in to your client portal to make a payment or contact ${profile.full_name} if you have any questions.\n\nThank you,\n${profile.full_name}`,
        notification_type: "payment_reminder",
        related_entity_id: invoice.id,
      });

      // Record the reminder
      await supabaseClient.from("payment_reminders").insert({
        invoice_id: invoice.id,
        reminder_type: "overdue",
      });

      // Update invoice status to overdue
      await supabaseClient
        .from("invoices")
        .update({ status: "overdue" })
        .eq("id", invoice.id);

      console.log(`Queued payment reminder for invoice ${invoice.invoice_number}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: overdueInvoices?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Payment reminder error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
