import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "trial@test.com";
const DEMO_PASSWORD = "Mysoftwareisamazing123";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if demo user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", DEMO_EMAIL)
      .maybeSingle();

    let demoUserId: string;

    if (existingProfile) {
      console.log("Demo user already exists, updating data...");
      demoUserId = existingProfile.id;
    } else {
      // Create demo user in auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Dr. Demo Therapist" }
      });

      if (authError) throw authError;
      demoUserId = authData.user.id;

      // Create profile
      await supabaseAdmin.from("profiles").insert({
        id: demoUserId,
        email: DEMO_EMAIL,
        full_name: "Dr. Demo Therapist",
        specialty: "Clinical Psychology",
        official_title: "Licensed Clinical Psychologist (PhD)",
        phone: "+1 (555) 123-4567"
      });

      // Assign professional role
      await supabaseAdmin.from("user_roles").insert({
        user_id: demoUserId,
        role: "professional"
      });

      console.log("Created demo user:", demoUserId);
    }

    // Clear existing demo data for this user
    await supabaseAdmin.from("clients").delete().eq("therapist_id", demoUserId);
    await supabaseAdmin.from("reminders").delete().eq("therapist_id", demoUserId);
    await supabaseAdmin.from("note_templates").delete().eq("therapist_id", demoUserId);

    // Create demo clients
    const clients = [
      {
        therapist_id: demoUserId,
        first_name: "Sarah",
        last_name: "Martinez",
        email: "sarah.m@example.com",
        phone: "+1 (555) 234-5678",
        date_of_birth: "1988-03-15",
        address: "123 Oak Street, San Francisco, CA 94102",
        primary_diagnosis: "Generalized Anxiety Disorder",
        emergency_contact: "Miguel Martinez",
        emergency_phone: "+1 (555) 234-5679",
        gender_pronouns: "she/her",
        insurance_provider: "Blue Cross Blue Shield",
        insurance_policy_number: "BCB123456789",
        notes: "Weekly sessions, making good progress with CBT techniques"
      },
      {
        therapist_id: demoUserId,
        first_name: "James",
        last_name: "Wilson",
        email: "james.w@example.com",
        phone: "+1 (555) 345-6789",
        date_of_birth: "1975-08-22",
        address: "456 Pine Avenue, San Francisco, CA 94103",
        primary_diagnosis: "Major Depressive Disorder",
        emergency_contact: "Emily Wilson",
        emergency_phone: "+1 (555) 345-6780",
        gender_pronouns: "he/him",
        insurance_provider: "Aetna",
        insurance_policy_number: "AET987654321",
        notes: "Bi-weekly sessions, medication management with psychiatrist"
      },
      {
        therapist_id: demoUserId,
        first_name: "Lisa",
        last_name: "Chen",
        email: "lisa.c@example.com",
        phone: "+1 (555) 456-7890",
        date_of_birth: "1992-11-30",
        address: "789 Maple Drive, Oakland, CA 94612",
        primary_diagnosis: "PTSD",
        emergency_contact: "David Chen",
        emergency_phone: "+1 (555) 456-7891",
        gender_pronouns: "she/her",
        insurance_provider: "Kaiser Permanente",
        insurance_policy_number: "KP456789012",
        notes: "EMDR therapy in progress, trauma-focused work"
      },
      {
        therapist_id: demoUserId,
        first_name: "Michael",
        last_name: "Thompson",
        email: "mike.t@example.com",
        phone: "+1 (555) 567-8901",
        date_of_birth: "1985-05-10",
        address: "321 Elm Street, Berkeley, CA 94704",
        primary_diagnosis: "Social Anxiety Disorder",
        emergency_contact: "Susan Thompson",
        emergency_phone: "+1 (555) 567-8902",
        gender_pronouns: "he/him",
        insurance_provider: "United Healthcare",
        insurance_policy_number: "UHC234567890",
        notes: "Exposure therapy, workplace anxiety focus"
      },
      {
        therapist_id: demoUserId,
        first_name: "Emma",
        last_name: "Rodriguez",
        email: "emma.r@example.com",
        phone: "+1 (555) 678-9012",
        date_of_birth: "1998-09-05",
        address: "654 Cedar Lane, San Jose, CA 95112",
        primary_diagnosis: "Adjustment Disorder",
        emergency_contact: "Carlos Rodriguez",
        emergency_phone: "+1 (555) 678-9013",
        gender_pronouns: "she/they",
        insurance_provider: "Cigna",
        insurance_policy_number: "CIG345678901",
        notes: "Life transition support, college to career"
      }
    ];

    const { data: insertedClients, error: clientsError } = await supabaseAdmin
      .from("clients")
      .insert(clients)
      .select();

    if (clientsError) throw clientsError;
    console.log("Created demo clients:", insertedClients.length);

    // Create appointments for each client
    const now = new Date();
    const appointments = [];
    const soapNotes = [];
    const invoices = [];

    for (let i = 0; i < insertedClients.length; i++) {
      const client = insertedClients[i];
      
      // Past appointments (last 4 weeks)
      for (let week = 1; week <= 4; week++) {
        const pastDate = new Date(now);
        pastDate.setDate(pastDate.getDate() - (week * 7) + i);
        pastDate.setHours(9 + i, 0, 0, 0);
        
        appointments.push({
          therapist_id: demoUserId,
          client_id: client.id,
          appointment_date: pastDate.toISOString(),
          duration_minutes: 50,
          status: "completed",
          notes: `Session ${5 - week} notes - Good progress made`
        });

        // SOAP notes for past appointments
        soapNotes.push({
          therapist_id: demoUserId,
          client_id: client.id,
          subjective: `Client reports ${["feeling better this week", "some challenges with sleep", "progress on coping strategies", "improved mood overall"][week - 1]}`,
          objective: "Client appeared engaged, maintained eye contact, appropriate affect",
          assessment: `Continuing to make progress on treatment goals. ${["Anxiety levels decreasing", "Depression symptoms stable", "Trauma processing ongoing", "Social anxiety improving"][week - 1]}`,
          plan: "Continue current treatment approach, homework assigned for next session"
        });

        // Invoice for past appointments
        invoices.push({
          therapist_id: demoUserId,
          client_id: client.id,
          invoice_number: `INV-${2024}${String(week).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
          amount: 150.00,
          status: week <= 2 ? "paid" : "pending",
          issue_date: pastDate.toISOString().split('T')[0],
          due_date: new Date(pastDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paid_date: week <= 2 ? new Date(pastDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
          notes: `Session on ${pastDate.toLocaleDateString()}`
        });
      }

      // Future appointments (next 3 weeks)
      for (let week = 1; week <= 3; week++) {
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + (week * 7) + i);
        futureDate.setHours(9 + i, 0, 0, 0);
        
        appointments.push({
          therapist_id: demoUserId,
          client_id: client.id,
          appointment_date: futureDate.toISOString(),
          duration_minutes: 50,
          status: "scheduled",
          notes: week === 1 ? "Follow-up on homework" : ""
        });
      }
    }

    // Insert appointments
    const { error: apptError } = await supabaseAdmin.from("appointments").insert(appointments);
    if (apptError) console.error("Appointments error:", apptError);

    // Insert SOAP notes
    const { error: soapError } = await supabaseAdmin.from("soap_notes").insert(soapNotes);
    if (soapError) console.error("SOAP notes error:", soapError);

    // Insert invoices
    const { error: invError } = await supabaseAdmin.from("invoices").insert(invoices);
    if (invError) console.error("Invoices error:", invError);

    // Create reminders
    const reminders = [
      {
        therapist_id: demoUserId,
        title: "Review Sarah's progress notes",
        description: "Prepare for next week's session",
        reminder_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "high",
        completed: false
      },
      {
        therapist_id: demoUserId,
        title: "Call insurance company for James",
        description: "Follow up on pre-authorization",
        reminder_date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "medium",
        completed: false
      },
      {
        therapist_id: demoUserId,
        title: "Update treatment plan for Lisa",
        description: "EMDR phase 2 documentation",
        reminder_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "medium",
        completed: false
      },
      {
        therapist_id: demoUserId,
        title: "Complete continuing education",
        description: "Trauma-informed care webinar",
        reminder_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        priority: "low",
        completed: false
      }
    ];

    await supabaseAdmin.from("reminders").insert(reminders);

    // Create note templates
    const templates = [
      {
        therapist_id: demoUserId,
        name: "Standard Individual Session",
        description: "General individual therapy session template",
        category: "Individual",
        subjective_template: "Client reports: \n- Current mood:\n- Sleep quality:\n- Significant events since last session:",
        objective_template: "Appearance:\nBehavior:\nAffect:\nSpeech:\nThought process:",
        assessment_template: "Progress toward goals:\nDiagnosis:\nClinical impressions:",
        plan_template: "Interventions used:\nHomework assigned:\nNext session focus:\nFollow-up needed:",
        is_default: true
      },
      {
        therapist_id: demoUserId,
        name: "Crisis Intervention",
        description: "Template for crisis sessions",
        category: "Crisis",
        subjective_template: "Presenting crisis:\nTrigger events:\nSafety concerns:\nSupport system availability:",
        objective_template: "Mental status:\nRisk assessment:\nProtective factors:\nCurrent coping:",
        assessment_template: "Crisis severity:\nImmediate needs:\nSafety plan status:",
        plan_template: "Crisis interventions:\nSafety plan updates:\nEmergency contacts:\nFollow-up plan:",
        is_default: false
      }
    ];

    await supabaseAdmin.from("note_templates").insert(templates);

    // Create progress paths for first 2 clients
    for (let i = 0; i < 2; i++) {
      const client = insertedClients[i];
      
      const { data: progressPath, error: ppError } = await supabaseAdmin
        .from("progress_paths")
        .insert({
          client_id: client.id,
          therapist_id: demoUserId,
          core_focus: i === 0 ? "Anxiety management and coping skills development" : "Depression recovery and mood stabilization",
          baseline_snapshot: i === 0 ? "Initial anxiety score: 24/40. Frequent panic attacks, sleep disturbance." : "Initial PHQ-9: 18. Low energy, anhedonia, social withdrawal.",
          environment_triggers: i === 0 ? "Work presentations, social gatherings, health concerns" : "Work stress, relationship conflicts, seasonal changes"
        })
        .select()
        .single();

      if (ppError) continue;

      // Add goals
      const goals = [
        {
          progress_path_id: progressPath.id,
          title: i === 0 ? "Reduce panic attack frequency" : "Improve daily functioning",
          description: i === 0 ? "Decrease panic attacks from 3x/week to 1x/week or less" : "Establish consistent daily routine and self-care",
          status: "active",
          priority: "high",
          completion_percentage: 65
        },
        {
          progress_path_id: progressPath.id,
          title: i === 0 ? "Build coping toolkit" : "Increase social engagement",
          description: i === 0 ? "Learn and practice 5 anxiety management techniques" : "Attend 2+ social activities per week",
          status: "active",
          priority: "medium",
          completion_percentage: 40
        }
      ];

      await supabaseAdmin.from("progress_goals").insert(goals);

      // Add milestones
      const milestones = [
        {
          progress_path_id: progressPath.id,
          title: "Completed intake assessment",
          description: "Initial evaluation and treatment planning",
          is_achieved: true,
          achieved_date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          progress_path_id: progressPath.id,
          title: "First successful coping technique application",
          description: i === 0 ? "Used breathing exercise during work meeting" : "Completed morning routine 5 days in a row",
          is_achieved: true,
          achieved_date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      await supabaseAdmin.from("progress_milestones").insert(milestones);
    }

    // Create messages between therapist and first client
    const messages = [
      {
        therapist_id: demoUserId,
        client_id: insertedClients[0].id,
        sender_id: demoUserId,
        sender_type: "therapist",
        content: "Hi Sarah, just wanted to check in - how did the breathing exercises go this week?",
        read: true
      },
      {
        therapist_id: demoUserId,
        client_id: insertedClients[0].id,
        sender_id: "demo-client", // placeholder
        sender_type: "client",
        content: "They've been really helpful! I used the 4-7-8 technique before my presentation yesterday.",
        read: true
      },
      {
        therapist_id: demoUserId,
        client_id: insertedClients[0].id,
        sender_id: demoUserId,
        sender_type: "therapist",
        content: "That's wonderful progress! We'll discuss more strategies in our next session.",
        read: false
      }
    ];

    await supabaseAdmin.from("messages").insert(messages);

    // Create practice settings
    await supabaseAdmin.from("practice_settings").upsert({
      therapist_id: demoUserId,
      practice_name: "Mindful Wellness Center",
    });

    // Create calendar preferences
    await supabaseAdmin.from("calendar_preferences").upsert({
      therapist_id: demoUserId,
      working_hours: {
        monday: { start: "09:00", end: "17:00" },
        tuesday: { start: "09:00", end: "17:00" },
        wednesday: { start: "09:00", end: "17:00" },
        thursday: { start: "09:00", end: "17:00" },
        friday: { start: "09:00", end: "15:00" }
      },
      default_appointment_duration: 50,
      buffer_time: 10,
      allow_back_to_back: false,
      timezone: "America/Los_Angeles"
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo data seeded successfully",
        demoUserId,
        clientCount: insertedClients.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error seeding demo data:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
