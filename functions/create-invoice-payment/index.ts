import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const body = await req.json();
    const invoice_id = body.invoice_id || body.invoiceId;
    if (!invoice_id) throw new Error("invoice_id is required");
 
    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("*, clients(first_name, last_name, email)")
      .eq("id", invoice_id)
      .single();

    if (invoiceError || !invoice) throw new Error("Invoice not found");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ 
      email: invoice.clients.email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: invoice.clients.email,
        name: `${invoice.clients.first_name} ${invoice.clients.last_name}`,
      });
      customerId = customer.id;
    }

    // Create payment record
    const { data: payment } = await supabaseClient
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        therapist_id: invoice.therapist_id,
        client_id: invoice.client_id,
        amount: invoice.amount,
        status: "pending",
      })
      .select()
      .single();

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: invoice.notes || "Therapy services",
            },
            unit_amount: Math.round(parseFloat(invoice.amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/billing?payment=success&invoice_id=${invoice_id}`,
      cancel_url: `${req.headers.get("origin")}/billing?payment=canceled`,
      metadata: {
        invoice_id: invoice.id,
        payment_id: payment.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
