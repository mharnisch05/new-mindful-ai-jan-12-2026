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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { appointmentId, topic, startTime, duration, clientName, clientEmail } = await req.json();

    console.log('Creating Zoom meeting for appointment:', appointmentId);

    // Get therapist's Zoom tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('zoom_auth_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error('Token fetch error:', tokenError);
      throw new Error('Zoom not connected. Please connect Zoom in Settings.');
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID');
      const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET');
      
      const refreshResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token!,
        }),
      });

      if (!refreshResponse.ok) {
        console.error('Token refresh failed');
        throw new Error('Failed to refresh Zoom token. Please reconnect Zoom in Settings.');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      // Update stored tokens
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
      await supabase
        .from('zoom_auth_tokens')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || tokenData.refresh_token,
          expires_at: newExpiresAt.toISOString(),
        })
        .eq('user_id', user.id);
    }

    // Create Zoom meeting with retry logic
    const meetingData = {
      topic: topic || `Therapy Session with ${clientName}`,
      type: 2, // Scheduled meeting
      start_time: startTime, // ISO 8601 format
      duration: duration || 60, // minutes
      timezone: 'America/New_York', // TODO: Get from user preferences
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        auto_recording: 'none',
      },
    };

    console.log('Creating meeting with data:', meetingData);

    // Retry logic for Zoom API (up to 3 attempts)
    let meeting;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const zoomResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(meetingData),
        });

        if (!zoomResponse.ok) {
          const error = await zoomResponse.text();
          console.error(`Zoom API error (attempt ${attempt}):`, error);
          lastError = error;
          
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          throw new Error(`Failed to create Zoom meeting after ${attempt} attempts: ${error}`);
        }

        meeting = await zoomResponse.json();
        console.log('Zoom meeting created successfully:', meeting.id);
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 3) {
          throw new Error(`Failed to create Zoom meeting after 3 attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!meeting) {
      throw new Error('Failed to create Zoom meeting');
    }
    console.log('Zoom meeting created:', meeting.id);

    // Update appointment with Zoom meeting details
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        zoom_meeting_url: meeting.join_url,
        zoom_meeting_id: meeting.id.toString(),
        zoom_meeting_password: meeting.password || meeting.encrypted_password,
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('Failed to update appointment:', updateError);
      // Don't throw - meeting was created successfully
    }

    // Queue email to send Zoom link to client
    if (clientEmail) {
      await supabase
        .from('email_queue')
        .insert({
          recipient_email: clientEmail,
          recipient_name: clientName,
          subject: 'Zoom Meeting Details for Your Upcoming Appointment',
          body_html: `
            <h2>Your Therapy Session</h2>
            <p>Hi ${clientName},</p>
            <p>Your upcoming appointment has been scheduled. Here are your Zoom meeting details:</p>
            <p><strong>Topic:</strong> ${meeting.topic}</p>
            <p><strong>Time:</strong> ${new Date(startTime).toLocaleString()}</p>
            <p><strong>Duration:</strong> ${duration} minutes</p>
            <p><strong>Join URL:</strong> <a href="${meeting.join_url}">${meeting.join_url}</a></p>
            ${meeting.password ? `<p><strong>Password:</strong> ${meeting.password}</p>` : ''}
            <p>Please join a few minutes before the scheduled time.</p>
          `,
          body_text: `
Your Therapy Session

Hi ${clientName},

Your upcoming appointment has been scheduled. Here are your Zoom meeting details:

Topic: ${meeting.topic}
Time: ${new Date(startTime).toLocaleString()}
Duration: ${duration} minutes
Join URL: ${meeting.join_url}
${meeting.password ? `Password: ${meeting.password}` : ''}

Please join a few minutes before the scheduled time.
          `,
          notification_type: 'appointment_zoom',
          related_entity_id: appointmentId,
        });
    }

    return new Response(JSON.stringify({
      success: true,
      meetingUrl: meeting.join_url,
      meetingId: meeting.id,
      password: meeting.password || meeting.encrypted_password,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Zoom meeting:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
