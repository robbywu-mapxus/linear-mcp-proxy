#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { LinearReadOnlyClient } from './linear-client.js';
import { sanitize } from './sanitizer.js';
import { formatIssueToMarkdown } from './formatter.js';

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'linear-mcp-proxy',
    version: '1.0.0',
  });

  const client = new LinearReadOnlyClient();

  server.registerTool(
    'linear_get_issue',
    {
      description:
        'Fetch a Linear issue by identifier (e.g. "MA-3060") or UUID. Returns sanitized Markdown. Read-only — no mutations.',
      inputSchema: {
        issueId: z.string().describe('Issue identifier (e.g. "MA-3060") or UUID'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ issueId }) => {
      try {
        const raw = await client.getIssue(issueId);
        const sanitized = sanitize(raw);
        const markdown = formatIssueToMarkdown(sanitized);
        return { content: [{ type: 'text' as const, text: markdown }] };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text' as const, text: message }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
