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
    console.log("Starting recurring billing process...");

    const today = new Date().toISOString().split('T')[0];
    
    // Get recurring billing items due today or earlier
    const { data: recurringItems, error: recurringError } = await supabaseClient
      .from("recurring_billing")
      .select(`
        *,
        clients!inner(first_name, last_name, email),
        profiles!therapist_id(full_name)
      `)
      .eq("active", true)
      .lte("next_billing_date", today);

    if (recurringError) throw recurringError;

    console.log(`Found ${recurringItems?.length || 0} recurring billing items to process`);

    for (const item of recurringItems || []) {
      // Generate invoice number
      const date = new Date();
      const invoiceNumber = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from("invoices")
        .insert({
          therapist_id: item.therapist_id,
          client_id: item.client_id,
          invoice_number: invoiceNumber,
          amount: item.amount,
          due_date: dueDate.toISOString().split('T')[0],
          notes: item.description || `Recurring ${item.frequency} billing`,
          status: "pending",
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Failed to create invoice for recurring billing ${item.id}:`, invoiceError);
        continue;
      }

      // Calculate next billing date
      const nextDate = new Date(item.next_billing_date);
      switch (item.frequency) {
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "biweekly":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }

      // Update recurring billing next date
      await supabaseClient
        .from("recurring_billing")
        .update({ next_billing_date: nextDate.toISOString().split('T')[0] })
        .eq("id", item.id);

      const client = item.clients?.[0];
      const profile = item.profiles?.[0];

      if (!client || !profile) {
        console.log(`Skipping recurring billing ${item.id} - missing client or profile data`);
        continue;
      }

      // Queue email notification
      await supabaseClient.from("email_queue").insert({
        recipient_email: client.email,
        recipient_name: `${client.first_name} ${client.last_name}`,
        subject: `New Invoice: ${invoiceNumber}`,
        body_html: `
          <h2>New Invoice</h2>
          <p>Dear ${client.first_name},</p>
          <p>A new invoice has been generated for your recurring billing.</p>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Amount:</strong> $${item.amount}</p>
          <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
          <p>Please log in to your client portal to view and pay the invoice.</p>
          <p>Thank you,<br>${profile.full_name}</p>
        `,
        body_text: `New Invoice\n\nDear ${client.first_name},\n\nA new invoice has been generated for your recurring billing.\n\nInvoice Number: ${invoiceNumber}\nAmount: $${item.amount}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\n\nPlease log in to your client portal to view and pay the invoice.\n\nThank you,\n${profile.full_name}`,
        notification_type: "invoice_created",
        related_entity_id: invoice.id,
      });

      console.log(`Created invoice ${invoiceNumber} for recurring billing ${item.id}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: recurringItems?.length || 0 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Recurring billing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
