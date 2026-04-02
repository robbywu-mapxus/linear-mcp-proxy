import type { FetchedIssue, SanitizedIssue } from './types.js';

export type { FetchedIssue, SanitizedIssue };

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const INTERNAL_IP_RE =
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/g;
const URL_WITH_AUTH_RE =
  /https?:\/\/[^\s]*[?&](?:token|key|secret|password|auth|credential|api_key|apikey|access_token)=[^\s]*/gi;
const SECRET_KV_RE =
  /\b(?:api_key|apikey|api[-_]?secret|token|secret|password|credential|auth_token|access_token)\s*[:=]\s*\S+/gi;

export function sanitizeText(text: string): string {
  let result = text;
  result = result.replace(URL_WITH_AUTH_RE, '[url-with-auth]');
  result = result.replace(SECRET_KV_RE, '[redacted-secret]');
  result = result.replace(EMAIL_RE, '[email]');
  result = result.replace(INTERNAL_IP_RE, '[internal-ip]');

  return result;
}

export function sanitize(raw: FetchedIssue): SanitizedIssue {
  return {
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description !== null ? sanitizeText(raw.description) : null,
    stateName: raw.stateName,
    priority: raw.priority,
    labels: raw.labels,
    comments: raw.comments.map((c) => ({
      body: sanitizeText(c.body),
      createdAt: c.createdAt,
      authorName: c.authorName ?? 'Unknown',
    })),
  };
}
