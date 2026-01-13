import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    // Verify webhook signature (optional but recommended - set your webhook secret in env)
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    let event: Stripe.Event;
    
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Invalid signature";
        logStep("Webhook signature verification failed", { error: errorMessage });
        return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      event = JSON.parse(body);
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { sessionId: session.id, customerId: session.customer });
        
        // Get customer email
        const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
        
        // Log billing event
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userData) {
          await supabaseClient
            .from('billing_events')
            .insert({
              user_id: userData.id,
              status: 'completed',
              amount: (session.amount_total || 0) / 100,
              plan: 'solo'
            });
          
          logStep("Billing event logged", { userId: userData.id });
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription created", { subscriptionId: subscription.id, status: subscription.status });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userData) {
          await supabaseClient
            .from('billing_events')
            .insert({
              user_id: userData.id,
              status: 'active',
              amount: subscription.items.data[0].price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
              plan: 'solo'
            });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userData) {
          await supabaseClient
            .from('billing_events')
            .insert({
              user_id: userData.id,
              status: subscription.status,
              amount: subscription.items.data[0].price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
              plan: 'solo'
            });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription canceled", { subscriptionId: subscription.id });
        
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        const { data: userData } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', customer.email)
          .single();

        if (userData) {
          await supabaseClient
            .from('billing_events')
            .insert({
              user_id: userData.id,
              status: 'canceled',
              amount: 0,
              plan: 'solo'
            });
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Trial ending soon", { subscriptionId: subscription.id });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { invoiceId: invoice.id, amount: invoice.amount_paid });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true, eventId: event.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
