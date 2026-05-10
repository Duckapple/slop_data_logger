export type CreatedBy = {
  id: string;
  username: string;
  displayName: string | null;
};

export type Misspelling = {
  id: string;
  correctName: string;
  misspelledName: string;
  offenderName: string;
  offenderHandle: string | null;
  context: string;
  source: string | null;
  occurredAt: string;
  editDistance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: CreatedBy | null;
  attachments?: Attachment[];
};

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string | null;
};

export type Invite = {
  code: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
  url: string;
  createdBy?: { username: string; displayName: string | null };
  consumedBy?: { username: string; displayName: string | null } | null;
};

export type AttachmentKind = 'image' | 'link';

export type Attachment = {
  id: string;
  misspellingId: string;
  kind: AttachmentKind;
  url: string;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  caption: string | null;
  createdAt: string;
};

export type ListResponse = {
  items: Misspelling[];
  total: number;
};

export type StatsResponse = {
  totalIncidents: number;
  uniqueOffenders: number;
  uniqueMisspellings: number;
  averageEditDistance: number;
  mostCommonMisspelling: { value: string; count: number } | null;
  worstOffender: { value: string; count: number } | null;
  byMisspelling: { misspelledName: string; count: number }[];
  byOffender: { offenderName: string; count: number }[];
  bySource: { source: string; count: number }[];
  byEditDistance: { editDistance: number; count: number }[];
  overTime: { date: string; count: number }[];
};

export type ApiError = {
  error: { message: string; code: string };
};

export type SortKey =
  | 'occurredAt_desc'
  | 'occurredAt_asc'
  | 'editDistance_desc'
  | 'offender_asc';

export type ListFilters = {
  q?: string;
  offender?: string;
  misspelledName?: string;
  source?: string;
  editDistanceMin?: number;
  editDistanceMax?: number;
  from?: string;
  to?: string;
  sort?: SortKey;
  limit?: number;
  offset?: number;
};

export const ALLOWED_IMAGE_MIME: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
