export type RepositoryVisibility = "public" | "private";

export interface RepositoryTopic {
  id: string;
  name: string;
}

export interface Collaborator {
  id: string;
  username: string;
  avatar_url?: string | null;
  role: "read" | "triage" | "write" | "maintain" | "admin";
}

export interface Repository {
  id: string;
  name: string;
  description: string | null;
  visibility: RepositoryVisibility;
  owner_username: string;
  is_fork: boolean;
  parent_owner_username: string | null;
  parent_repo_name: string | null;
  stargazers_count: number;
  forks_count: number;
  is_archived: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  topics?: string[];
  license?: string | null;
}
