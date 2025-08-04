import { z } from 'zod';

/**
 * Authentication validation schemas following PRP security patterns
 * Implements comprehensive input validation to prevent injection attacks
 */

// Password validation following security requirements from PRP
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine((password) => {
    // Check for common passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin123'];
    return !commonPasswords.some(common => 
      password.toLowerCase().includes(common)
    );
  }, 'Password is too common');

// Email validation with additional security checks
const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .transform((email) => email.trim())
  .refine((email) => {
    // Prevent email injection attacks
    const dangerousPatterns = ['\n', '\r', '%0a', '%0d'];
    return !dangerousPatterns.some(pattern => 
      email.includes(pattern)
    );
  }, 'Email contains invalid characters');

// Registration schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
  acceptTerms: z.boolean()
    .refine((val) => val === true, 'You must accept the terms and conditions')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  captchaToken: z.string().optional() // For rate limiting protection
});

// Password reset request schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
});

// Password reset schema
export const resetPasswordSchema = z.object({
  token: z.string()
    .length(64, 'Invalid reset token')
    .regex(/^[a-zA-Z0-9]+$/, 'Invalid token format'),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// OAuth callback schema
export const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  provider: z.enum(['google', 'github', 'facebook'])
});

// Two-factor authentication schemas
export const setup2FASchema = z.object({
  password: z.string().min(1, 'Password is required for 2FA setup')
});

export const verify2FASchema = z.object({
  token: z.string()
    .length(6, '2FA token must be 6 digits')
    .regex(/^\d+$/, '2FA token must contain only numbers')
});

// Token refresh schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
    .regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/, 'Invalid token format')
});

// Update profile schema
export const updateProfileSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
    .optional(),
  email: emailSchema.optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
  confirmNewPassword: z.string().optional()
}).refine((data) => {
  // If changing password, current password is required
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: 'Current password is required to change password',
  path: ['currentPassword']
}).refine((data) => {
  // If new password provided, confirm password must match
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "New passwords don't match",
  path: ['confirmNewPassword']
});

// Session validation schema
export const sessionSchema = z.object({
  sessionId: z.string()
    .length(64, 'Invalid session ID')
    .regex(/^[a-f0-9]+$/, 'Invalid session format'),
  userId: z.string().uuid('Invalid user ID'),
  deviceInfo: z.object({
    userAgent: z.string().max(500),
    ip: z.string().ip(),
    fingerprint: z.string().optional()
  }).optional()
});

// API key schema for service authentication
export const apiKeySchema = z.object({
  key: z.string()
    .min(32, 'API key must be at least 32 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'Invalid API key format'),
  secret: z.string()
    .min(64, 'API secret must be at least 64 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'Invalid API secret format')
});

// Rate limiting schema
export const rateLimitSchema = z.object({
  identifier: z.string(), // IP or user ID
  endpoint: z.string(),
  timestamp: z.number(),
  count: z.number().int().positive()
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;
export type Setup2FAInput = z.infer<typeof setup2FASchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type APIKeyInput = z.infer<typeof apiKeySchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;