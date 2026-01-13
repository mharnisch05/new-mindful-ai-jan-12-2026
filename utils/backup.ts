// Backup and data export utilities for disaster recovery

import { supabase } from '@/integrations/supabase/client';
import { logError } from './errorTracking';

export interface BackupMetadata {
  timestamp: string;
  userId: string;
  tables: string[];
  recordCount: number;
}

export const exportUserData = async (userId: string): Promise<Blob> => {
  try {
    const exportData: Record<string, unknown> = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId,
        version: '1.0',
      },
      data: {},
    };

    // Export user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (profileData) exportData.data.profiles = [profileData];

    // Export clients
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('therapist_id', userId);
    if (clientsData) exportData.data.clients = clientsData;

    // Export appointments
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*')
      .eq('therapist_id', userId);
    if (appointmentsData) exportData.data.appointments = appointmentsData;

    // Export SOAP notes
    const { data: notesData } = await supabase
      .from('soap_notes')
      .select('*')
      .eq('therapist_id', userId);
    if (notesData) exportData.data.soap_notes = notesData;

    // Export invoices
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('therapist_id', userId);
    if (invoicesData) exportData.data.invoices = invoicesData;

    // Export messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('therapist_id', userId);
    if (messagesData) exportData.data.messages = messagesData;

    // Export reminders
    const { data: remindersData } = await supabase
      .from('reminders')
      .select('*')
      .eq('therapist_id', userId);
    if (remindersData) exportData.data.reminders = remindersData;

    // Export progress paths
    const { data: pathsData } = await supabase
      .from('progress_paths')
      .select('*')
      .eq('therapist_id', userId);
    if (pathsData) exportData.data.progress_paths = pathsData;

    const jsonString = JSON.stringify(exportData, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  } catch (error) {
    await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    throw new Error('Failed to export data');
  }
};

export const downloadBackup = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Scheduled backup reminder (client-side check)
export const checkBackupReminder = (): boolean => {
  const lastBackup = localStorage.getItem('lastBackupDate');
  if (!lastBackup) return true;

  const daysSinceBackup = Math.floor(
    (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceBackup >= 30; // Remind every 30 days
};

export const setLastBackupDate = (): void => {
  localStorage.setItem('lastBackupDate', new Date().toISOString());
};
