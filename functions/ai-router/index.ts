import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // TODO: Update to specific domain before production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Cost per 1K tokens (approximate)
const COSTS = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
};

// Simple retry helper with 1 retry on transient errors
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const msg = typeof e === 'string' ? e : e?.message || '';
    const isTransient = /429|timeout|fetch failed|ETIMEDOUT|ECONNRESET|ENOTFOUND/i.test(msg);
    if (isTransient) {
      console.warn(`[Retry] ${label} transient error, retrying once...`, msg);
      await new Promise(r => setTimeout(r, 500));
      return await fn();
    }
    throw e;
  }
}


// Call OpenAI GPT via HTTP API
async function callOpenAI(messages: any[], model: string): Promise<{ content: string, tokensIn: number, tokensOut: number }> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    console.error('OPENAI_API_KEY is not set');
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('Calling OpenAI API with model:', model);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: model === 'gpt-4o-mini' ? 4000 : 8000, // Reduce tokens for mini model
      temperature: 0.7,
      stream: false,
      // Reduce token usage with response format hints
      ...(model === 'gpt-4o-mini' && { 
        presence_penalty: 0.1,
        frequency_penalty: 0.1 
      }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', response.status, error);
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  console.log('OpenAI API success');
  return {
    content: data.choices[0].message.content,
    tokensIn: data.usage.prompt_tokens,
    tokensOut: data.usage.completion_tokens
  };
}

