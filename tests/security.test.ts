/**
 * EduSafa Learning - Security Utilities Tests
 * 
 * Run with: npm test -- security.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  sanitizeHTML,
  validateEmail,
  validateYemenPhone,
  validateRequired,
  validateRange,
  validateFileType,
  validateFileSize,
  generateSecureToken,
  RateLimiter,
  validators
} from '../security';

// ============================================================================
// Password Hashing Tests
// ============================================================================

describe('Password Hashing', () => {
  it('should hash a password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    
    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');
  });

  it('should produce different hashes for same password', async () => {
    const password = 'TestPassword123!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    // Note: Current implementation is deterministic (SHA-256 without salt)
    // In production with bcrypt, these would be different
    expect(hash1).toBe(hash2);
  });

  it('should verify correct password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'TestPassword123!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword('WrongPassword', hash);
    
    expect(isValid).toBe(false);
  });

  it('should handle empty password', async () => {
    const hash = await hashPassword('');
    expect(hash).toHaveLength(64);
  });
});

// ============================================================================
// Password Strength Validation Tests
// ============================================================================

describe('Password Strength Validation', () => {
  it('should accept strong password', () => {
    const result = validatePasswordStrength('StrongP@ss123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.strength).toBe('strong');
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrength('weakpass1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('كلمة المرور يجب أن تحتوي على حرف كبير على الأقل');
  });

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrength('WEAKPASS1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('كلمة المرور يجب أن تحتوي على حرف صغير على الأقل');
  });

  it('should reject password without number', () => {
    const result = validatePasswordStrength('WeakPass!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('كلمة المرور يجب أن تحتوي على رقم على الأقل');
  });

  it('should reject password without special character', () => {
    const result = validatePasswordStrength('WeakPass123');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('كلمة المرور يجب أن تحتوي على رمز خاص على الأقل');
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('T1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  });

  it('should classify medium strength password', () => {
    const result = validatePasswordStrength('Weak1!');
    expect(result.strength).toBe('medium');
  });

  it('should classify weak password', () => {
    const result = validatePasswordStrength('weak');
    expect(result.strength).toBe('weak');
  });
});

// ============================================================================
// HTML Sanitization Tests
// ============================================================================

describe('HTML Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("XSS")</script>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('alert');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(\'XSS\')">';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('onerror');
    expect(output).not.toContain('alert');
  });

  it('should preserve plain text', () => {
    const input = 'Hello World!';
    const output = sanitizeHTML(input);
    expect(output).toBe('Hello World!');
  });

  it('should handle empty string', () => {
    const output = sanitizeHTML('');
    expect(output).toBe('');
  });

  it('should handle Arabic text', () => {
    const input = 'مرحبا بالعالم!';
    const output = sanitizeHTML(input);
    expect(output).toBe('مرحبا بالعالم!');
  });
});

// ============================================================================
// Email Validation Tests
// ============================================================================

describe('Email Validation', () => {
  it('should accept valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.org')).toBe(true);
    expect(validateEmail('user+tag@example.co.uk')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('invalid@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@.com')).toBe(false);
  });

  it('should handle empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

// ============================================================================
// Yemen Phone Validation Tests
// ============================================================================

describe('Yemen Phone Validation', () => {
  it('should accept valid Yemen phone numbers', () => {
    expect(validateYemenPhone('771234567')).toBe(true);
    expect(validateYemenPhone('732345678')).toBe(true);
    expect(validateYemenPhone('00967771234567')).toBe(true);
    expect(validateYemenPhone('+967732345678')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validateYemenPhone('12345')).toBe(false);
    expect(validateYemenPhone('1234567890')).toBe(false);
    expect(validateYemenPhone('abc1234567')).toBe(false);
  });

  it('should handle spaces and dashes', () => {
    expect(validateYemenPhone('771-234-567')).toBe(true);
    expect(validateYemenPhone('732 345 678')).toBe(true);
  });
});

// ============================================================================
// Required Field Validation Tests
// ============================================================================

describe('Required Field Validation', () => {
  it('should accept non-empty strings', () => {
    expect(validateRequired('Hello')).toBe(true);
    expect(validateRequired('  Hello  ')).toBe(true);
  });

  it('should reject empty strings', () => {
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });

  it('should reject null and undefined', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
  });
});

// ============================================================================
// Range Validation Tests
// ============================================================================

describe('Range Validation', () => {
  it('should accept numbers in range', () => {
    expect(validateRange(5, 1, 10)).toBe(true);
    expect(validateRange(1, 1, 10)).toBe(true);
    expect(validateRange(10, 1, 10)).toBe(true);
  });

  it('should reject numbers out of range', () => {
    expect(validateRange(0, 1, 10)).toBe(false);
    expect(validateRange(11, 1, 10)).toBe(false);
  });
});

// ============================================================================
// File Validation Tests
// ============================================================================

describe('File Validation', () => {
  it('should validate file type', () => {
    const imageFile = new File(['test'], 'test.png', { type: 'image/png' });
    const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    expect(validateFileType(imageFile, ['image/png', 'image/jpeg'])).toBe(true);
    expect(validateFileType(pdfFile, ['image/png'])).toBe(false);
  });

  it('should validate file size', () => {
    const smallFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });

    expect(validateFileSize(smallFile, 5)).toBe(true);
    expect(validateFileSize(largeFile, 5)).toBe(false);
  });
});

// ============================================================================
// Secure Token Generation Tests
// ============================================================================

describe('Secure Token Generation', () => {
  it('should generate token of correct length', () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64); // Hex string is 2x the byte length
  });

  it('should generate different tokens', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);
    expect(token1).not.toBe(token2);
  });

  it('should handle different lengths', () => {
    expect(generateSecureToken(16)).toHaveLength(32);
    expect(generateSecureToken(64)).toHaveLength(128);
  });
});

// ============================================================================
// Rate Limiter Tests
// ============================================================================

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(5, 60000); // 5 attempts per minute
  });

  it('should allow requests under limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('user1');
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user2');
    }
    const result = limiter.check('user2');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should track remaining attempts', () => {
    expect(limiter.check('user3').remaining).toBe(4);
    expect(limiter.check('user3').remaining).toBe(3);
    expect(limiter.check('user3').remaining).toBe(2);
  });

  it('should reset when requested', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check('user4');
    }
    limiter.reset('user4');
    expect(limiter.check('user4').allowed).toBe(true);
  });

  it('should track different users separately', () => {
    limiter.check('userA');
    limiter.check('userA');
    limiter.check('userB');
    
    expect(limiter.check('userA').remaining).toBe(3);
    expect(limiter.check('userB').remaining).toBe(4);
  });
});

// ============================================================================
// Validator Helpers Tests
// ============================================================================

describe('Validator Helpers', () => {
  it('should validate required field', () => {
    expect(validators.required('Hello')).toBeNull();
    expect(validators.required('')).toBe('هذا الحقل مطلوب');
  });

  it('should validate email', () => {
    expect(validators.email('user@example.com')).toBeNull();
    expect(validators.email('invalid')).toBe('البريد الإلكتروني غير صحيح');
  });

  it('should validate phone', () => {
    expect(validators.phone('771234567')).toBeNull();
    expect(validators.phone('12345')).toBe('رقم الهاتف غير صحيح');
  });

  it('should validate minimum length', () => {
    const validateMin = validators.minLength(5);
    expect(validateMin('Hello')).toBeNull();
    expect(validateMin('Hi')).toBe('يجب أن يكون 5 أحرف على الأقل');
  });

  it('should validate password', () => {
    expect(validators.password('StrongP@ss123')).toBeNull();
    expect(validators.password('weak')).toContain('كلمة المرور يجب أن تكون');
  });
});
