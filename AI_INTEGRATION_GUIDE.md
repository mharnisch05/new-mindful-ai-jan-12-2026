# AI Integration Guide - Dual Model Router

## Overview
The Mindful AI platform now features intelligent AI routing between Anthropic Claude Sonnet 4.5 and OpenAI GPT-5, with automatic fallback and comprehensive cost tracking.

## Configuration

### Environment Variables
The following secrets are configured in Supabase:
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `OPENAI_API_KEY` - OpenAI API key for GPT models

### Edge Function
Location: `supabase/functions/ai-router/index.ts`

## Routing Logic

### Model Selection
The router uses a **primary-fallback** approach:

**Claude 3 Sonnet** (Primary)
- Handles all AI requests by default
- Cost: ~$0.003/1K input tokens, ~$0.015/1K output tokens

**GPT-4** (Fallback Only)
- Only used when Claude fails or times out
- Cost: ~$0.03/1K input tokens, ~$0.06/1K output tokens

### Fallback Mechanism
- Each request has a 5-second timeout
- If primary model fails, automatically retries with alternate model
- If both models fail, returns user-friendly error message
- All attempts are logged for monitoring

## Usage Example

### Frontend Integration

```typescript
import { supabase } from "@/integrations/supabase/client";

async function callAI(messages: Array<{role: string, content: string}>) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-router`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages }),
      }
    );

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('AI call error:', error);
    throw error;
  }
}

// Usage
const result = await callAI([
  { role: "user", content: "Analyze this patient's progress..." }
]);
```

## Cost Tracking

### Database Schema
All AI calls are logged to `ai_usage_log` table:
```sql
ai_usage_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  cost NUMERIC,
  created_at TIMESTAMP
)
```

### Cost Calculation
- Input cost = (tokens_in / 1000) × model_input_rate
- Output cost = (tokens_out / 1000) × model_output_rate
- Total cost = input_cost + output_cost (stored with 4 decimal precision)

### Admin Dashboard
View comprehensive AI usage analytics at `/admin`:
- Token usage by model over time
- Cost per request analysis
- Total cost and average cost metrics
- Recent AI calls with detailed breakdown
- Exportable CSV reports

## Security & Compliance

### HIPAA Compliance
- ✅ No PHI logged - only metadata (model, tokens, cost, user_id)
- ✅ All API keys encrypted in Supabase secrets
- ✅ HTTPS-only communication
- ✅ Audit logging for all admin actions
- ✅ Row-Level Security (RLS) restricts access to admin users only

### Access Control
- AI router requires JWT authentication (`verify_jwt = true`)
- Admin dashboard requires `role = 'admin'` in `user_roles` table
- Only admin users can view cost and usage data

## Monitoring & Analytics

### Key Metrics
- Total AI calls
- Cost per model
- Average response time
- Fallback frequency
- Error rates

### Export Options
All data can be exported as CSV from the Admin Dashboard for:
- Cost analysis
- Usage forecasting
- Budget planning
- Performance monitoring

## Error Handling

### Common Errors
```typescript
// Timeout
{ error: "Timeout" } // 5-second limit exceeded

// Both models failed
{ error: "AI temporarily unavailable. Both models failed." }

// Authentication
{ error: "Invalid authentication" }

// API key missing
{ error: "ANTHROPIC_API_KEY not configured" }
{ error: "OPENAI_API_KEY not configured" }
```

### User-Facing Messages
All errors return user-friendly messages without exposing technical details or PHI.

## Testing Checklist

- ✅ Claude Sonnet handles normal chat and short tasks
- ✅ GPT-5 handles complex or long analytical prompts
- ✅ Automatic fallback between APIs works correctly
- ✅ Each AI call logs tokens and cost in ai_usage_log
- ✅ Admin Dashboard shows accurate AI usage analytics
- ✅ Average response time < 2 seconds for Sonnet, < 5 seconds for GPT-5
- ✅ No PHI data logged anywhere
- ✅ All API keys properly secured

## Future Enhancements

Potential improvements:
- Streaming responses for real-time feedback
- Custom routing rules per user
- Budget alerts and rate limiting
- Multi-model ensemble for critical decisions
- A/B testing different models
