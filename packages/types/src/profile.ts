export interface ProfileUser {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  website_url?: string | null;
  followers_count: number;
  following_count: number;
  is_following?: boolean;
  created_at: string | Date;
}

export interface PinnedRepository {
  id: string;
  name: string;
  description?: string | null;
  language?: string | null;
  language_color?: string | null;
  stargazers_count: number;
  forks_count: number;
  is_private: boolean;
  owner_username: string;
}

export interface FollowerUser {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_following?: boolean;
}

export interface ContributionDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface ContributionGraphData {
  total_contributions: number;
  days: ContributionDay[];
}

export interface ProfileOrganization {
  id: string;
  slug: string;
  name: string;
  avatar_url?: string | null;
  role?: string | null;
}
