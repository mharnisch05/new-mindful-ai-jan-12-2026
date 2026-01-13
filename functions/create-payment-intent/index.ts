import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[PAYMENT-INTENT] Function invoked");

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("User not authenticated");
    }

    console.log("[PAYMENT-INTENT] User authenticated:", user.id);

    // Parse request body
    const { invoiceId, amount, email } = await req.json();
    
    if (!invoiceId || !amount || !email) {
      throw new Error("Missing required fields: invoiceId, amount, or email");
    }

    console.log("[PAYMENT-INTENT] Creating payment intent for invoice:", invoiceId, "Amount:", amount);

    // Initialize Stripe with live key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      receipt_email: email,
      metadata: {
        invoice_id: invoiceId,
        user_id: user.id,
      },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    console.log("[PAYMENT-INTENT] PaymentIntent created:", paymentIntent.id);

    // Fetch invoice to get correct therapist_id and client_id
    const { data: invoiceData, error: invoiceError } = await supabaseClient
      .from("invoices")
      .select("therapist_id, client_id")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoiceData) {
      console.error("[PAYMENT-INTENT] Failed to fetch invoice:", invoiceError);
      throw new Error("Could not find invoice");
    }

    // Log payment attempt with correct IDs
    const { error: logError } = await supabaseClient
      .from("payments")
      .insert({
        invoice_id: invoiceId,
        amount: amount,
        status: "pending",
        stripe_payment_intent_id: paymentIntent.id,
        client_id: invoiceData.client_id,
        therapist_id: invoiceData.therapist_id,
      });

    if (logError) {
      console.error("[PAYMENT-INTENT] Error logging payment:", logError);
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[PAYMENT-INTENT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
