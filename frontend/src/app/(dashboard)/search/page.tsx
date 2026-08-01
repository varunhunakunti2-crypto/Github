"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Folder, User, Building, FileText, Code, GitPullRequest, Search, HelpCircle, Loader2 } from "lucide-react";
import { Card, Button, Input } from "@gitforge/ui";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get("q") || "";
  const activeTab = searchParams.get("type") || "repositories";

  const [inputVal, setInputVal] = useState(query);
  const [results, setResults] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    repositories: 0,
    users: 0,
    organizations: 0,
    code: 0,
    issues: 0,
    pulls: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Update input text if URL query updates
  useEffect(() => {
    setInputVal(query);
  }, [query]);

  // Fetch results and preview counts in parallel
  const fetchResults = async () => {
    if (!query) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      // 1. Fetch current tab results
      const endpointMap: Record<string, string> = {
        repositories: "repositories",
        users: "users",
        organizations: "organizations",
        code: "code",
        issues: "issues",
        pulls: "pulls"
      };

      const endpoint = endpointMap[activeTab] || "repositories";
      const res = await fetch(`/api/v1/search/${endpoint}?q=${encodeURIComponent(query)}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to retrieve search results.");
      }
      const data = await res.json();
      setResults(data);

      // 2. Fetch all counts in parallel for tab badges
      const countsPromise = ["repositories", "users", "organizations", "code", "issues", "pulls"].map(async (type) => {
        try {
          const cRes = await fetch(`/api/v1/search/${type}?q=${encodeURIComponent(query)}`, { headers });
          if (cRes.ok) {
            const cData = await cRes.json();
            return { type, count: cData.length };
          }
        } catch (e) {
          console.warn(`Failed to fetch count for ${type}`, e);
        }
        return { type, count: 0 };
      });

      const countsResults = await Promise.all(countsPromise);
      const newCounts: Record<string, number> = {};
      countsResults.forEach(item => {
        newCounts[item.type] = item.count;
      });
      setCounts(newCounts);

    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [query, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    router.push(`/search?q=${encodeURIComponent(inputVal)}&type=${activeTab}`);
  };

  const handleTabChange = (tab: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}&type=${tab}`);
  };

  // Highlights searchTerm occurrences in content
  const renderHighlighted = (text: string, term: string) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === term.toLowerCase() ? (
            <mark key={index} className="bg-warning/35 text-text-primary px-[2px] rounded-xs font-semibold">{part}</mark>
          ) : part
        )}
      </>
    );
  };

  const hasQualifiers = query.includes(":") || query.includes(">") || query.includes("<");

  return (
    <div className="max-w-[1200px] mx-auto py-2xl px-lg flex flex-col gap-lg min-h-screen">
      {/* Page Header & Search Bar */}
      <div className="flex flex-col gap-md">
        <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-text-primary">
          Search Results
        </h1>

        <form onSubmit={handleSearchSubmit} className="relative flex gap-sm items-center max-w-[640px] w-full">
          <div className="relative flex-1">
            <Input
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="e.g. react language:typescript stars:>500"
              className="pl-lg"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>
      </div>

      {/* Tabs navigation bar */}
      <div className="border-b border-border bg-canvas overflow-x-auto scrollbar-none flex">
        <nav className="flex gap-xxs" aria-label="Search tabs">
          {[
            { id: "repositories", label: "Repositories", icon: Folder },
            { id: "code", label: "Code", icon: Code },
            { id: "issues", label: "Issues", icon: FileText },
            { id: "pulls", label: "Pull Requests", icon: GitPullRequest },
            { id: "users", label: "Users", icon: User },
            { id: "organizations", label: "Organizations", icon: Building }
          ].map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.id] || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`font-sans text-xs font-semibold px-md h-[40px] flex items-center justify-center border-b-2 gap-xs whitespace-nowrap transition-all ${
                  isActive
                    ? "border-accent text-accent font-bold"
                    : "border-transparent text-text-muted hover:text-text-primary hover:border-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="px-xs py-[2px] bg-canvas-soft border border-hairline text-[10px] text-text-muted rounded-full font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Results Container */}
      <div className="flex-1 flex flex-col gap-md">
        {isLoading ? (
          <div className="py-4xl text-center flex flex-col items-center gap-xs text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <span>Searching GitForge...</span>
          </div>
        ) : error ? (
          <div className="p-xl bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
            {error}
          </div>
        ) : results.length === 0 ? (
          /* Empty state */
          <Card className="bg-surface border-border p-3xl rounded-sm text-center flex flex-col items-center justify-center border-dashed min-h-[260px]">
            <Search className="w-8 h-8 text-text-muted mb-sm" />
            <h3 className="font-space-grotesk text-md font-semibold mb-xs text-text-primary">
              No results found
            </h3>
            <p className="font-inter text-text-muted text-xs max-w-[380px] mb-md leading-relaxed">
              We couldn't find any matches for "{query}". 
              {hasQualifiers ? " Try removing filter qualifiers like language: or stars: to broaden your search." : " Try checking your spelling or using more general terms."}
            </p>
          </Card>
        ) : (
          /* List rendering per active tab */
          <div className="flex flex-col gap-sm">
            {/* Repositories Tab */}
            {activeTab === "repositories" &&
              results.map((r) => {
                const owner = r.organization ? r.organization.slug : r.owner?.username;
                return (
                  <Card key={r.id} className="bg-surface border-border p-md rounded-sm hover:border-accent/40 transition-colors">
                    <div className="flex justify-between items-start gap-md">
                      <div>
                        <Link href={`/${owner}/${r.name}`} className="font-space-grotesk font-bold text-sm text-accent hover:underline">
                          {owner}/{r.name}
                        </Link>
                        {r.description && <p className="font-inter text-text-muted text-xs mt-xs leading-relaxed">{r.description}</p>}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted px-xs py-[2px] bg-canvas border border-hairline rounded-full uppercase">
                        {r.isPrivate ? "Private" : "Public"}
                      </span>
                    </div>
                  </Card>
                );
              })}

            {/* Code Tab */}
            {activeTab === "code" &&
              results.map((file) => (
                <Card key={file.id} className="bg-surface border-border p-md rounded-sm flex flex-col gap-xs font-inter">
                  <div className="flex justify-between items-center text-xs border-b border-hairline pb-xs">
                    <div className="flex items-center gap-xxs">
                      <Link href={`/${file.repository.ownerSlug}/${file.repository.name}`} className="font-space-grotesk font-bold text-accent hover:underline">
                        {file.repository.ownerSlug}/{file.repository.name}
                      </Link>
                      <span className="text-text-muted">/</span>
                      <Link href={`/${file.repository.ownerSlug}/${file.repository.name}/blob/main/${file.filePath}`} className="font-mono text-text-primary hover:text-accent hover:underline">
                        {file.filePath}
                      </Link>
                    </div>
                  </div>
                  <pre className="p-xs bg-canvas-soft border border-hairline rounded-xs font-mono text-[11px] overflow-x-auto leading-relaxed text-text-primary whitespace-pre-wrap">
                    <code>
                      {/* Show line numbers alongside matching block */}
                      {file.excerpt.split("\n").map((line: string, i: number) => (
                        <div key={i} className="flex gap-md">
                          <span className="text-text-muted select-none w-8 text-right pr-xs border-r border-hairline">
                            {file.startLine + i}
                          </span>
                          <span className="flex-1">
                            {renderHighlighted(line, query)}
                          </span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </Card>
              ))}

            {/* Issues and Pull Requests Tab */}
            {(activeTab === "issues" || activeTab === "pulls") &&
              results.map((issue) => {
                const owner = issue.repository.organization ? issue.repository.organization.slug : issue.repository.owner?.username;
                return (
                  <Card key={issue.id} className="bg-surface border-border p-md rounded-sm hover:border-accent/40 transition-colors">
                    <div className="flex justify-between items-start gap-md">
                      <div>
                        <div className="flex items-center gap-xs">
                          <Link href={`/${owner}/${issue.repository.name}/issues/${issue.number}`} className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent">
                            {issue.title}
                          </Link>
                          <span className={`text-[10px] font-mono px-xs py-[2px] rounded-full uppercase border ${
                            issue.status === "OPEN" ? "border-success/35 bg-success/5 text-success" : "border-danger/35 bg-danger/5 text-danger"
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                        <p className="font-inter text-text-muted text-xs mt-xs">
                          #{issue.number} opened in{" "}
                          <Link href={`/${owner}/${issue.repository.name}`} className="font-semibold text-text-muted hover:text-accent">
                            {owner}/{issue.repository.name}
                          </Link>{" "}
                          by @{issue.creator.username}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}

            {/* Users Tab */}
            {activeTab === "users" &&
              results.map((u) => (
                <Card key={u.id} className="bg-surface border-border p-md rounded-sm hover:border-accent/40 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold font-space-grotesk text-sm border border-hairline">
                      {u.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <Link href={`/${u.username}`} className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent">
                        {u.name || u.username}
                      </Link>
                      <span className="font-mono text-xs text-text-muted">@{u.username}</span>
                    </div>
                  </div>
                  <Link href={`/${u.username}`}>
                    <Button variant="secondary-sm">View Profile</Button>
                  </Link>
                </Card>
              ))}

            {/* Organizations Tab */}
            {activeTab === "organizations" &&
              results.map((org) => (
                <Card key={org.id} className="bg-surface border-border p-md rounded-sm hover:border-accent/40 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-md">
                    <div className="w-10 h-10 rounded-sm bg-accent-soft text-accent flex items-center justify-center font-bold border border-hairline">
                      <Building className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                      <Link href={`/orgs/${org.slug}`} className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent">
                        {org.name}
                      </Link>
                      <span className="font-mono text-xs text-text-muted">gitforge.dev/orgs/{org.slug}</span>
                    </div>
                  </div>
                  <Link href={`/orgs/${org.slug}`}>
                    <Button variant="secondary-sm">View Organization</Button>
                  </Link>
                </Card>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
