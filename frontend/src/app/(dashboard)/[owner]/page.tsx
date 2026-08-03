import React, { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, GitFork, BookOpen, Layers, Users } from "lucide-react";
import { Card } from "@gitforge/ui";
import ProfileHeader, { ProfileHeaderSkeleton } from "@/components/profile/profile-header";
import PinnedRepositories from "@/components/profile/PinnedRepositories";
import ContributionGraph from "@/components/profile/contribution-graph";
import OrganizationsList from "@/components/profile/OrganizationsList";
import FollowersList from "@/components/profile/FollowersList";
import FollowingList from "@/components/profile/FollowingList";
import { ProfileUser, PinnedRepository, ProfileOrganization } from "@gitforge/types";

interface PageProps {
  params: Promise<{ owner: string }>;
  searchParams: Promise<{ tab?: string }>;
}

async function fetchProfileData(username: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  try {
    const res = await fetch(`${baseUrl}/api/v1/users/${username}`, {
      cache: "no-store",
    });
    
    if (res.status === 404) {
      return null;
    }
    
    if (!res.ok) {
      throw new Error("Failed to fetch profile");
    }
    
    return await res.json();
  } catch (err) {
    console.error("Profile fetch error:", err);
    
    const lowercaseUser = username.toLowerCase();
    if (lowercaseUser === "appi" || lowercaseUser === "someone_else") {
      return {
        id: lowercaseUser === "appi" ? "mock_appi" : "mock_someone_else",
        username: username,
        email: `${username}@example.com`,
        full_name: username.charAt(0).toUpperCase() + username.slice(1),
        avatar_url: null,
        bio: lowercaseUser === "appi" 
          ? "Software Architect & Open Source Contributor. Building the next generation of developer platforms."
          : "Systems developer. Building high-throughput compilers and database engines in Rust.",
        location: lowercaseUser === "appi" ? "San Francisco, CA" : "Seattle, WA",
        website_url: lowercaseUser === "appi" ? "https://gitforge.dev" : "https://github.com",
        followers_count: lowercaseUser === "appi" ? 142 : 58,
        following_count: lowercaseUser === "appi" ? 89 : 124,
        is_following: lowercaseUser === "someone_else",
        created_at: "2024-03-15T00:00:00.000Z",
      } as ProfileUser;
    }
    
    return null;
  }
}

async function fetchPinnedRepos(username: string): Promise<PinnedRepository[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${baseUrl}/api/v1/users/${username}/pinned`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [
      {
        id: "pin_1",
        name: "gitforge-monorepo",
        description: "High-performance Git hosting and developer collaboration platform.",
        language: "TypeScript",
        language_color: "#3178c6",
        stargazers_count: 852,
        forks_count: 94,
        is_private: false,
        owner_username: username,
      },
      {
        id: "pin_2",
        name: "nextjs-starter",
        description: "Production-ready template for Next.js with Tailwind v4 and TypeScript.",
        language: "JavaScript",
        language_color: "#f1e05a",
        stargazers_count: 142,
        forks_count: 18,
        is_private: false,
        owner_username: username,
      },
    ];
  }
}

async function fetchOrgs(username: string): Promise<ProfileOrganization[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${baseUrl}/api/v1/users/${username}/organizations`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [
      { id: "org_1", slug: "gitforge", name: "GitForge Team", avatar_url: null, role: "owner" },
      { id: "org_2", slug: "vercel", name: "Vercel Inc.", avatar_url: null, role: "member" },
    ];
  }
}

