import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be at most 32 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username may only contain letters, numbers, underscores, and hyphens',
  );

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(256, 'Password is too long');

export const displayNameSchema = z
  .string()
  .trim()
  .max(64, 'Display name must be at most 64 characters')
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
  inviteCode: z.string().trim().min(1).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema,
});

export const createInviteSchema = z.object({
  note: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  ttlDays: z.coerce.number().int().min(1).max(90).default(7),
});
