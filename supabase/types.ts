export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_access_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      admin_overrides: {
        Row: {
          created_at: string | null
          grant_client_portal: boolean | null
          id: string
          plan_tier: string
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          grant_client_portal?: boolean | null
          id?: string
          plan_tier: string
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          grant_client_portal?: boolean | null
          id?: string
          plan_tier?: string
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      ai_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          parameters: Json | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          parameters?: Json | null
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          parameters?: Json | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          cost: number | null
          created_at: string | null
          id: string
          model: string
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          id?: string
          model: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          id?: string
          model?: string
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      appointment_conflicts: {
        Row: {
          appointment_id: string
          conflict_type: string
          conflict_with_id: string
          detected_at: string
          id: string
          resolved: boolean
          resolved_at: string | null
        }
        Insert: {
          appointment_id: string
          conflict_type: string
          conflict_with_id: string
          detected_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Update: {
          appointment_id?: string
          conflict_type?: string
          conflict_with_id?: string
          detected_at?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_conflicts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_conflicts_conflict_with_id_fkey"
            columns: ["conflict_with_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_requests: {
        Row: {
          client_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          requested_date: string
          responded_at: string | null
          status: string
          therapist_id: string
          therapist_note: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          requested_date: string
          responded_at?: string | null
          status?: string
          therapist_id: string
          therapist_note?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          requested_date?: string
          responded_at?: string | null
          status?: string
          therapist_id?: string
          therapist_note?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          client_id: string
          confirmed_by_client: boolean | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          parent_appointment_id: string | null
          recurrence_end_date: string | null
          recurrence_rule: string | null
          reminder_sent: boolean | null
          status: string | null
          therapist_id: string
          updated_at: string | null
          zoom_meeting_id: string | null
          zoom_meeting_password: string | null
          zoom_meeting_url: string | null
        }
        Insert: {
          appointment_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id: string
          confirmed_by_client?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          parent_appointment_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          therapist_id: string
          updated_at?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_password?: string | null
          zoom_meeting_url?: string | null
        }
        Update: {
          appointment_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_id?: string
          confirmed_by_client?: boolean | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          parent_appointment_id?: string | null
          recurrence_end_date?: string | null
          recurrence_rule?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          therapist_id?: string
          updated_at?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_password?: string | null
          zoom_meeting_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_parent_appointment_id_fkey"
            columns: ["parent_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_therapist"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          success: boolean
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          success?: boolean
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          success?: boolean
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          plan: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          plan?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          plan?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_preferences: {
        Row: {
          allow_back_to_back: boolean
          buffer_time: number
          created_at: string
          default_appointment_duration: number
          id: string
          max_daily_appointments: number | null
          therapist_id: string
          timezone: string
          updated_at: string
          working_hours: Json
        }
        Insert: {
          allow_back_to_back?: boolean
          buffer_time?: number
          created_at?: string
          default_appointment_duration?: number
          id?: string
          max_daily_appointments?: number | null
          therapist_id: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Update: {
          allow_back_to_back?: boolean
          buffer_time?: number
          created_at?: string
          default_appointment_duration?: number
          id?: string
          max_daily_appointments?: number | null
          therapist_id?: string
          timezone?: string
          updated_at?: string
          working_hours?: Json
        }
        Relationships: []
      }
      client_access_codes: {
        Row: {
          client_id: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          professional_id: string
          used: boolean | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          professional_id: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          professional_id?: string
          used?: boolean | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_access_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_professional_links: {
        Row: {
          client_id: string
          client_user_id: string
          created_at: string
          id: string
          professional_id: string
        }
        Insert: {
          client_id: string
          client_user_id: string
          created_at?: string
          id?: string
          professional_id: string
        }
        Update: {
          client_id?: string
          client_user_id?: string
          created_at?: string
          id?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_professional_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_login: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_login?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_login?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          first_name: string
          gender_pronouns: string | null
          id: string
          insurance_group_number: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string
          medication_details: string | null
          medications: string | null
          notes: string | null
          phone: string | null
          primary_diagnosis: string | null
          release_of_information: boolean | null
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name: string
          gender_pronouns?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name: string
          medication_details?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          primary_diagnosis?: string | null
          release_of_information?: boolean | null
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          first_name?: string
          gender_pronouns?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          medication_details?: string | null
          medications?: string | null
          notes?: string | null
          phone?: string | null
          primary_diagnosis?: string | null
          release_of_information?: boolean | null
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clients_therapist"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      code_validation_attempts: {
        Row: {
          code_attempted: string
          created_at: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          code_attempted: string
          created_at?: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          code_attempted?: string
          created_at?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          attempts: number
          body_html: string
          body_text: string | null
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          notification_type: string
          recipient_email: string
          recipient_name: string | null
          related_entity_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          attempts?: number
          body_html: string
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type: string
          recipient_email: string
          recipient_name?: string | null
          related_entity_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          attempts?: number
          body_html?: string
          body_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type?: string
          recipient_email?: string
          recipient_name?: string | null
          related_entity_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      error_log: {
        Row: {
          created_at: string | null
          error_message: string
          id: string
          page: string | null
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          id?: string
          page?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          id?: string
          page?: string | null
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          config: Json
          created_at: string
          credentials_encrypted: string | null
          id: string
          integration_type: string
          is_enabled: boolean | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          integration_type: string
          is_enabled?: boolean | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          integration_type?: string
          is_enabled?: boolean | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string | null
          notes: string | null
          paid_date: string | null
          status: string | null
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          client_id: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_id?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string | null
          notes?: string | null
          paid_date?: string | null
          status?: string | null
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_invoices_therapist"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_unsent: boolean | null
          original_content: string | null
          read: boolean | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sender_type: string
          therapist_id: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_unsent?: boolean | null
          original_content?: string | null
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sender_type: string
          therapist_id: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_unsent?: boolean | null
          original_content?: string | null
          read?: boolean | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sender_type?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      note_templates: {
        Row: {
          assessment_template: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          objective_template: string | null
          plan_template: string | null
          subjective_template: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          assessment_template?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          objective_template?: string | null
          plan_template?: string | null
          subjective_template?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          assessment_template?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          objective_template?: string | null
          plan_template?: string | null
          subjective_template?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          appointment_reminders: boolean | null
          billing_notifications: boolean | null
          created_at: string
          email_enabled: boolean | null
          id: string
          message_notifications: boolean | null
          phone_number: string | null
          push_enabled: boolean | null
          reminder_hours_before: number | null
          sms_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_reminders?: boolean | null
          billing_notifications?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          message_notifications?: boolean | null
          phone_number?: string | null
          push_enabled?: boolean | null
          reminder_hours_before?: number | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_reminders?: boolean | null
          billing_notifications?: boolean | null
          created_at?: string
          email_enabled?: boolean | null
          id?: string
          message_notifications?: boolean | null
          phone_number?: string | null
          push_enabled?: boolean | null
          reminder_hours_before?: number | null
          sms_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean | null
          used_at: string | null
          user_email: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_email: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      payment_reminders: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      phi_access_log: {
        Row: {
          access_type: string
          accessed_fields: Json | null
          client_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          justification: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_type: string
          accessed_fields?: Json | null
          client_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_type?: string
          accessed_fields?: Json | null
          client_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          justification?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          practice_name: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          practice_name?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          practice_name?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          notify_via_email: boolean | null
          official_title: string | null
          phone: string | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          notify_via_email?: boolean | null
          official_title?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          notify_via_email?: boolean | null
          official_title?: string | null
          phone?: string | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progress_goals: {
        Row: {
          category: string | null
          completed_at: string | null
          completion_percentage: number | null
          created_at: string
          description: string | null
          has_unread_updates: boolean | null
          id: string
          last_updated_by: string | null
          priority: string | null
          progress_path_id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          has_unread_updates?: boolean | null
          id?: string
          last_updated_by?: string | null
          priority?: string | null
          progress_path_id: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          has_unread_updates?: boolean | null
          id?: string
          last_updated_by?: string | null
          priority?: string | null
          progress_path_id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_goals_progress_path_id_fkey"
            columns: ["progress_path_id"]
            isOneToOne: false
            referencedRelation: "progress_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_metrics: {
        Row: {
          anxiety_level: number | null
          created_at: string
          id: string
          metric_date: string
          mood_score: number | null
          notes: string | null
          progress_path_id: string
        }
        Insert: {
          anxiety_level?: number | null
          created_at?: string
          id?: string
          metric_date: string
          mood_score?: number | null
          notes?: string | null
          progress_path_id: string
        }
        Update: {
          anxiety_level?: number | null
          created_at?: string
          id?: string
          metric_date?: string
          mood_score?: number | null
          notes?: string | null
          progress_path_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_metrics_progress_path_id_fkey"
            columns: ["progress_path_id"]
            isOneToOne: false
            referencedRelation: "progress_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_milestones: {
        Row: {
          achieved_date: string | null
          created_at: string
          description: string | null
          goal_id: string | null
          has_unread_updates: boolean | null
          id: string
          is_achieved: boolean | null
          last_updated_by: string | null
          progress_path_id: string
          title: string
          updated_at: string
        }
        Insert: {
          achieved_date?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          has_unread_updates?: boolean | null
          id?: string
          is_achieved?: boolean | null
          last_updated_by?: string | null
          progress_path_id: string
          title: string
          updated_at?: string
        }
        Update: {
          achieved_date?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          has_unread_updates?: boolean | null
          id?: string
          is_achieved?: boolean | null
          last_updated_by?: string | null
          progress_path_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "progress_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_milestones_progress_path_id_fkey"
            columns: ["progress_path_id"]
            isOneToOne: false
            referencedRelation: "progress_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_paths: {
        Row: {
          baseline_snapshot: string | null
          client_id: string
          core_focus: string | null
          created_at: string
          environment_triggers: string | null
          has_unread_updates: boolean | null
          id: string
          last_updated_by: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          baseline_snapshot?: string | null
          client_id: string
          core_focus?: string | null
          created_at?: string
          environment_triggers?: string | null
          has_unread_updates?: boolean | null
          id?: string
          last_updated_by?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          baseline_snapshot?: string | null
          client_id?: string
          core_focus?: string | null
          created_at?: string
          environment_triggers?: string | null
          has_unread_updates?: boolean | null
          id?: string
          last_updated_by?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_paths_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_tools: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          editable_data: Json | null
          has_unread_updates: boolean | null
          id: string
          is_completed: boolean | null
          last_updated_by: string | null
          progress_path_id: string
          resource_url: string | null
          title: string
          tool_type: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          editable_data?: Json | null
          has_unread_updates?: boolean | null
          id?: string
          is_completed?: boolean | null
          last_updated_by?: string | null
          progress_path_id: string
          resource_url?: string | null
          title: string
          tool_type?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          editable_data?: Json | null
          has_unread_updates?: boolean | null
          id?: string
          is_completed?: boolean | null
          last_updated_by?: string | null
          progress_path_id?: string
          resource_url?: string | null
          title?: string
          tool_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_tools_progress_path_id_fkey"
            columns: ["progress_path_id"]
            isOneToOne: false
            referencedRelation: "progress_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_billing: {
        Row: {
          active: boolean
          amount: number
          client_id: string
          created_at: string
          description: string | null
          frequency: string
          id: string
          next_billing_date: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          client_id: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          next_billing_date: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          next_billing_date?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          completed: boolean | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          reminder_date: string
          therapist_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          reminder_date: string
          therapist_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          reminder_date?: string
          therapist_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reminders_therapist"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_documents: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          therapist_id: string
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          therapist_id: string
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          therapist_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_note_versions: {
        Row: {
          assessment: string | null
          change_summary: string | null
          edited_at: string
          edited_by: string
          id: string
          note_id: string
          objective: string | null
          plan: string | null
          subjective: string | null
          therapist_id: string
          version_number: number
        }
        Insert: {
          assessment?: string | null
          change_summary?: string | null
          edited_at?: string
          edited_by: string
          id?: string
          note_id: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          therapist_id: string
          version_number: number
        }
        Update: {
          assessment?: string | null
          change_summary?: string | null
          edited_at?: string
          edited_by?: string
          id?: string
          note_id?: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          therapist_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "soap_note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "soap_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      soap_notes: {
        Row: {
          appointment_id: string | null
          assessment: string | null
          client_id: string
          created_at: string | null
          id: string
          objective: string | null
          plan: string | null
          subjective: string | null
          therapist_id: string
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          assessment?: string | null
          client_id: string
          created_at?: string | null
          id?: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          therapist_id: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          assessment?: string | null
          client_id?: string
          created_at?: string | null
          id?: string
          objective?: string | null
          plan?: string | null
          subjective?: string | null
          therapist_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_soap_notes_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_soap_notes_therapist"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soap_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      telehealth_sessions: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          room_id: string
          started_at: string | null
          status: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          room_id: string
          started_at?: string | null
          status?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa: {
        Row: {
          backup_codes: string[] | null
          created_at: string
          enabled: boolean
          id: string
          secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string
          enabled?: boolean
          id?: string
          secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          created_at: string | null
          event_metadata: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_metadata?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          migration_completed: boolean | null
          migration_dismissed: boolean | null
          migration_first_shown_at: string | null
          migration_last_dismissed_at: string | null
          onboarding_step: number | null
          tutorial_completed: boolean | null
          tutorial_dismissed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          migration_completed?: boolean | null
          migration_dismissed?: boolean | null
          migration_first_shown_at?: string | null
          migration_last_dismissed_at?: string | null
          onboarding_step?: number | null
          tutorial_completed?: boolean | null
          tutorial_dismissed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          migration_completed?: boolean | null
          migration_dismissed?: boolean | null
          migration_first_shown_at?: string | null
          migration_last_dismissed_at?: string | null
          onboarding_step?: number | null
          tutorial_completed?: boolean | null
          tutorial_dismissed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          dashboard_widgets_order: Json | null
          dashboard_widgets_visible: Json | null
          id: string
          show_dashboard_charts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_widgets_order?: Json | null
          dashboard_widgets_visible?: Json | null
          id?: string
          show_dashboard_charts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_widgets_order?: Json | null
          dashboard_widgets_visible?: Json | null
          id?: string
          show_dashboard_charts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoom_auth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zoom_meetings: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          ended_at: string | null
          id: string
          join_url: string
          meeting_id: string
          password: string | null
          start_url: string
          started_at: string | null
          status: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          join_url: string
          meeting_id: string
          password?: string | null
          start_url: string
          started_at?: string | null
          status?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          join_url?: string
          meeting_id?: string
          password?: string | null
          start_url?: string
          started_at?: string | null
          status?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_meetings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_expired_sessions: { Args: never; Returns: undefined }
      export_phi_access_logs: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          access_type: string
          accessed_fields: Json
          client_id: string
          entity_id: string
          entity_type: string
          justification: string
          log_timestamp: string
        }[]
      }
      export_user_audit_logs: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          action: string
          details: Json
          entity_id: string
          entity_type: string
          log_timestamp: string
          success: boolean
        }[]
      }
      generate_access_code: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_admin_user: {
        Args: { admin_code: string; admin_email: string }
        Returns: boolean
      }
      verify_admin_access_code: {
        Args: { input_code: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "professional" | "client" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["professional", "client", "admin"],
    },
  },
} as const
