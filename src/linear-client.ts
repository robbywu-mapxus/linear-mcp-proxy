import { LinearClient } from '@linear/sdk';
import type { Issue, Comment } from '@linear/sdk';

import type { FetchedIssue, FetchedComment } from './types.js';

const ISSUE_IDENTIFIER_RE = /^[A-Z]+-\d+$/;

export class LinearReadOnlyClient {
  private readonly client: LinearClient;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.LINEAR_API_KEY;
    if (!key) {
      throw new Error(
        'LINEAR_API_KEY is not set. Please set it as an environment variable.\n' +
          'Generate one at: https://linear.app/settings/api',
      );
    }
    this.client = new LinearClient({ apiKey: key });
  }

  async getIssue(issueId: string): Promise<FetchedIssue> {
    if (ISSUE_IDENTIFIER_RE.test(issueId)) {
      return this.fetchByIdentifier(issueId);
    }
    return this.fetchById(issueId);
  }

  private async fetchById(id: string): Promise<FetchedIssue> {
    const issue = await this.client.issue(id);
    if (!issue?.id) {
      throw new Error(`Issue not found: ${id}`);
    }
    return this.mapIssueToDomain(issue);
  }

  private async fetchByIdentifier(identifier: string): Promise<FetchedIssue> {
    const lastDash = identifier.lastIndexOf('-');
    const teamKey = identifier.slice(0, lastDash);
    const number = Number(identifier.slice(lastDash + 1));

    const result = await this.client.issues({
      filter: {
        team: { key: { eq: teamKey } },
        number: { eq: number },
      },
      first: 1,
    });

    if (result.nodes.length === 0) {
      throw new Error(`Issue not found: ${identifier}`);
    }
    return this.mapIssueToDomain(result.nodes[0]);
  }

  private async mapIssueToDomain(issue: Issue): Promise<FetchedIssue> {
    const [state, labelsConnection, commentsConnection] = await Promise.all([
      issue.state,
      issue.labels({ first: 50 }),
      issue.comments({ first: 50 }),
    ]);

    const comments = await this.mapComments(commentsConnection.nodes);

    return {
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description ?? null,
      stateName: state?.name ?? null,
      priority: issue.priority,
      labels: labelsConnection.nodes.map((l) => l.name),
      comments,
    };
  }

  private async mapComments(nodes: Comment[]): Promise<FetchedComment[]> {
    return Promise.all(
      nodes.map(async (comment) => {
        const user = await comment.user;
        return {
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          authorName: user?.displayName ?? null,
        };
      }),
    );
  }
}