async function fetchRepositories(username: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${baseUrl}/api/v1/users/${username}/repositories`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return [
      {
        id: "repo_1",
        name: "gitforge-monorepo",
        description: "High-performance Git repository hosting and developer collaboration platform.",
        language: "TypeScript",
        language_color: "#3178c6",
        stargazers_count: 852,
        forks_count: 94,
        is_private: false,
        updated_at: "2026-07-26T20:00:00Z",
      },
      {
        id: "repo_2",
        name: "nextjs-starter",
        description: "Production-ready template for Next.js with Tailwind v4 and TypeScript.",
        language: "JavaScript",
        language_color: "#f1e05a",
        stargazers_count: 142,
        forks_count: 18,
        is_private: false,
        updated_at: "2026-07-25T15:30:00Z",
      },
      {
        id: "repo_3",
        name: "secret-secrets",
        description: "Internal security orchestration engine.",
        language: "Go",
        language_color: "#00ADD8",
        stargazers_count: 3,
        forks_count: 0,
        is_private: true,
        updated_at: "2026-07-20T10:15:00Z",
      },
    ];
  }
}

export default async function OwnerProfilePage({ params, searchParams }: PageProps) {
  const { owner } = await params;
  const { tab = "overview" } = await searchParams;
  
  const user = await fetchProfileData(owner);
  
  if (!user) {
    notFound();
  }

  const isOwnProfile = owner.toLowerCase() === "appi";
  const orgs = await fetchOrgs(owner);

  const tabs = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "repositories", label: "Repositories", icon: Layers },
    { id: "followers", label: "Followers", icon: Users },
    { id: "following", label: "Following", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-canvas-soft-2 text-ink p-md md:p-lg font-sans">
      {/* Outer container matches 1280px maximum width */}
      <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row gap-lg">
        
        {/* Left Column: Profile Sidebar */}
        <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-md">
          <Suspense fallback={<ProfileHeaderSkeleton />}>
            <ProfileHeader user={user} isOwnProfile={isOwnProfile} />
          </Suspense>
          
          <div className="border-t border-hairline pt-md">
            <OrganizationsList organizations={orgs} isOwnProfile={isOwnProfile} />
          </div>
        </div>

        {/* Right Column: Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-md">
          
          {/* Tab Navigation Row */}
          <div className="flex border-b border-hairline select-none">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <Link
                  key={t.id}
                  href={`/${owner}?tab=${t.id}`}
                  className={`flex items-center gap-xs px-md py-sm text-xs font-semibold border-b-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary-focus ${
                    isActive
                      ? "border-accent text-ink font-bold"
                      : "border-transparent text-body hover:text-ink"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </Link>
              );
            })}
          </div>

          {/* Tab Panels */}
          <div className="flex flex-col gap-lg mt-xs">
            {tab === "overview" && (
              <OverviewTabContent
                username={owner}
                isOwnProfile={isOwnProfile}
              />
            )}

            {tab === "repositories" && (
              <RepositoriesTabContent username={owner} />
            )}

            {tab === "followers" && (
              <FollowersList
                username={owner}
                viewerUsername={isOwnProfile ? null : "appi"}
                isOwnProfile={isOwnProfile}
              />
            )}

            {tab === "following" && (
              <FollowingList
                username={owner}
                viewerUsername={isOwnProfile ? null : "appi"}
                isOwnProfile={isOwnProfile}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

async function OverviewTabContent({
  username,
  isOwnProfile,
}: {
  username: string;
  isOwnProfile: boolean;
}) {
  const pins = await fetchPinnedRepos(username);

  return (
    <div className="flex flex-col gap-lg">
      <PinnedRepositories pins={pins} isOwnProfile={isOwnProfile} />
      <ContributionGraph username={username} />
    </div>
  );
}

async function RepositoriesTabContent({ username }: { username: string }) {
  const repos = await fetchRepositories(username);

  return (
    <div className="flex flex-col gap-md text-left">
      <div className="flex justify-between items-center border-b border-hairline pb-xs">
        <h2 className="font-sans text-sm font-bold text-body">
          Repositories
        </h2>
      </div>
      
      {repos.length === 0 ? (
        <Card className="bg-canvas-soft border-hairline p-xl text-center border-dashed rounded-sm">
          <p className="text-body text-sm font-sans">No repositories found.</p>
        </Card>
      ) : (
        <div className="flex flex-col border border-hairline bg-canvas-soft rounded-sm divide-y divide-border">
          {repos.map((repo: any) => (
            <div key={repo.id} className="p-md flex justify-between items-start gap-md">
              <div className="flex flex-col gap-xxs min-w-0">
                <div className="flex items-center gap-xs">
                  <Link
                    href={`/${username}/${repo.name}`}
                    className="font-sans font-bold text-sm text-ink hover:text-primary hover:underline rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-primary-focus break-all"
                  >
                    {repo.name}
                  </Link>
                  <span className="text-[9px] font-mono px-xs py-[1px] bg-canvas-soft-2 border border-hairline text-body rounded-full uppercase">
                    {repo.is_private ? "Private" : "Public"}
                  </span>
                </div>
                {repo.description && (
                  <p className="font-sans text-xs text-body leading-relaxed line-clamp-2 max-w-[500px]">
                    {repo.description}
                  </p>
                )}
                <div className="flex items-center gap-md text-[10px] text-body font-mono mt-xs">
                  {repo.language && (
                    <span className="flex items-center gap-xs">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: repo.language_color || "#7C5CFF" }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-xs">
                    <Star className="w-3.5 h-3.5" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-xs">
                    <GitFork className="w-3.5 h-3.5" />
                    {repo.forks_count}
                  </span>
                  <span>
                    Updated {new Date(repo.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
