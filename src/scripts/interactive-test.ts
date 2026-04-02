#!/usr/bin/env tsx

/**
 * Interactive test script for manual verification.
 *
 * Usage:
 *   npm run test:interactive <issueId>
 *
 * Example:
 *   npm run test:interactive MA-3060
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { LinearReadOnlyClient } from '../linear-client.js';
import { sanitize } from '../sanitizer.js';
import { formatIssueToMarkdown } from '../formatter.js';

// ── Load .env file if present (dev convenience) ──
function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Only set if not already defined (env var overrides .env)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function run(): Promise<void> {
  loadDotEnv();

  const issueId = process.argv[2];
  if (!issueId) {
    console.error('Usage: npm run test:interactive <issueId>');
    console.error('Example: npm run test:interactive MA-3060');
    process.exit(1);
  }

  console.log(`\n⏳ Fetching Linear issue: ${issueId}\n`);

  try {
    const client = new LinearReadOnlyClient();
    const fetched = await client.getIssue(issueId);
    const sanitized = sanitize(fetched);
    const markdown = formatIssueToMarkdown(sanitized);

    console.log('─'.repeat(60));
    console.log(markdown);
    console.log('─'.repeat(60));
    console.log(`\n✅ Done. Comments: ${fetched.comments.length}\n`);
  } catch (err) {
    console.error('\n❌ Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

run();
