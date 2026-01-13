/**
 * Data validation utilities to prevent placeholder and invalid data
 */

const PLACEHOLDER_PATTERNS = [
  /^(hi|yo|ye|yew|yeww|test|placeholder|todo|tbd|n\/a|na|xxx)$/i,
  /^[a-z]{1,5}$/i, // Single short words like "hi", "yo", "ye", etc.
];

/**
 * Checks if a value appears to be a placeholder or invalid data
 */
export function isPlaceholderValue(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const trimmed = value.trim();
  
  // Check if it's too short to be real content
  if (trimmed.length < 3) return true;
  
  // Check against known placeholder patterns
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Validates and sanitizes text input, returning error message if invalid
 */
export function validateTextInput(
  value: string | null | undefined,
  fieldName: string,
  minLength: number = 3,
  maxLength: number = 5000
): { valid: boolean; error?: string } {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: `${fieldName} is required` };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return { 
      valid: false, 
      error: `${fieldName} must be at least ${minLength} characters` 
    };
  }

  if (trimmed.length > maxLength) {
    return { 
      valid: false, 
      error: `${fieldName} must be less than ${maxLength} characters` 
    };
  }

  if (isPlaceholderValue(trimmed)) {
    return { 
      valid: false, 
      error: `${fieldName} cannot contain placeholder text like "hi", "yo", "test", etc. Please provide meaningful content.` 
    };
  }

  return { valid: true };
}

/**
 * Sanitizes text for display, returning fallback if invalid
 */
export function sanitizeForDisplay(
  value: string | null | undefined,
  fallback: string = "Not provided"
): string {
  if (!value || typeof value !== 'string') return fallback;
  
  const trimmed = value.trim();
  
  if (trimmed.length === 0 || isPlaceholderValue(trimmed)) {
    return fallback;
  }
  
  return trimmed;
}

/**
 * Validates multiple fields at once, returning all errors
 */
export function validateMultipleFields(
  fields: Array<{ value: string | null | undefined; name: string; minLength?: number }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  fields.forEach(field => {
    const result = validateTextInput(field.value, field.name, field.minLength);
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}
