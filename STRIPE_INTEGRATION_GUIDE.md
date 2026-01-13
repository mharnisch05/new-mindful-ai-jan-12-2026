# Stripe Integration Guide - Mindful AI Solo Plan

## Overview
Complete Stripe checkout and billing integration for the **Mindful AI Solo Plan** ($49/month subscription).

## 🎯 What's Implemented

### 1. **Edge Functions**
- ✅ **create-checkout**: Creates Stripe checkout sessions for the Solo Plan
- ✅ **customer-portal**: Manages billing portal for subscription management
- ✅ **check-subscription**: Verifies subscription status and plan tier
- ✅ **stripe-webhook**: Handles Stripe events and updates database

### 2. **Frontend Pages**
- ✅ **CheckoutSuccess** (`/checkout/success`): Post-payment success page
- ✅ **CheckoutCancel** (`/checkout/cancel`): Checkout cancellation page
- ✅ **Pricing** (`/pricing`): Updated with Solo Plan integration

### 3. **Stripe Configuration**
- **Product**: "Solo Plan" (ID: `prod_TOWS9NCZsSDLis`)
- **Price**: $49/month (ID: `price_1SRjQ1AqpzvXppdtGA1kvoml`)
- **API Key**: Live key configured in secrets

## 🚀 How It Works

### Subscription Flow
1. User clicks "Start 14-Day Free Trial" on Pricing page
2. System creates checkout session via `create-checkout` edge function
3. Stripe Checkout opens in new tab
4. On success → redirects to `/checkout/success?session_id={CHECKOUT_SESSION_ID}`
5. On cancel → redirects to `/checkout/cancel`
6. Webhook updates database with subscription status

### Subscription Management
- Users can manage billing via "Manage Billing" button
- Opens Stripe Customer Portal for:
  - Update payment method
  - Cancel subscription
  - View invoices
  - Update billing information

## 📋 Next Steps

### 1. **Configure Stripe Webhooks** (REQUIRED)
You need to set up webhooks in your Stripe dashboard to enable automatic subscription tracking:

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://usswyhwslbmfawutwyrx.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Add it as a secret: `STRIPE_WEBHOOK_SECRET` (optional but recommended for security)

### 2. **Configure Stripe Customer Portal** (REQUIRED)
Enable the customer portal for subscription management:

1. Go to: https://dashboard.stripe.com/settings/billing/portal
2. Click "Activate" or "Configure"
3. Enable features:
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to view invoices
4. Set cancellation behavior (immediate or at period end)
5. Save settings

### 3. **Test the Integration**
1. **Test Mode**: Switch Stripe to test mode and use test card: `4242 4242 4242 4242`
2. **Live Mode**: Once tested, ensure live API keys are configured
3. **Test Flow**:
   - Visit `/pricing`
   - Click "Start 14-Day Free Trial"
   - Complete checkout
   - Verify success page displays
   - Check "Manage Billing" works
   - Verify webhook events in Stripe Dashboard

## 🔒 Security Features

- ✅ All payments processed via Stripe (PCI compliant)
- ✅ Webhook signature verification (when `STRIPE_WEBHOOK_SECRET` is set)
- ✅ Server-side subscription verification
- ✅ Secure customer portal sessions
- ✅ HTTPS-only communication

## 📊 Database Tracking

The `billing_events` table tracks all subscription events:
- Checkout completions
- Subscription creations
- Subscription updates
- Subscription cancellations

## 🎨 UI Components

### Pricing Page
- Displays Solo Plan prominently as "Most Popular"
- Direct checkout integration
- Mobile responsive

### Success Page
- Confirms subscription activation
- Lists included features
- Links to dashboard and billing management

### Cancel Page
- Friendly message for canceled checkouts
- Options to return to pricing or home

## 💡 Features Included in Solo Plan

- AI-powered SOAP note assistance
- Secure client portal
- Automated scheduling & reminders
- Invoice management with Stripe
- Voice dictation & transcription
- HIPAA-compliant data storage
- Unlimited clients
- Advanced analytics

## 🔧 Troubleshooting

### Checkout Not Working
- Verify `STRIPE_SECRET_KEY` is set correctly
- Check browser console for errors
- Ensure user is authenticated

### Subscription Not Showing as Active
- Wait 1-2 minutes for webhook processing
- Check webhook endpoint is configured
- View edge function logs for errors
- Manually trigger subscription refresh

### Customer Portal Not Opening
- Ensure portal is activated in Stripe dashboard
- Check edge function logs
- Verify customer exists in Stripe

## 📝 Important Notes

- The Solo Plan includes a 14-day free trial
- Subscriptions auto-renew monthly
- Cancellation takes effect at period end (configurable)
- All subscription logic is server-side for security
- Database syncs via webhooks for real-time updates

## 🎯 Summary

Your Stripe integration is **ready for testing**. Complete the "Next Steps" above to:
1. Configure webhooks
2. Activate customer portal
3. Test the full flow

Once tested in test mode, switch to live mode and you're ready to accept real subscriptions!
