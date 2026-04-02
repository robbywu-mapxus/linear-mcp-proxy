export interface FetchedComment {
  body: string;
  createdAt: string;
  authorName: string | null;
}

export interface FetchedIssue {
  identifier: string;
  title: string;
  description: string | null;
  stateName: string | null;
  priority: number;
  labels: string[];
  comments: FetchedComment[];
}

export interface SanitizedComment {
  body: string;
  createdAt: string;
  authorName: string;
}

export interface SanitizedIssue {
  identifier: string;
  title: string;
  description: string | null;
  stateName: string | null;
  priority: number;
  labels: string[];
  comments: SanitizedComment[];
}
