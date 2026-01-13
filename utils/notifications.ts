import { supabase } from "@/integrations/supabase/client";
import { logError } from "./errorTracking";

export interface SendNotificationParams {
  recipient_id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  link?: string;
  send_email?: boolean;
}

export async function sendNotification(params: SendNotificationParams) {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: params,
    });

    if (error) {
      await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    await logError(error instanceof Error ? error : new Error(String(error)), window.location.pathname);
    return { success: false, error };
  }
}

// Setup realtime subscriptions for notifications
export function setupNotificationRealtime(
  userId: string,
  onNewNotification: (notification: unknown) => void
) {
  const channel = supabase
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        onNewNotification(payload.new);
      }
    )
    .subscribe();

  return channel;
}

// Setup realtime subscriptions for messages
export function setupMessagesRealtime(
  userId: string,
  onNewMessage: (message: unknown) => void
) {
  const channel = supabase
    .channel(`user:${userId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();

  return channel;
}

// Setup realtime subscriptions for appointments
export function setupAppointmentsRealtime(
  userId: string,
  onAppointmentChange: (appointment: unknown) => void
) {
  const channel = supabase
    .channel(`user:${userId}:appointments`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `therapist_id=eq.${userId}`
      },
      (payload) => {
        onAppointmentChange(payload);
      }
    )
    .subscribe();

  return channel;
}

// Setup realtime subscriptions for invoices
export function setupInvoicesRealtime(
  userId: string,
  onInvoiceChange: (invoice: unknown) => void
) {
  const channel = supabase
    .channel(`user:${userId}:invoices`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `therapist_id=eq.${userId}`
      },
      (payload) => {
        onInvoiceChange(payload);
      }
    )
    .subscribe();

  return channel;
}

// Setup realtime subscriptions for progress paths
export function setupProgressPathsRealtime(
  userId: string,
  onProgressPathChange: (progressPath: unknown) => void
) {
  const channel = supabase
    .channel(`user:${userId}:progress_paths`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'progress_paths',
        filter: `therapist_id=eq.${userId}`
      },
      (payload) => {
        onProgressPathChange(payload);
      }
    )
    .subscribe();

  return channel;
}
