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
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    const { action, code, appointmentId, summary, startTime, endTime, description } = await req.json();

    if (action === 'authorize') {
      const redirectUri = `${req.headers.get('origin')}/settings`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
      
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback' && code) {
      const redirectUri = `${req.headers.get('origin')}/settings`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Store in integration_settings
      const { error: dbError } = await supabase
        .from('integration_settings')
        .upsert({
          therapist_id: user.id,
          integration_type: 'google_calendar',
          is_enabled: true,
          credentials_encrypted: JSON.stringify({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
          }),
        });

      if (dbError) throw new Error('Failed to store credentials');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create_event') {
      // Get credentials
      const { data: integration } = await supabase
        .from('integration_settings')
        .select('credentials_encrypted')
        .eq('therapist_id', user.id)
        .eq('integration_type', 'google_calendar')
        .single();

      if (!integration) throw new Error('Google Calendar not connected');

      const credentials = JSON.parse(integration.credentials_encrypted);
      let accessToken = credentials.access_token;

      // Refresh token if expired
      if (new Date(credentials.expires_at) <= new Date()) {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID!,
            client_secret: GOOGLE_CLIENT_SECRET!,
            refresh_token: credentials.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (!refreshResponse.ok) throw new Error('Failed to refresh token');

        const refreshData = await refreshResponse.json();
        accessToken = refreshData.access_token;

        await supabase
          .from('integration_settings')
          .update({
            credentials_encrypted: JSON.stringify({
              ...credentials,
              access_token: refreshData.access_token,
              expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
            }),
          })
          .eq('therapist_id', user.id)
          .eq('integration_type', 'google_calendar');
      }

      // Create event with retry logic
      const eventData = {
        summary: summary || 'Therapy Session',
        description: description || '',
        start: { dateTime: startTime, timeZone: 'America/New_York' },
        end: { dateTime: endTime, timeZone: 'America/New_York' },
        reminders: { useDefault: true },
      };

      let event;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
          });

          if (!response.ok) {
            const error = await response.text();
            console.error(`Google Calendar error (attempt ${attempt}):`, error);
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
            throw new Error(error);
          }

          event = await response.json();
          console.log('Google Calendar event created:', event.id);
          break;
        } catch (error) {
          if (attempt === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      return new Response(JSON.stringify({ success: true, eventId: event?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});