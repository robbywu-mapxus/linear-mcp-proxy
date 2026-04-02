import type { SanitizedIssue } from './types.js';

const PRIORITY_LABELS: Record<number, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

export function formatIssueToMarkdown(issue: SanitizedIssue): string {
  const lines: string[] = [];

  lines.push(`# ${issue.identifier}: ${issue.title}`);

  const metaParts: string[] = [];
  if (issue.stateName !== null) {
    metaParts.push(`**Status**: ${issue.stateName}`);
  }
  metaParts.push(
    `**Priority**: ${PRIORITY_LABELS[issue.priority] ?? `Unknown (${issue.priority})`}`,
  );
  if (issue.labels.length > 0) {
    metaParts.push(`**Labels**: ${issue.labels.join(', ')}`);
  }
  lines.push(metaParts.join(' | '));

  lines.push('');
  lines.push('## Description');
  if (issue.description !== null && issue.description.trim().length > 0) {
    lines.push(issue.description);
  } else {
    lines.push('*No description provided.*');
  }

  if (issue.comments.length > 0) {
    lines.push('');
    lines.push(`## Comments (${issue.comments.length})`);
    issue.comments.forEach((comment, index) => {
      const date = comment.createdAt.slice(0, 10);
      lines.push('');
      lines.push(`### Comment ${index + 1} — ${comment.authorName} (${date})`);
      lines.push(comment.body);
    });
  }

  return lines.join('\n');
}
