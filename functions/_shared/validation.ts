// Server-side input validation for edge functions

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '');
};

export const validateAmount = (amount: any): boolean => {
  const num = Number(amount);
  return !isNaN(num) && num > 0 && num < 1000000 && isFinite(num);
};

export const isSafeString = (input: string): boolean => {
  // Check for SQL injection patterns
  const dangerousPatterns = [
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(\bDROP\b)/i,
    /(\bDELETE\b)/i,
    /(\bINSERT\b)/i,
    /(\bUPDATE\b)/i,
    /(\bEXEC\b)/i,
    /(--)/,
    /(;.*--)/,
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(input));
};

export const validateDateString = (date: string): boolean => {
  const parsed = Date.parse(date);
  return !isNaN(parsed) && parsed > 0;
};

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const assertValid = (condition: boolean, message: string, field?: string): void => {
  if (!condition) {
    throw new ValidationError(message, field);
  }
};
