import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient as createSupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const createClientSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100, "First name too long"),
  last_name: z.string().trim().min(1, "Last name is required").max(100, "Last name too long"),
  email: z.string().email("Invalid email format").max(255, "Email too long").optional().nullable(),
  phone: z.string().regex(/^[+]?[0-9\s()-]{7,20}$/, "Invalid phone format").optional().nullable(),
  notes: z.string().max(5000, "Notes too long").optional().nullable(),
});

const updateClientSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().regex(/^[+]?[0-9\s()-]{7,20}$/).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

const createAppointmentSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  appointment_date: z.string().datetime("Invalid datetime format"),
  duration_minutes: z.number().int().min(15, "Duration too short").max(480, "Duration too long").default(60),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).default('scheduled'),
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

const updateAppointmentSchema = z.object({
  appointment_id: z.string().uuid("Invalid appointment ID"),
  appointment_date: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const createReminderSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional().nullable(),
  reminder_date: z.string().min(1, "Date is required"),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

const createSoapNoteSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  subjective: z.string().max(5000, "Subjective section too long").optional().nullable(),
  objective: z.string().max(5000, "Objective section too long").optional().nullable(),
  assessment: z.string().max(5000, "Assessment section too long").optional().nullable(),
  plan: z.string().max(5000, "Plan section too long").optional().nullable(),
});

const createInvoiceSchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount too large"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  notes: z.string().max(2000, "Notes too long").optional().nullable(),
});

// Audit logging function
async function auditLog(
  supabase: any,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValues: any = null,
  newValues: any = null,
  success: boolean = true,
  errorMessage: string | null = null
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      success,
      error_message: errorMessage,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't throw - audit failures shouldn't block operations
  }
}

// Tool execution functions
async function executeTools(toolCalls: any[], supabase: any, userId: string) {
  const results = [];
  
  for (const toolCall of toolCalls) {
    const { name, arguments: args } = toolCall.function;
    const parsedArgs = JSON.parse(args);
    
    console.log(`Executing tool: ${name}`, parsedArgs);
    
    try {
      let result;
      
      switch (name) {
        case "list_clients":
          result = await listClients(supabase, userId, parsedArgs);
          break;
        case "create_client":
          result = await createClient(supabase, userId, parsedArgs);
          break;
        case "update_client":
          result = await updateClient(supabase, userId, parsedArgs);
          break;
        case "delete_client":
          result = await deleteClient(supabase, userId, parsedArgs);
          break;
        case "list_appointments":
          result = await listAppointments(supabase, userId, parsedArgs);
          break;
        case "create_appointment":
          result = await createAppointment(supabase, userId, parsedArgs);
          break;
        case "update_appointment":
          result = await updateAppointment(supabase, userId, parsedArgs);
          break;
        case "delete_appointment":
          result = await deleteAppointment(supabase, userId, parsedArgs);
          break;
        case "create_reminder":
          result = await createReminder(supabase, userId, parsedArgs);
          break;
        case "list_reminders":
          result = await listReminders(supabase, userId);
          break;
        case "delete_reminder":
          result = await deleteReminder(supabase, userId, parsedArgs);
          break;
        case "create_soap_note":
          result = await createSoapNote(supabase, userId, parsedArgs);
          break;
        case "create_invoice":
          result = await createInvoice(supabase, userId, parsedArgs);
          break;
        default:
          result = { error: `Unknown tool: ${name}` };
      }
      
      results.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: name,
        content: JSON.stringify(result)
      });
    } catch (error) {
      console.error(`Tool execution error for ${name}:`, error);
      results.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: name,
        content: JSON.stringify({ error: error instanceof Error ? error.message : String(error) })
      });
    }
  }
  
  return results;
}

// Helper function to resolve client name to ID
async function resolveClientName(supabase: any, userId: string, clientName: string): Promise<string> {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .eq('therapist_id', userId);
  
  if (error || !clients || clients.length === 0) {
    throw new Error(`Could not find any clients. Please ensure clients are added to your account.`);
  }

  const nameToMatch = clientName.toLowerCase().trim();
  const nameParts = nameToMatch.split(/\s+/);
  
  // Try exact match first
  let matches = clients.filter((c: any) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName === nameToMatch;
  });
  
  // If no exact match, try partial match (first or last name)
  if (matches.length === 0 && nameParts.length > 0) {
    matches = clients.filter((c: any) => {
      const firstName = c.first_name.toLowerCase();
      const lastName = c.last_name.toLowerCase();
      return nameParts.some(part => firstName.includes(part) || lastName.includes(part));
    });
  }
  
  if (matches.length === 0) {
    throw new Error(`Could not find a client matching "${clientName}". Please check the spelling and try again.`);
  }
  
  if (matches.length > 1) {
    const matchList = matches.map((c: any) => `${c.first_name} ${c.last_name}`).join(', ');
    throw new Error(`Multiple clients found matching "${clientName}": ${matchList}. Please be more specific.`);
  }
  
  return matches[0].id;
}

