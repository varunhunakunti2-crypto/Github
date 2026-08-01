"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Lock, Globe, Star, GitFork, Plus, Loader2 } from "lucide-react";
import { Card, Button } from "@gitforge/ui";
import OrgHeader from "@/components/org/OrgHeader";

export default function OrgDashboardPage() {
  const params = useParams();
  const orgSlug = params.org as string;

  const [org, setOrg] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const headers = {
        Authorization: token ? `Bearer ${token}` : "",
      };

      // 1. Fetch organization details
      const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`, { headers });
      if (!orgRes.ok) {
        throw new Error("Failed to load organization details.");
      }
      const orgData = await orgRes.json();
      setOrg(orgData);

      // 2. Fetch organization repositories
      const reposRes = await fetch(`/api/v1/organizations/${orgSlug}/repositories`, { headers });
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setRepos(reposData);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) {
      fetchData();
    }
  }, [orgSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-xs font-sans text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span>Loading organization...</span>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen bg-canvas p-3xl">
        <div className="max-w-[600px] mx-auto text-center flex flex-col gap-sm items-center">
          <h2 className="font-space-grotesk text-2xl font-bold text-danger">Error</h2>
          <p className="font-inter text-text-muted text-sm">{error || "Organization not found"}</p>
          <Button variant="secondary" onClick={fetchData}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = org.myRole === "OWNER";

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      <OrgHeader
        org={org}
        activeTab="overview"
        repoCount={repos.length}
        memberCount={org.members?.length || 0}
        onOrgUpdate={(updated) => setOrg(updated)}
      />

      <main className="max-w-[1200px] w-full mx-auto py-xl px-lg flex-1 flex flex-col gap-lg">
        {/* Actions bar */}
        <div className="flex justify-between items-center">
          <h2 className="font-space-grotesk text-lg font-bold text-text-primary">
            Repositories
          </h2>
          {isOwner && (
            <Link href={`/new?owner=${org.slug}`}>
              <Button variant="primary-sm" className="flex items-center gap-xxs font-semibold">
                <Plus className="w-4 h-4" />
                New Repository
              </Button>
            </Link>
          )}
        </div>

        {/* Repositories grid */}
        {repos.length === 0 ? (
          <Card className="bg-surface border-border p-3xl rounded-sm text-center flex flex-col items-center justify-center border-dashed min-h-[220px]">
            <BuildingIcon className="w-8 h-8 text-text-muted mb-sm" />
            <h3 className="font-space-grotesk text-md font-semibold mb-xs text-text-primary">
              No repositories yet
            </h3>
            <p className="font-inter text-text-muted text-xs max-w-[340px] mb-md leading-relaxed">
              This organization doesn't have any repositories. Repositories created inside this organization will show up here.
            </p>
            {isOwner && (
              <Link href={`/new?owner=${org.slug}`}>
                <Button variant="primary-sm">
                  Create a repository
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {repos.map((repo) => (
              <Card
                key={repo.id}
                className="bg-canvas border-border p-md rounded-sm flex flex-col justify-between hover:border-accent/40 transition-all group"
              >
                <div className="flex flex-col gap-xs">
                  <div className="flex items-center justify-between gap-sm">
                    <Link
                      href={`/${org.slug}/${repo.name}`}
                      className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent hover:underline break-all"
                    >
                      {repo.name}
                    </Link>
                    <span className="flex items-center gap-xxs px-xs py-[2px] bg-canvas-soft border border-hairline text-[10px] text-text-muted rounded-full font-mono uppercase">
                      {repo.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      {repo.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>

                  {repo.description && (
                    <p className="font-inter text-text-muted text-xs leading-relaxed line-clamp-2 min-h-[36px]">
                      {repo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-md pt-xs border-t border-hairline font-mono text-[11px] text-text-muted">
                  <div className="flex items-center gap-md">
                    <span className="flex items-center gap-xs">
                      <Star className="w-3.5 h-3.5" />
                      {repo.star_count || 0}
                    </span>
                    <span className="flex items-center gap-xs">
                      <GitFork className="w-3.5 h-3.5" />
                      {repo.watch_count || 0}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Simple placeholder building icon
function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="9" y2="16" />
      <line x1="15" y1="22" x2="15" y2="16" />
      <line x1="9" y1="16" x2="15" y2="16" />
      <path d="M9 6h.01" />
      <path d="M15 6h.01" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
    </svg>
  );
}
