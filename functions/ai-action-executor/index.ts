import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logPHIAccess, verifyPHIAccess, HIPAA_ERRORS } from "../_shared/hipaaCompliance.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict in production
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

// Import rate limiting (note: this is a simplified version, consider Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (userId: string, maxRequests = 20, windowMs = 60000): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(userId, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting check
    if (!checkRateLimit(user.id)) {
      console.warn("Rate limit exceeded for user:", user.id);
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params, timezone } = await req.json();
    console.log("AI Action Executor:", action, params, "Timezone:", timezone);

    // Input validation
    if (!action || typeof action !== 'string') {
      return new Response(JSON.stringify({ error: "Invalid action parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the action attempt
    await supabaseClient.from("audit_logs").insert({
      user_id: user.id,
      action: `AI_ACTION_ATTEMPT_${action}`,
      entity_type: "ai_action",
      entity_id: null,
      success: false, // Will be updated to true if successful
      new_values: { action, params_keys: Object.keys(params || {}) }
    });

    // Enhanced client name resolution with better matching
    if (params?.client_id && typeof params.client_id === 'string' && !params.client_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log("Converting client name to ID:", params.client_id);
      
      // Search for all clients
      const { data: clients, error: clientError } = await supabaseClient
        .from('clients')
        .select('id, first_name, last_name')
        .eq('therapist_id', user.id);
      
      if (clientError || !clients || clients.length === 0) {
        throw new Error(`Could not find any clients. Please ensure clients are added to your account.`);
      }

      const nameToMatch = params.client_id.toLowerCase().trim();
      
      // Try exact full name match first (most specific)
      let matchedClients = clients.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const reverseName = `${c.last_name}, ${c.first_name}`.toLowerCase();
        return fullName === nameToMatch || reverseName === nameToMatch;
      });

      // If no exact match, try first name only
      if (matchedClients.length === 0) {
        matchedClients = clients.filter(c => 
          c.first_name.toLowerCase() === nameToMatch
        );
      }

      // If still no match, try partial matching
      if (matchedClients.length === 0) {
        matchedClients = clients.filter(c => {
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
          return fullName.includes(nameToMatch) || nameToMatch.includes(c.first_name.toLowerCase());
        });
      }

      if (matchedClients.length === 0) {
        const clientList = clients.map(c => `${c.first_name} ${c.last_name}`).join(', ');
        throw new Error(`No client found matching "${params.client_id}". Available clients: ${clientList}`);
      }

      if (matchedClients.length > 1) {
        const matchList = matchedClients.map(c => `${c.first_name} ${c.last_name}`).join(', ');
        throw new Error(`Multiple clients match "${params.client_id}": ${matchList}. Please be more specific (use full name).`);
      }

      // Single match found
      const matchedClient = matchedClients[0];
      params.client_id = matchedClient.id;
      console.log("Found client ID:", params.client_id, `(${matchedClient.first_name} ${matchedClient.last_name})`);
    }

    // Also support explicit client_name parameter when no client_id is provided
    if (params?.client_name && !params.client_id) {
      const rawName = String(params.client_name);
      console.log("Resolving client_name to ID:", rawName);

      const { data: clients, error: clientError } = await supabaseClient
        .from('clients')
        .select('id, first_name, last_name')
        .eq('therapist_id', user.id);

      if (clientError || !clients || clients.length === 0) {
        throw new Error(`Could not find any clients. Please ensure clients are added to your account.`);
      }

      const nameToMatch = rawName.toLowerCase().trim();
      let matchedClients = clients.filter(c => {
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const reverseName = `${c.last_name}, ${c.first_name}`.toLowerCase();
        return fullName === nameToMatch || reverseName === nameToMatch;
      });

      if (matchedClients.length === 0) {
        matchedClients = clients.filter(c => {
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
          return fullName.includes(nameToMatch);
        });
      }

      if (matchedClients.length === 0) {
        throw new Error(`No client found matching "${rawName}". Please check the name and try again.`);
      }

      if (matchedClients.length > 1) {
        const matchList = matchedClients.map(c => `${c.first_name} ${c.last_name}`).join(', ');
        throw new Error(`Multiple clients match "${rawName}": ${matchList}. Please be more specific (use full name).`);
      }

      const matchedClient = matchedClients[0];
      params.client_id = matchedClient.id;
      console.log("Found client ID from client_name:", params.client_id, `(${matchedClient.first_name} ${matchedClient.last_name})`);
    }

    // Validation schemas
    const CreateReminderSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      date: z.string(),
      priority: z.enum(['low', 'medium', 'high']).optional()
    });

    const CreateAppointmentSchema = z.object({
      client_id: z.string().uuid(),
      date: z.string(),
      duration: z.number().int().min(15).max(480).optional(),
      notes: z.string().max(2000).optional()
    });

    const CreateInvoiceSchema = z.object({
      client_id: z.string().uuid(),
      amount: z.number().positive().max(999999.99),
      due_date: z.string().optional(),
      notes: z.string().max(2000).optional()
    });

    const UpdateReminderSchema = z.object({
      id: z.string().uuid(),
      completed: z.boolean().optional(),
      title: z.string().min(1).max(200).optional(),
      date: z.string().optional()
    });

    const UpdateAppointmentSchema = z.object({
      id: z.string().uuid(),
      date: z.string().optional(),
      duration: z.number().int().min(15).max(480).optional(),
      notes: z.string().max(2000).optional(),
      status: z.enum(['scheduled', 'completed', 'cancelled']).optional()
    });

    const UpdateInvoiceSchema = z.object({
      id: z.string().uuid(),
      amount: z.number().positive().max(999999.99).optional(),
      due_date: z.string().optional(),
      notes: z.string().max(2000).optional(),
      status: z.enum(['pending', 'paid', 'void', 'overdue']).optional()
    });

    const DeleteSchema = z.object({
      id: z.string().uuid()
    });

    // Helper function to convert date to user's timezone
    const toUserTimezone = (dateStr: string) => {
      const userTz = timezone || 'America/New_York';
      const date = new Date(dateStr);
      // Ensure we're using the correct timezone
      const localDate = new Date(date.toLocaleString('en-US', { timeZone: userTz }));
      return localDate.toISOString();
    };

    // Helper function to verify client belongs to therapist (HIPAA compliance)
    const verifyClientAccess = async (clientId: string) => {
      const hasAccess = await verifyPHIAccess(supabaseClient, user.id, clientId);
      if (!hasAccess) {
        // Log unauthorized access attempt
        await supabaseClient.from('audit_logs').insert({
          user_id: user.id,
          action: 'HIPAA_VIOLATION_UNAUTHORIZED_PHI_ACCESS',
          entity_type: 'client',
          entity_id: clientId,
          success: false,
          error_message: HIPAA_ERRORS.UNAUTHORIZED_ACCESS.message
        });
        throw new Error(HIPAA_ERRORS.UNAUTHORIZED_ACCESS.message);
      }
      
      const { data: client, error } = await supabaseClient
        .from('clients')
        .select('id, first_name, last_name')
        .eq('id', clientId)
        .single();
      
      if (error || !client) {
        throw new Error('Invalid client or access denied');
      }
      return client;
    };

    let result = null;
    let entityId = null;

    switch (action) {
      case "create_reminder": {
        const validated = CreateReminderSchema.parse(params);
        const { data, error } = await supabaseClient
          .from("reminders")
          .insert({
            therapist_id: user.id,
            title: validated.title,
            description: validated.description,
            reminder_date: toUserTimezone(validated.date),
            priority: validated.priority || "medium",
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      case "create_appointment": {
        const validated = CreateAppointmentSchema.parse(params);
        const client = await verifyClientAccess(validated.client_id);
        
        // Log PHI access for HIPAA compliance
        await logPHIAccess(supabaseClient, {
          userId: user.id,
          accessType: 'write',
          entityType: 'appointment',
          clientId: validated.client_id,
          justification: 'AI assistant creating appointment per user request',
          accessedFields: ['client_id', 'appointment_date', 'duration_minutes', 'notes'],
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        });
        
        const { data, error } = await supabaseClient
          .from("appointments")
          .insert({
            therapist_id: user.id,
            client_id: validated.client_id,
            appointment_date: toUserTimezone(validated.date),
            duration_minutes: validated.duration || 60,
            notes: validated.notes,
            status: "scheduled",
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      case "create_invoice": {
        const validated = CreateInvoiceSchema.parse(params);
        const client = await verifyClientAccess(validated.client_id);
        
        // Log PHI access for HIPAA compliance
        await logPHIAccess(supabaseClient, {
          userId: user.id,
          accessType: 'write',
          entityType: 'invoice',
          clientId: validated.client_id,
          justification: 'AI assistant creating invoice per user request',
          accessedFields: ['client_id', 'amount', 'due_date', 'notes'],
          ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
          userAgent: req.headers.get('user-agent') || 'unknown'
        });
        
        const invoiceNumber = `INV-${Date.now()}`;
        const { data, error } = await supabaseClient
          .from("invoices")
          .insert({
            therapist_id: user.id,
            client_id: validated.client_id,
            amount: validated.amount,
            invoice_number: invoiceNumber,
            due_date: validated.due_date,
            notes: validated.notes,
            status: "pending",
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      case "update_reminder": {
        const validated = UpdateReminderSchema.parse(params);
        const updateData: any = {};
        if (validated.completed !== undefined) updateData.completed = validated.completed;
        if (validated.title) updateData.title = validated.title;
        if (validated.date) updateData.reminder_date = validated.date;

        const { data, error } = await supabaseClient
          .from("reminders")
          .update(updateData)
          .eq("id", validated.id)
          .eq("therapist_id", user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      case "delete_reminder": {
        const validated = DeleteSchema.parse(params);
        const { error } = await supabaseClient
          .from("reminders")
          .delete()
          .eq("id", validated.id)
          .eq("therapist_id", user.id);

        if (error) throw error;
        result = { deleted: true };
        entityId = validated.id;
        break;
      }

      // New: update appointment
      case "update_appointment": {
        const validated = UpdateAppointmentSchema.parse(params);
        const updateData: any = {};
        if (validated.date) updateData.appointment_date = validated.date;
        if (validated.duration !== undefined) updateData.duration_minutes = validated.duration;
        if (validated.notes !== undefined) updateData.notes = validated.notes;
        if (validated.status) updateData.status = validated.status;

        const { data, error } = await supabaseClient
          .from("appointments")
          .update(updateData)
          .eq("id", validated.id)
          .eq("therapist_id", user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      // New: delete appointment
      case "delete_appointment": {
        const validated = DeleteSchema.parse(params);
        const { error } = await supabaseClient
          .from("appointments")
          .delete()
          .eq("id", validated.id)
          .eq("therapist_id", user.id);

        if (error) throw error;
        result = { deleted: true };
        entityId = validated.id;
        break;
      }

      // New: update invoice
      case "update_invoice": {
        const validated = UpdateInvoiceSchema.parse(params);
        const updateData: any = {};
        if (validated.amount !== undefined) updateData.amount = validated.amount;
        if (validated.due_date) updateData.due_date = validated.due_date;
        if (validated.notes !== undefined) updateData.notes = validated.notes;
        if (validated.status) updateData.status = validated.status;

        const { data, error } = await supabaseClient
          .from("invoices")
          .update(updateData)
          .eq("id", validated.id)
          .eq("therapist_id", user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        entityId = data.id;
        break;
      }

      // New: delete invoice
      case "delete_invoice": {
        const validated = DeleteSchema.parse(params);
        const { error } = await supabaseClient
          .from("invoices")
          .delete()
          .eq("id", validated.id)
          .eq("therapist_id", user.id);

        if (error) throw error;
        result = { deleted: true };
        entityId = validated.id;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Log the successful action
    await supabaseClient.from("ai_actions").insert({
      user_id: user.id,
      action_type: action,
      entity_type: action.split("_")[1], // e.g., "reminder", "appointment"
      entity_id: entityId,
      parameters: params,
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
    });

    // Update audit log to mark as successful
    await supabaseClient.from("audit_logs").insert({
      user_id: user.id,
      action: `AI_ACTION_SUCCESS_${action}`,
      entity_type: action.split("_")[1],
      entity_id: entityId,
      success: true,
      new_values: { action, result }
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Action Executor Error:", error);
    
    // Log failed action to audit logs
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        
        if (user) {
          await supabaseClient.from("audit_logs").insert({
            user_id: user.id,
            action: "AI_ACTION_FAILED",
            entity_type: "ai_action",
            entity_id: null,
            success: false,
            error_message: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
