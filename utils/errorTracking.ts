import { supabase } from '@/integrations/supabase/client';

interface ErrorContext {
  componentStack?: string;
  userAgent?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorLog {
  message: string;
  stack?: string;
  page?: string;
  userAgent?: string;
  timestamp: Date;
}

export const trackError = async (
  error: Error,
  page?: string,
  userId?: string,
  context?: ErrorContext
) => {
  try {
    const errorData = {
      error_message: error.message,
      stack_trace: error.stack,
      page: page || window.location.pathname,
      user_id: userId,
    };

    // Log to console in development only
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error tracked:', {
        ...errorData,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    const { error: insertError } = await supabase
      .from('error_log')
      .insert(errorData);

    if (insertError && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Failed to track error:', insertError);
    }

    // Also log to audit_logs for security-related errors
    if (error.message.includes('auth') || error.message.includes('permission')) {
      await supabase.from('audit_logs').insert({
        user_id: userId || 'anonymous',
        action: 'ERROR',
        entity_type: 'security',
        entity_id: null,
        success: false,
        error_message: error.message,
      });
    }
  } catch (err) {
    // Silently fail to prevent infinite loops
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error tracking failed:', err);
    }
  }
};

export const trackSecurityEvent = async (
  userId: string,
  action: string,
  entityType: string,
  success: boolean,
  details?: Record<string, unknown>
) => {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: null,
      success,
      new_values: details,
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Security event tracking failed:', err);
    }
    // Silently fail to prevent infinite loops
  }
};

export const logError = async (error: Error | ErrorLog, page?: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : 'message' in error 
      ? error.message 
      : String(error);
    
    const errorLog = {
      user_id: user?.id || null,
      error_message: errorMessage,
      stack_trace: error instanceof Error ? error.stack : undefined,
      page: page || window.location.pathname,
      created_at: new Date().toISOString(),
    };

    await supabase.from('error_log').insert([errorLog]);
    
    // Also log to console in development only
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Error logged:', errorLog);
    }
  } catch (loggingError) {
    // Silently fail error logging to prevent infinite loops
    // Only log in development
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Failed to log error:', loggingError);
    }
  }
};

export const setupGlobalErrorHandler = () => {
  window.addEventListener('error', (event) => {
    logError(event.error, window.location.pathname);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError(
      new Error(`Unhandled promise rejection: ${event.reason}`),
      window.location.pathname
    );
  });
};

/**
 * Helper function to handle errors consistently across the application
 * Replaces console.error with proper error tracking
 */
export const handleError = async (
  error: unknown,
  context?: string,
  showToast?: (options: { title: string; description: string; variant?: 'destructive' }) => void
): Promise<void> => {
  const errorMessage = error instanceof Error 
    ? error.message 
    : typeof error === 'string' 
    ? error 
    : 'An unexpected error occurred';

  const errorObj = error instanceof Error 
    ? error 
    : new Error(errorMessage);

  // Track the error
  await logError(errorObj, context);

  // Show toast if provided
  if (showToast) {
    showToast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  }
};
