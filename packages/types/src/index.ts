export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  createdAt: Date;
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  body?: string;
  status: "OPEN" | "CLOSED";
  creatorId: string;
  repositoryId: string;
  createdAt: Date;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  body?: string;
  status: "DRAFT" | "OPEN" | "MERGED" | "CLOSED";
  baseBranch: string;
  compareBranch: string;
  creatorId: string;
  repositoryId: string;
  createdAt: Date;
}
