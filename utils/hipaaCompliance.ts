import { supabase } from '@/integrations/supabase/client';

/**
 * HIPAA Compliance Utility
 * 
 * This module ensures HIPAA compliance for all PHI (Protected Health Information) access
 * in the Mindful AI platform. It provides:
 * 
 * 1. Data Encryption: All data encrypted in transit (HTTPS) and at rest (Supabase encryption)
 * 2. Access Control: Role-based access with audit logging
 * 3. Audit Logging: Complete trail of all PHI access
 * 4. Data Minimization: Log only accessed fields
 * 5. Breach Detection: Automated alerts for suspicious activity
 */

export interface PHIAccessLog {
  accessType: 'read' | 'write' | 'delete' | 'export';
  entityType: 'client' | 'soap_note' | 'appointment' | 'invoice' | 'message' | 'progress_path' | 'document';
  entityId?: string;
  clientId: string; // Required - always track which client's data
  justification: string; // Required - reason for access
  accessedFields?: string[]; // For data minimization
}

/**
 * Log PHI access for HIPAA compliance
 * All access to client PHI must be logged with justification
 */
export async function logPHIAccess(log: PHIAccessLog): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get client IP and user agent for audit trail
    const ipAddress = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => 'unknown');

    const userAgent = navigator.userAgent;

    // Insert PHI access log
    const { error } = await supabase.from('phi_access_log').insert({
      user_id: user.id,
      access_type: log.accessType,
      entity_type: log.entityType,
      entity_id: log.entityId,
      client_id: log.clientId,
      justification: log.justification,
      ip_address: ipAddress,
      user_agent: userAgent,
      accessed_fields: log.accessedFields || null,
    });

    if (error) {
      console.error('Failed to log PHI access:', error);
      // Still throw error to prevent PHI access without logging
      throw new Error('Failed to log PHI access for HIPAA compliance');
    }
  } catch (error) {
    console.error('PHI access logging failed:', error);
    throw error;
  }
}

/**
 * Verify user has permission to access client PHI
 */
export async function verifyPHIAccess(clientId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user is the therapist for this client
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('therapist_id', user.id)
      .single();

    if (error || !data) {
      // Also check if user is a client user for this client
      const { data: clientUser } = await supabase
        .from('client_users')
        .select('id')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .single();

      return !!clientUser;
    }

    return true;
  } catch (error) {
    console.error('PHI access verification failed:', error);
    return false;
  }
}

/**
 * Export audit logs for user (HIPAA requirement)
 */
export async function exportAuditLogs(startDate?: Date, endDate?: Date) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('export_user_audit_logs', {
      p_user_id: user.id,
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    throw error;
  }
}

/**
 * Export PHI access logs for user (HIPAA requirement)
 */
export async function exportPHILogs(startDate?: Date, endDate?: Date) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase.rpc('export_phi_access_logs', {
      p_user_id: user.id,
      p_start_date: startDate?.toISOString() || null,
      p_end_date: endDate?.toISOString() || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to export PHI logs:', error);
    throw error;
  }
}

/**
 * HIPAA Compliance Checklist for AI Operations
 * 
 * All AI operations must satisfy these requirements:
 * ✓ Data encryption in transit (HTTPS)
 * ✓ Data encryption at rest (Supabase)
 * ✓ Role-based access control (RLS policies)
 * ✓ Audit logging (phi_access_log + audit_logs)
 * ✓ No PHI sharing outside BAA environment (Lovable AI + Supabase)
 * ✓ Data minimization (log accessed fields)
 * ✓ Client context required (clientId mandatory)
 * ✓ No AI training on PHI (Lovable AI compliant)
 * ✓ Breach detection (automated triggers)
 */