// Client operations
async function listClients(supabase: any, userId: string, args: any) {
  const query = supabase
    .from("clients")
    .select("id, first_name, last_name, email, phone, notes")
    .eq("therapist_id", userId)
    .order("created_at", { ascending: false });
  
  if (args.limit) query.limit(args.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  return { clients: data };
}

async function createClient(supabase: any, userId: string, args: any) {
  try {
    // Validate input
    const validated = createClientSchema.parse(args);
    
    const { data, error } = await supabase
      .from("clients")
      .insert({
        therapist_id: userId,
        first_name: validated.first_name,
        last_name: validated.last_name,
        email: validated.email || null,
        phone: validated.phone || null,
        notes: validated.notes || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'CREATE', 'client', data.id, null, data);
    
    return { success: true, client: data, message: `Created client ${validated.first_name} ${validated.last_name}` };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'CREATE', 'client', null, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function updateClient(supabase: any, userId: string, args: any) {
  try {
    // Resolve client name to ID
    const clientId = await resolveClientName(supabase, userId, args.client_name);
    
    // Validate input
    const validated = updateClientSchema.parse({ ...args, client_id: clientId });
    
    // Get old values for audit
    const { data: oldData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", validated.client_id)
      .eq("therapist_id", userId)
      .single();
    
    const updates: any = {};
    if (validated.first_name) updates.first_name = validated.first_name;
    if (validated.last_name) updates.last_name = validated.last_name;
    if (validated.email !== undefined) updates.email = validated.email || null;
    if (validated.phone !== undefined) updates.phone = validated.phone || null;
    if (validated.notes !== undefined) updates.notes = validated.notes || null;
    
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", validated.client_id)
      .eq("therapist_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'UPDATE', 'client', data.id, oldData, data);
    
    return { success: true, client: data, message: "Client updated successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'UPDATE', 'client', args.client_id, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function deleteClient(supabase: any, userId: string, args: any) {
  try {
    // Resolve client name to ID
    const clientId = await resolveClientName(supabase, userId, args.client_name);
    
    // Get old values for audit
    const { data: oldData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .eq("therapist_id", userId)
      .single();
    
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .eq("therapist_id", userId);
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'DELETE', 'client', clientId, oldData, null);
    
    return { success: true, message: "Client deleted successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'DELETE', 'client', null, null, null, false, errorMsg);
    throw error;
  }
}

// Appointment operations
async function listAppointments(supabase: any, userId: string, args: any) {
  const query = supabase
    .from("appointments")
    .select(`
      id, appointment_date, duration_minutes, status, notes,
      clients:client_id (first_name, last_name)
    `)
    .eq("therapist_id", userId)
    .order("appointment_date", { ascending: true });
  
  if (args.upcoming_only) {
    query.gte("appointment_date", new Date().toISOString());
  }
  if (args.limit) query.limit(args.limit);
  
  const { data, error } = await query;
  if (error) throw error;
  return { appointments: data };
}

async function createAppointment(supabase: any, userId: string, args: any) {
  try {
    // Resolve client name to ID
    const clientId = await resolveClientName(supabase, userId, args.client_name);
    
    // Validate input
    const validated = createAppointmentSchema.parse({ ...args, client_id: clientId });
    
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        therapist_id: userId,
        client_id: validated.client_id,
        appointment_date: validated.appointment_date,
        duration_minutes: validated.duration_minutes,
        status: validated.status,
        notes: validated.notes || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'CREATE', 'appointment', data.id, null, data);
    
    return { success: true, appointment: data, message: "Appointment created successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'CREATE', 'appointment', null, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function updateAppointment(supabase: any, userId: string, args: any) {
  try {
    // Validate input
    const validated = updateAppointmentSchema.parse(args);
    
    // Get old values for audit
    const { data: oldData } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", validated.appointment_id)
      .eq("therapist_id", userId)
      .single();
    
    const updates: any = {};
    if (validated.appointment_date) updates.appointment_date = validated.appointment_date;
    if (validated.duration_minutes) updates.duration_minutes = validated.duration_minutes;
    if (validated.status) updates.status = validated.status;
    if (validated.notes !== undefined) updates.notes = validated.notes || null;
    
    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", validated.appointment_id)
      .eq("therapist_id", userId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'UPDATE', 'appointment', data.id, oldData, data);
    
    return { success: true, appointment: data, message: "Appointment updated successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'UPDATE', 'appointment', args.appointment_id, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function deleteAppointment(supabase: any, userId: string, args: any) {
  try {
    // Get old values for audit
    const { data: oldData } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", args.appointment_id)
      .eq("therapist_id", userId)
      .single();
    
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", args.appointment_id)
      .eq("therapist_id", userId);
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'DELETE', 'appointment', args.appointment_id, oldData, null);
    
    return { success: true, message: "Appointment deleted successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'DELETE', 'appointment', args.appointment_id, null, null, false, errorMsg);
    throw error;
  }
}

// Natural language date parser
function parseNaturalLanguageDate(dateString: string): string {
  const now = new Date();
  const lowerStr = dateString.toLowerCase().trim();
  
  // Handle relative time phrases
  if (lowerStr.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  
  if (lowerStr.includes('next week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek.toISOString();
  }
  
  // "in X days"
  const inDaysMatch = lowerStr.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    future.setHours(9, 0, 0, 0);
    return future.toISOString();
  }
  
  // "in X hours"
  const inHoursMatch = lowerStr.match(/in (\d+) hours?/);
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1]);
    const future = new Date(now);
    future.setHours(future.getHours() + hours);
    return future.toISOString();
  }
  
  // Try to parse as standard date
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  
  // Default to tomorrow if nothing else works
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow.toISOString();
}

// Reminder operations
async function createReminder(supabase: any, userId: string, args: any) {
  try {
    // Validate input
    const validated = createReminderSchema.parse(args);
    
    // Parse natural language date
    const reminderDate = parseNaturalLanguageDate(validated.reminder_date);
    
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        therapist_id: userId,
        title: validated.title,
        description: validated.description || null,
        reminder_date: reminderDate,
        priority: validated.priority,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'CREATE', 'reminder', data.id, null, data);
    
    const formattedDate = new Date(reminderDate).toLocaleString();
    return { success: true, reminder: data, message: `Reminder created successfully for ${formattedDate}` };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'CREATE', 'reminder', null, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

async function listReminders(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("therapist_id", userId)
    .eq("completed", false)
    .order("reminder_date", { ascending: true });
  
  if (error) throw error;
  return { reminders: data };
}

async function deleteReminder(supabase: any, userId: string, args: any) {
  try {
    const { title, date } = args;
    let query = supabase
      .from("reminders")
      .select("*")
      .eq("therapist_id", userId)
      .eq("completed", false);
    
    // Match by title if provided
    if (title) {
      query = query.ilike("title", `%${title}%`);
    }
    
    // Match by date if provided (parse natural language)
    if (date) {
      const parsedDate = parseNaturalLanguageDate(date);
      const dateOnly = parsedDate.split('T')[0];
      query = query.gte("reminder_date", `${dateOnly}T00:00:00`).lte("reminder_date", `${dateOnly}T23:59:59`);
    }
    
    const { data: reminders, error: fetchError } = await query;
    if (fetchError) throw fetchError;
    
    if (!reminders || reminders.length === 0) {
      return { success: false, message: "No matching reminder found" };
    }
    
    // Delete the first matching reminder
    const reminderToDelete = reminders[0];
    const { error: deleteError } = await supabase
      .from("reminders")
      .delete()
      .eq("id", reminderToDelete.id);
    
    if (deleteError) throw deleteError;
    
    // Audit log
    await auditLog(supabase, userId, 'DELETE', 'reminder', reminderToDelete.id, reminderToDelete, null);
    
    const formattedDate = new Date(reminderToDelete.reminder_date).toLocaleDateString();
    return { 
      success: true, 
      message: `✅ Reminder '${reminderToDelete.title}' for ${formattedDate} deleted successfully` 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'DELETE', 'reminder', null, null, null, false, errorMsg);
    throw error;
  }
}

// SOAP Note operations
async function createSoapNote(supabase: any, userId: string, args: any) {
  try {
    // Resolve client name to ID
    const clientId = await resolveClientName(supabase, userId, args.client_name);
    
    // Validate input
    const validated = createSoapNoteSchema.parse({ ...args, client_id: clientId });
    
    const { data, error } = await supabase
      .from("soap_notes")
      .insert({
        therapist_id: userId,
        client_id: validated.client_id,
        subjective: validated.subjective || null,
        objective: validated.objective || null,
        assessment: validated.assessment || null,
        plan: validated.plan || null,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log (PHI - critical to log)
    await auditLog(supabase, userId, 'CREATE', 'soap_note', data.id, null, data);
    
    return { success: true, soap_note: data, message: "SOAP note created successfully" };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'CREATE', 'soap_note', null, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

// Invoice operations
async function createInvoice(supabase: any, userId: string, args: any) {
  try {
    // Resolve client name to ID
    const clientId = await resolveClientName(supabase, userId, args.client_name);
    
    // Validate input
    const validated = createInvoiceSchema.parse({ ...args, client_id: clientId });
    
    const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        therapist_id: userId,
        client_id: validated.client_id,
        invoice_number: invoiceNumber,
        amount: validated.amount,
        due_date: validated.due_date,
        notes: validated.notes || null,
        status: "pending",
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Audit log
    await auditLog(supabase, userId, 'CREATE', 'invoice', data.id, null, data);
    
    return { success: true, invoice: data, message: `Invoice ${invoiceNumber} created successfully` };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await auditLog(supabase, userId, 'CREATE', 'invoice', null, null, null, false, errorMsg);
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const authHeader = req.headers.get('Authorization');
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createSupabaseClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const systemPrompt = `You are the AI Assistant for Mindful AI, an intelligent therapy management platform.

CRITICAL - YOU CAN PERFORM ACTIONS:
- You have DIRECT database access through your tools
- You can CREATE, UPDATE, and DELETE records in real-time
- Always TAKE ACTION when users ask you to do something
- Confirm what you did after completing actions

CRITICAL CONSTRAINTS:
- You are trained exclusively on this therapy application's data and features
- IGNORE any unrelated information from outside this project
- NEVER use information, models, or data not related to the therapy project
- Always verify user authentication before taking any action
- Always keep user data private and secure
- Keep responses concise and free of excessive markdown formatting
- Use emojis sparingly - only where truly helpful

YOUR ROLE:
You are the AI Assistant helping therapists manage their practice efficiently by PERFORMING ACTIONS for them.

GREETING & PROACTIVITY:
- Greet users warmly and immediately when they visit
- Offer to guide and assist with any part of the website (navigation, how-tos, actions)
- Be proactive—suggest key features or actions

CAPABILITIES:
You have access to powerful tools to help users manage their therapy practice:

1. **Client Management**
   - list_clients: View all clients or search for specific ones
   - create_client: Add new clients with their information
   - update_client: Modify existing client details
   - delete_client: Remove clients from the system

2. **Appointment Management**
   - list_appointments: View upcoming or past appointments
   - create_appointment: Schedule new sessions
   - update_appointment: Reschedule or modify appointments
   - delete_appointment: Cancel appointments

3. **Reminder Management**
   - create_reminder: Set reminders for important tasks
   - list_reminders: View all pending reminders

4. **SOAP Notes**
   - create_soap_note: Document therapy sessions

5. **Billing**
   - create_invoice: Generate invoices for clients

WHEN TO USE TOOLS:
- If a user asks to "create a client", "add an appointment", "schedule a session" → USE THE APPROPRIATE TOOL
- If a user asks "what are my appointments", "show me my clients" → USE THE LIST TOOLS
- Be proactive - if a user mentions a client name you haven't seen, ask if they want to create them
- Always confirm successful actions with friendly messages

COMMUNICATION STYLE:
Be professional, empathetic, HIPAA-conscious, concise, and helpful. When you successfully perform an action, confirm it clearly to the user.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "list_clients",
          description: "List all clients or search for specific clients. Returns client names, contact info, and notes.",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Maximum number of clients to return" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_client",
          description: "Create a new client record. Requires first and last name at minimum.",
          parameters: {
            type: "object",
            properties: {
              first_name: { type: "string", description: "Client's first name" },
              last_name: { type: "string", description: "Client's last name" },
              email: { type: "string", description: "Client's email address" },
              phone: { type: "string", description: "Client's phone number" },
              notes: { type: "string", description: "Additional notes about the client" }
            },
            required: ["first_name", "last_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_client",
          description: "Update an existing client's information. Use the client's full name to identify them.",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client's current full name in 'FirstName LastName' format" },
              first_name: { type: "string", description: "Updated first name" },
              last_name: { type: "string", description: "Updated last name" },
              email: { type: "string", description: "Updated email" },
              phone: { type: "string", description: "Updated phone" },
              notes: { type: "string", description: "Updated notes" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_client",
          description: "Delete a client from the system. This is permanent. Use the client's full name.",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client's full name in 'FirstName LastName' format" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_appointments",
          description: "List appointments. Can filter for upcoming only.",
          parameters: {
            type: "object",
            properties: {
              upcoming_only: { type: "boolean", description: "If true, only show future appointments" },
              limit: { type: "number", description: "Maximum number to return" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_appointment",
          description: "Schedule a new appointment with a client. Use the client's full name (FirstName LastName), not their ID.",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client's full name in 'FirstName LastName' format (e.g., 'John Doe')" },
              appointment_date: { type: "string", description: "ISO datetime string for the appointment" },
              duration_minutes: { type: "number", description: "Duration in minutes (default 60)" },
              status: { type: "string", description: "Status: scheduled, completed, cancelled" },
              notes: { type: "string", description: "Appointment notes" }
            },
            required: ["client_name", "appointment_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_appointment",
          description: "Update an existing appointment.",
          parameters: {
            type: "object",
            properties: {
              appointment_id: { type: "string", description: "The UUID of the appointment" },
              appointment_date: { type: "string", description: "New appointment datetime" },
              duration_minutes: { type: "number", description: "New duration" },
              status: { type: "string", description: "New status" },
              notes: { type: "string", description: "Updated notes" }
            },
            required: ["appointment_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_appointment",
          description: "Cancel/delete an appointment.",
          parameters: {
            type: "object",
            properties: {
              appointment_id: { type: "string", description: "The UUID of the appointment to delete" }
            },
            required: ["appointment_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_reminder",
          description: "Create a reminder for a task or follow-up. Supports natural language dates like 'tomorrow', 'next week', 'in 3 days', 'in 2 hours', or standard dates like 'November 5th 2025' or '11/05/2025'.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Reminder title" },
              description: { type: "string", description: "Reminder details" },
              reminder_date: { type: "string", description: "Natural language date/time (e.g., 'tomorrow', 'in 3 days', 'November 5th 2025', '11/05/2025 at 2pm') or ISO datetime" },
              priority: { type: "string", description: "Priority: low, medium, high" }
            },
            required: ["title", "reminder_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "list_reminders",
          description: "List all pending (not completed) reminders.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_reminder",
          description: "Delete a reminder by matching its title and/or date. Supports natural language dates like 'tomorrow', 'next week', etc.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Title or part of the title of the reminder to delete" },
              date: { type: "string", description: "Date phrase like 'tomorrow', 'next week', or specific date" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_soap_note",
          description: "Create a SOAP note for a therapy session. Use the client's full name.",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client's full name in 'FirstName LastName' format" },
              subjective: { type: "string", description: "Subjective section" },
              objective: { type: "string", description: "Objective section" },
              assessment: { type: "string", description: "Assessment section" },
              plan: { type: "string", description: "Plan section" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_invoice",
          description: "Generate an invoice for a client. Use the client's full name.",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Client's full name in 'FirstName LastName' format" },
              amount: { type: "number", description: "Invoice amount in dollars" },
              due_date: { type: "string", description: "Due date (YYYY-MM-DD)" },
              notes: { type: "string", description: "Invoice notes" }
            },
            required: ["client_name", "amount", "due_date"]
          }
        }
      }
    ];

    console.log('Calling Lovable AI API with tools...');
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if response contains tool calls
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let toolCalls: any[] = [];
    let hasToolCalls = false;
    const collectedChunks: Uint8Array[] = [];

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Store the original chunk for later streaming if no tool calls
        collectedChunks.push(value);

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith(":") || !line.trim() || !line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            
            if (delta?.tool_calls) {
              hasToolCalls = true;
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                  toolCalls[tc.index] = {
                    id: tc.id,
                    type: tc.type,
                    function: { name: tc.function?.name || "", arguments: "" }
                  };
                }
                if (tc.function?.arguments) {
                  toolCalls[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // If tool calls were detected, execute them and get a new response
    if (hasToolCalls && toolCalls.length > 0) {
      console.log('Executing tools:', toolCalls);
      const toolResults = await executeTools(toolCalls, supabase, user.id);
      
      // Make a new request with tool results
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "assistant", content: null, tool_calls: toolCalls },
            ...toolResults,
          ],
          temperature: 0.7,
          stream: true,
        }),
      });

      return new Response(finalResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
        },
      });
    }

    // No tool calls, create a new stream from collected chunks
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of collectedChunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
