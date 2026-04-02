import { describe, it, expect } from 'vitest';

import { formatIssueToMarkdown } from '../formatter.js';
import type { SanitizedIssue } from '../sanitizer.js';

const makeIssue = (overrides?: Partial<SanitizedIssue>): SanitizedIssue => ({
  identifier: 'MA-100',
  title: 'Fix login bug',
  description: 'Users cannot log in on Safari.',
  stateName: 'In Progress',
  priority: 2,
  labels: ['bug', 'auth'],
  comments: [
    {
      body: 'Reproduced on Safari 17.',
      createdAt: '2026-03-15T10:30:00.000Z',
      authorName: 'Alice',
    },
    {
      body: 'Fix deployed.',
      createdAt: '2026-03-16T14:00:00.000Z',
      authorName: 'Bob',
    },
  ],
  ...overrides,
});

describe('formatIssueToMarkdown', () => {
  it('should produce full Markdown with comments', () => {
    const md = formatIssueToMarkdown(makeIssue());

    expect(md).toContain('# MA-100: Fix login bug');
    expect(md).toContain('**Status**: In Progress');
    expect(md).toContain('**Priority**: High');
    expect(md).toContain('**Labels**: bug, auth');
    expect(md).toContain('## Description');
    expect(md).toContain('Users cannot log in on Safari.');
    expect(md).toContain('## Comments (2)');
    expect(md).toContain('### Comment 1 — Alice (2026-03-15)');
    expect(md).toContain('Reproduced on Safari 17.');
    expect(md).toContain('### Comment 2 — Bob (2026-03-16)');
    expect(md).toContain('Fix deployed.');
  });

  it('should NOT show Comments section when there are no comments', () => {
    const md = formatIssueToMarkdown(makeIssue({ comments: [] }));
    expect(md).not.toContain('## Comments');
  });

  it('should show placeholder when description is null', () => {
    const md = formatIssueToMarkdown(makeIssue({ description: null }));
    expect(md).toContain('*No description provided.*');
  });

  it('should NOT show Status when stateName is null', () => {
    const md = formatIssueToMarkdown(makeIssue({ stateName: null }));
    expect(md).not.toContain('**Status**');
    // Priority should still be present
    expect(md).toContain('**Priority**: High');
  });

  it('should NOT show Labels when labels is empty', () => {
    const md = formatIssueToMarkdown(makeIssue({ labels: [] }));
    expect(md).not.toContain('**Labels**');
  });

  it('should format date as YYYY-MM-DD', () => {
    const md = formatIssueToMarkdown(
      makeIssue({
        comments: [
          {
            body: 'Test',
            createdAt: '2026-12-31T23:59:59.999Z',
            authorName: 'Eve',
          },
        ],
      }),
    );
    expect(md).toContain('(2026-12-31)');
    // Should NOT contain the full ISO timestamp
    expect(md).not.toContain('T23:59:59');
  });
});