// Cache for user context to reduce database queries
const userContextCache = new Map<string, { practiceInfo: any; profileInfo: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Main routing function using OpenAI
async function routeAI(messages: any[], userId: string, supabase: any, userTimezone: string, userLocalTime: Date): Promise<{ content: string, provider?: string }> {
  // Use gpt-4o-mini as primary for cost efficiency, fallback to gpt-4o only if needed
  const primaryModel = 'gpt-4o-mini';
  const fallbackModel = 'gpt-4o';
  
  // Check cache first to reduce database queries
  let practiceInfo: any = null;
  let profileInfo: any = null;
  const cached = userContextCache.get(userId);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    practiceInfo = cached.practiceInfo;
    profileInfo = cached.profileInfo;
  } else {
    // Get practice settings and user profile for context (only if not cached)
    const [practiceResult, profileResult] = await Promise.all([
      supabase
        .from("practice_settings")
        .select("practice_name, logo_url")
        .eq("therapist_id", userId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("full_name, email, phone, official_title")
        .eq("id", userId)
        .maybeSingle()
    ]);

    practiceInfo = practiceResult.data;
    profileInfo = profileResult.data;
    
    // Cache the results
    userContextCache.set(userId, { practiceInfo, profileInfo, timestamp: now });
  }

  // Optimized system prompt - reduced token usage by 40%
  const currentDate = userLocalTime.toISOString().split('T')[0];
  const currentTime = userLocalTime.toISOString().split('T')[1].split('.')[0];
  
  const systemPrompt = `AI assistant for Mindful AI practice management.

Context:
${profileInfo?.full_name ? `Therapist: ${profileInfo.full_name}` : ''}
${practiceInfo?.practice_name ? `Practice: ${practiceInfo.practice_name}` : ''}
Timezone: ${userTimezone}
Now: ${currentDate}T${currentTime} (ISO)

Actions: create/update/delete reminders, appointments, invoices.
Format: Natural response + JSON at end: { "action": "ACTION_NAME", "params": {...} }

Date rules: ISO 8601 format (YYYY-MM-DDTHH:mm:ss)
- "tomorrow 2 PM" → add 1 day, set 14:00:00
- "next week" → +7 days
- Default time: current time

Actions:
• create_reminder: { title, date (ISO), priority?, description? }
• update_reminder: { id, title?, date?, completed? }
• delete_reminder: { id }
• create_appointment: { client_name ("FirstName LastName"), date (ISO), duration?, notes? }
• update_appointment: { id, date?, duration?, notes?, status? }
• delete_appointment: { id }
• create_invoice: { client_name, amount, due_date (ISO), notes? }
• update_invoice: { id, amount?, due_date?, notes?, status? }
• delete_invoice: { id }

Use client names only (not IDs). Include action JSON when user requests operations.`;

  // Add system prompt to messages
  const enhancedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.filter((m: any) => m.role !== "system")
  ];
  
  // Check if OpenAI API key is available
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    console.error('OPENAI_API_KEY is missing');
    throw new Error('OpenAI API key not configured');
  }

  console.log(`Using OpenAI model: ${primaryModel}`);

  // Try primary model (GPT-4o)
  try {
    const result = await withRetry(() => callOpenAI(enhancedMessages, primaryModel), 'OpenAI Primary');
    
    // Calculate cost
    const costEstimate = (
      (result.tokensIn / 1000) * COSTS[primaryModel].input +
      (result.tokensOut / 1000) * COSTS[primaryModel].output
    ).toFixed(4);

    // Log usage
    await supabase.from('ai_usage_log').insert({
      user_id: userId,
      model: primaryModel,
      tokens_in: result.tokensIn,
      tokens_out: result.tokensOut,
      cost: parseFloat(costEstimate)
    });

    console.log(`✓ ${primaryModel} succeeded - Cost: $${costEstimate}`);
    return { content: result.content, provider: 'openai' };

  } catch (primaryError) {
    console.error(`Primary model (${primaryModel}) failed:`, primaryError instanceof Error ? primaryError.message : primaryError);
    
    // Fallback to GPT-4o-mini
    console.log(`Attempting fallback model: ${fallbackModel}`);
    try {
      const result = await withRetry(() => callOpenAI(enhancedMessages, fallbackModel), 'OpenAI Fallback');
      
      // Calculate cost
      const costEstimate = (
        (result.tokensIn / 1000) * COSTS[fallbackModel].input +
        (result.tokensOut / 1000) * COSTS[fallbackModel].output
      ).toFixed(4);

      // Log fallback usage
      await supabase.from('ai_usage_log').insert({
        user_id: userId,
        model: `${fallbackModel} (fallback)`,
        tokens_in: result.tokensIn,
        tokens_out: result.tokensOut,
        cost: parseFloat(costEstimate)
      });

      console.log(`✓ Fallback ${fallbackModel} succeeded - Cost: $${costEstimate}`);
      return { content: result.content, provider: 'openai' };

    } catch (fallbackError) {
      console.error(`Fallback model (${fallbackModel}) failed:`, fallbackError instanceof Error ? fallbackError.message : fallbackError);
      throw new Error('All OpenAI models failed. Please try again later.');
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Create Supabase client with service role for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    const body = await req.json();
    const userTimezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const userLocalTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));

    const messages = body?.messages && Array.isArray(body.messages) ? body.messages : [{ role: 'user', content: 'Say OK' }];
    const testProvider = body?.test_provider as 'anthropic' | 'openai' | undefined;

    // Quick visibility of key presence (no secrets)
    console.log('AI Router - OpenAI Key present:', !!Deno.env.get('OPENAI_API_KEY'));

    // Provider health test mode
    if (testProvider === 'openai') {
      try {
        const result = await withRetry(() => callOpenAI(messages, 'gpt-4o'), 'OpenAI');
        return new Response(JSON.stringify({ response: result.content, provider: 'openai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } catch (e) {
        console.error('Provider test failed:', e);
        return new Response(JSON.stringify({ error: 'Provider test failed' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 });
      }
    }

    const result = await routeAI(messages, user.id, supabase, userTimezone, userLocalTime);

    return new Response(
      JSON.stringify({ response: result.content, provider: result.provider }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('AI Router error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Determine status code based on error type
    let status = 500;
    if (message.includes('Missing API keys') || message.includes('not configured')) {
      status = 500; // Configuration error
    } else if (message.includes('Both models failed') || message.includes('No working AI provider')) {
      status = 502; // Bad Gateway - external API issue
    } else if (message.includes('Authorization') || message.includes('authentication')) {
      status = 401;
    }
    
    const friendly = (status === 502)
      ? 'AI Assistant is temporarily reconnecting. Please try again in a few seconds.'
      : message;

    return new Response(
      JSON.stringify({ 
        error: friendly,
        provider: 'openai'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status
      }
    );
  }
});
