import { z } from 'zod';

export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain uppercase letter")
  .regex(/[a-z]/, "Password must contain lowercase letter")
  .regex(/\d/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain special character");

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        valid: false, 
        errors: error.errors.map(e => e.message) 
      };
    }
    return { valid: false, errors: ['Invalid password'] };
  }
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 12
  ];
  
  const score = checks.filter(Boolean).length;
  if (score >= 5) return 'strong';
  if (score >= 4) return 'medium';
  return 'weak';
}
