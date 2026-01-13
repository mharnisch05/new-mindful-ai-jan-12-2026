import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { to, message, appointmentId } = await req.json();

    if (!to || !message) {
      throw new Error('Missing required fields: to, message');
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to.replace(/[\s()-]/g, ''))) {
      throw new Error('Invalid phone number format');
    }

    console.log(`Sending SMS to ${to}: ${message.substring(0, 50)}...`);

    // Send SMS with retry logic (up to 3 attempts)
    let smsResult;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: TWILIO_PHONE_NUMBER,
            Body: message,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`Twilio error (attempt ${attempt}):`, error);
          lastError = error;
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw new Error(`Failed to send SMS after ${attempt} attempts: ${error}`);
        }

        smsResult = await response.json();
        console.log('SMS sent successfully:', smsResult.sid);
        
        // Log successful SMS
        await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: 'SMS_SENT',
            entity_type: 'sms',
            entity_id: appointmentId || null,
            success: true,
            new_values: { to, message_sid: smsResult.sid },
          });

        break;
      } catch (error) {
        lastError = error;
        if (attempt === 3) {
          // Log failed attempt
          await supabase
            .from('audit_logs')
            .insert({
              user_id: user.id,
              action: 'SMS_FAILED',
              entity_type: 'sms',
              entity_id: appointmentId || null,
              success: false,
              error_message: error instanceof Error ? error.message : 'Unknown error',
            });

          throw new Error(`Failed to send SMS after 3 attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      messageSid: smsResult?.sid,
      status: smsResult?.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error sending SMS:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});