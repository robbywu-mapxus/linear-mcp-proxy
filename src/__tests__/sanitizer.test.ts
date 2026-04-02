import { describe, it, expect } from 'vitest';

import { sanitizeText, sanitize } from '../sanitizer.js';
import type { FetchedIssue } from '../types.js';

// ── sanitizeText ──

describe('sanitizeText', () => {
  it('should mask a single email', () => {
    expect(sanitizeText('Contact alice@example.com for details')).toBe(
      'Contact [email] for details',
    );
  });

  it('should mask multiple emails', () => {
    expect(sanitizeText('Send to alice@example.com and bob@corp.co')).toBe(
      'Send to [email] and [email]',
    );
  });

  it('should mask internal IP 10.x.x.x', () => {
    expect(sanitizeText('Server at 10.0.1.55 is down')).toBe('Server at [internal-ip] is down');
  });

  it('should mask internal IP 172.16-31.x.x', () => {
    expect(sanitizeText('Proxy on 172.16.0.1 failed')).toBe('Proxy on [internal-ip] failed');
    expect(sanitizeText('Host 172.31.255.255 unreachable')).toBe('Host [internal-ip] unreachable');
  });

  it('should mask internal IP 192.168.x.x', () => {
    expect(sanitizeText('Gateway 192.168.1.1 is slow')).toBe('Gateway [internal-ip] is slow');
  });

  it('should NOT mask public IPs', () => {
    expect(sanitizeText('DNS 8.8.8.8 is reachable')).toBe('DNS 8.8.8.8 is reachable');
    expect(sanitizeText('Server 203.0.113.5 responded')).toBe('Server 203.0.113.5 responded');
  });

  it('should mask URL with auth params', () => {
    expect(sanitizeText('Visit https://api.example.com/data?token=abc123')).toBe(
      'Visit [url-with-auth]',
    );
    expect(sanitizeText('Go to https://app.io/hook?key=secret_val&foo=bar')).toBe(
      'Go to [url-with-auth]',
    );
  });

  it('should NOT mask normal URLs', () => {
    expect(sanitizeText('See https://linear.app/team/issue/MA-1')).toBe(
      'See https://linear.app/team/issue/MA-1',
    );
  });

  it('should mask API key / token patterns', () => {
    expect(sanitizeText('api_key: sk_live_abc123')).toBe('[redacted-secret]');
    expect(sanitizeText('token=my_secret_token')).toBe('[redacted-secret]');
    expect(sanitizeText('secret: super-secret-value')).toBe('[redacted-secret]');
    expect(sanitizeText('password: hunter2')).toBe('[redacted-secret]');
  });

  it('should preserve normal text', () => {
    const text = 'This is a normal bug report with no sensitive data.';
    expect(sanitizeText(text)).toBe(text);
  });
});

// ── sanitize (full issue) ──

describe('sanitize', () => {
  const makeRaw = (overrides?: Partial<FetchedIssue>): FetchedIssue => ({
    identifier: 'MA-100',
    title: 'Test issue',
    description: 'Contact alice@example.com on 10.0.0.1',
    stateName: 'In Progress',
    priority: 2,
    labels: ['bug', 'urgent'],
    comments: [
      {
        body: 'Deployed to 192.168.1.10 with token=xyz',
        createdAt: '2026-03-15T10:00:00.000Z',
        authorName: 'Alice',
      },
    ],
    ...overrides,
  });

  it('should sanitize a full issue and strip email/ip from description and comments', () => {
    const result = sanitize(makeRaw());

    expect(result.identifier).toBe('MA-100');
    expect(result.title).toBe('Test issue');
    expect(result.description).toBe('Contact [email] on [internal-ip]');
    expect(result.stateName).toBe('In Progress');
    expect(result.priority).toBe(2);
    expect(result.labels).toEqual(['bug', 'urgent']);

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0].body).toBe('Deployed to [internal-ip] with [redacted-secret]');
    expect(result.comments[0].authorName).toBe('Alice');
    // email and avatarUrl must NOT appear (they are never included in FetchedIssue)
    expect(JSON.stringify(result)).not.toContain('alice@example.com');
  });

  it('should set authorName to "Unknown" when authorName is null', () => {
    const raw = makeRaw({
      comments: [
        {
          body: 'automated comment',
          createdAt: '2026-01-01T00:00:00.000Z',
          authorName: null,
        },
      ],
    });
    const result = sanitize(raw);
    expect(result.comments[0].authorName).toBe('Unknown');
  });

  it('should return null description when raw description is null', () => {
    const raw = makeRaw({ description: null });
    const result = sanitize(raw);
    expect(result.description).toBeNull();
  });
});
