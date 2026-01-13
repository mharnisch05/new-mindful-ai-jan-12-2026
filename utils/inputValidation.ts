// Input validation and sanitization utilities for security

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s()-]/g, ''));
};

export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateDate = (date: string): boolean => {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && parsed > 0;
};

export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 255);
};

export const validateAmount = (amount: number): boolean => {
  return typeof amount === 'number' && 
         amount > 0 && 
         amount < 1000000 && 
         !isNaN(amount);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  return { valid: errors.length === 0, errors };
};

// SQL injection prevention - validate input for database queries
export const isSafeInput = (input: string): boolean => {
  const dangerousPatterns = [
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(\bDROP\b)/i,
    /(\bDELETE\b)/i,
    /(\bINSERT\b)/i,
    /(\bUPDATE\b)/i,
    /(\bEXEC\b)/i,
    /(--)/,
    /(;)/,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
};
