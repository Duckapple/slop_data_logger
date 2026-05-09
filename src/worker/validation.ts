import { z } from 'zod';

const requiredString = z.string().trim().min(1, 'Required');

const optionalString = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v == null || v === '' ? null : v));

const isoDate = z
  .string()
  .min(1, 'Required')
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'Invalid date' });

export const incidentBodySchema = z
  .object({
    correctName: requiredString,
    misspelledName: requiredString,
    offenderName: requiredString,
    offenderHandle: optionalString,
    context: requiredString,
    source: optionalString,
    occurredAt: isoDate,
    notes: optionalString,
  })
  .refine(
    (d) => d.misspelledName.toLowerCase() !== d.correctName.toLowerCase(),
    {
      message: 'Misspelled name must differ from correct name (case-insensitive)',
      path: ['misspelledName'],
    },
  );

export type IncidentBody = z.infer<typeof incidentBodySchema>;

export const listFiltersSchema = z.object({
  q: z.string().trim().min(1).optional(),
  offender: z.string().trim().min(1).optional(),
  misspelledName: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  editDistanceMin: z.coerce.number().int().min(0).optional(),
  editDistanceMax: z.coerce.number().int().min(0).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  sort: z
    .enum(['occurredAt_desc', 'occurredAt_asc', 'editDistance_desc', 'offender_asc'])
    .default('occurredAt_desc'),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListFilters = z.infer<typeof listFiltersSchema>;

export const statsFiltersSchema = z.object({
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
});

export type StatsFilters = z.infer<typeof statsFiltersSchema>;

export const linkAttachmentSchema = z.object({
  kind: z.literal('link'),
  url: z
    .string()
    .url('Must be a valid URL')
    .refine((s) => /^https?:\/\//i.test(s), {
      message: 'URL must start with http:// or https://',
    }),
  caption: optionalString,
});

export type LinkAttachmentBody = z.infer<typeof linkAttachmentSchema>;

export function firstZodError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return 'Validation failed';
  const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message}`;
}
