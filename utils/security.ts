/**
 * EduSafa Learning - Security Utilities
 * 
 * Password hashing, input validation, and security helpers
 */

// Simple hash function for client-side (NOTE: Server-side bcrypt is recommended for production)
// This is a temporary solution until backend is implemented

/**
 * Hash a password using SHA-256
 * Includes a fallback for non-secure contexts (HTTP) where crypto.subtle is unavailable
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (window.isSecureContext && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for non-secure contexts (Simple SHA-256 implementation)
      return sha256Fallback(password);
    }
  } catch (e) {
    console.warn("Crypto subtle failed, using fallback:", e);
    return sha256Fallback(password);
  }
}

/**
 * Lightweight SHA-256 implementation for non-secure contexts
 */
function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const result: string[] = [];
  const words: number[] = [];
  const asciiLength = ascii.length * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let i, j;
  let s = ascii + "\x80";
  while (s.length % 64 - 56) s += "\x00";
  for (i = 0; i < s.length; i++) {
    j = s.charCodeAt(i);
    if (j >> 8) return ""; 
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words.length] = ((asciiLength / maxWord) | 0);
  words[words.length] = (asciiLength | 0);

  for (j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      if (i >= 16) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      const t1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) + k[i] + (w[i] | 0)) | 0;
      const t2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]))) | 0;
      hash[7] = hash[6]; hash[6] = hash[5]; hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2]; hash[2] = hash[1]; hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result.push((b < 16 ? "0" : "") + b.toString(16));
    }
  }
  return result.join("");
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

/**
 * Validate password strength
 * Requirements: Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let strengthScore = 0;

  if (password.length < 8) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  } else if (password.length >= 12) {
    strengthScore++;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف صغير على الأقل');
  } else {
    strengthScore++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على حرف كبير على الأقل');
  } else {
    strengthScore++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رقم على الأقل');
  } else {
    strengthScore++;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('كلمة المرور يجب أن تحتوي على رمز خاص على الأقل');
  } else {
    strengthScore++;
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (strengthScore >= 4) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';

  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}

/**
 * Sanitize HTML to prevent XSS (Safe version for all environments)
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Yemen format)
 */
export function validateYemenPhone(phone: string): boolean {
  const phoneRegex = /^(00967|\+967|0)?[1-7][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s-/g, ''));
}

/**
 * Normalize phone number for comparison
 * Removes spaces, dashes, and standardizes format
 */
export function normalizePhone(phone: string): string {
  return phone ? phone.replace(/[\s-+]/g, '').replace(/^00/, '') : '';
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Validate number range
 */
export function validateRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Create a secure random string
 */
export function generateSecureToken(length = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Rate limiter for client-side
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 5, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, resetIn: this.windowMs };
    }

    if (record.count >= this.limit) {
      return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
    }

    record.count++;
    return { allowed: true, remaining: this.limit - record.count, resetIn: record.resetTime - now };
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Export validation hooks for forms
export const validators = {
  required: (value: string | null | undefined) => validateRequired(value) ? null : 'هذا الحقل مطلوب',
  email: (value: string) => validateEmail(value) ? null : 'البريد الإلكتروني غير صحيح',
  phone: (value: string) => validateYemenPhone(value) ? null : 'رقم الهاتف غير صحيح',
  minLength: (min: number) => (value: string) => 
    value.length >= min ? null : `يجب أن يكون ${min} أحرف على الأقل`,
  password: (value: string) => {
    const result = validatePasswordStrength(value);
    if (result.valid) return null;
    return result.errors.join('، ');
  }
};
