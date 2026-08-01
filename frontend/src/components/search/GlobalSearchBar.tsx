"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Folder, User, FileText, CornerDownLeft, HelpCircle, Loader2 } from "lucide-react";
import { Input } from "@gitforge/ui";

export default function GlobalSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Search Results States
  const [repos, setRepos] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Qualifier Help Dialog
  const [showHelp, setShowHelp] = useState(false);

  // Debounced query preview fetch
  useEffect(() => {
    if (query.trim().length < 2) {
      setRepos([]);
      setUsers([]);
      setIssues([]);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers = { Authorization: token ? `Bearer ${token}` : "" };

        // Parallel previews fetch
        const [repoRes, userRes, issueRes] = await Promise.all([
          fetch(`/api/v1/search/repositories?q=${encodeURIComponent(query)}`, { headers }),
          fetch(`/api/v1/search/users?q=${encodeURIComponent(query)}`, { headers }),
          fetch(`/api/v1/search/issues?q=${encodeURIComponent(query)}`, { headers })
        ]);

        if (repoRes.ok) {
          const data = await repoRes.json();
          setRepos(data.slice(0, 3)); // top 3
        }
        if (userRes.ok) {
          const data = await userRes.json();
          setUsers(data.slice(0, 3));
        }
        if (issueRes.ok) {
          const data = await issueRes.json();
          setIssues(data.slice(0, 3));
        }
      } catch (err) {
        console.warn("Global Search preview fetch error", err);
      } finally {
        setIsLoading(false);
        setFocusedIndex(-1);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside handler
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setShowHelp(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Flat list of items for keyboard navigation
  const flatItems: Array<{ type: "repo" | "user" | "issue"; label: string; url: string }> = [];
  
  repos.forEach(r => {
    const owner = r.organization ? r.organization.slug : r.owner?.username;
    flatItems.push({
      type: "repo",
      label: `${owner}/${r.name}`,
      url: `/${owner}/${r.name}`
    });
  });

  users.forEach(u => {
    flatItems.push({
      type: "user",
      label: `@${u.username} (${u.name || "User"})`,
      url: `/${u.username}`
    });
  });

  issues.forEach(i => {
    const owner = i.repository.organization ? i.repository.organization.slug : i.repository.owner?.username;
    flatItems.push({
      type: "issue",
      label: `#${i.number} ${i.title} (${owner}/${i.repository.name})`,
      url: `/${owner}/${i.repository.name}/issues/${i.number}`
    });
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown") {
        setShowDropdown(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => Math.min(prev + 1, flatItems.length)); // +1 to include "See all results"
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex === -1 || focusedIndex === flatItems.length) {
        // Go to search results page
        router.push(`/search?q=${encodeURIComponent(query)}`);
        setShowDropdown(false);
      } else {
        // Go to item page
        router.push(flatItems[focusedIndex].url);
        setShowDropdown(false);
      }
    }
  };

  return (
    <div className="relative w-full max-w-[480px]" ref={containerRef}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Input
          type="text"
          placeholder="Search GitForge (type / for help)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          suppressHydrationWarning={true}
          className="pl-lg pr-[70px] bg-canvas-soft border-border text-text-primary text-xs h-[36px] focus-visible:outline focus-visible:outline-accent"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-md pointer-events-none text-text-muted">
          <Search className="w-4 h-4" />
        </div>

        {/* Action icons inside input */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-xs gap-xs">
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" />}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="p-xxs rounded-xs hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary transition-colors"
            title="Search Qualifier Syntax Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Qualifiers Help Box */}
      {showHelp && (
        <div className="absolute left-0 right-0 mt-xs p-md bg-surface border border-border shadow-xl rounded-sm z-50 font-inter text-xs text-text-primary flex flex-col gap-sm">
          <div className="font-space-grotesk font-bold text-text-primary border-b border-hairline pb-xs">
            Search Qualifiers Help
          </div>
          <p className="text-text-muted">
            You can filter results using structured search prefixes:
          </p>
          <div className="grid grid-cols-2 gap-xs font-mono text-[10px] text-text-primary bg-canvas-soft p-xs rounded-sm">
            <div>language:typescript</div>
            <div className="text-text-muted">Filter by language</div>
            <div>stars:&gt;100</div>
            <div className="text-text-muted">Filter by star count</div>
            <div>is:open / is:closed</div>
            <div className="text-text-muted">Filter issues state</div>
            <div>org:acme</div>
            <div className="text-text-muted">Scope to organization</div>
            <div>user:appi</div>
            <div className="text-text-muted">Scope to user</div>
            <div>repo:my-repo</div>
            <div className="text-text-muted">Scope to repository name</div>
          </div>
        </div>
      )}

      {/* Search Preview Dropdown */}
      {showDropdown && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-xs bg-surface border border-border shadow-xl rounded-sm z-50 overflow-hidden">
          <div className="max-h-[360px] overflow-y-auto divide-y divide-hairline">
            {/* Repos Category */}
            {repos.length > 0 && (
              <div className="p-xs">
                <div className="font-space-grotesk font-bold text-[10px] uppercase tracking-wider text-text-muted px-xs py-xxs">
                  Repositories
                </div>
                {repos.map((r, i) => {
                  const itemIndex = i;
                  const isFocused = focusedIndex === itemIndex;
                  const owner = r.organization ? r.organization.slug : r.owner?.username;
                  return (
                    <Link
                      key={r.id}
                      href={`/${owner}/${r.name}`}
                      className={`flex items-center gap-xs p-xs rounded-xs font-inter text-xs transition-colors ${
                        isFocused ? "bg-accent-soft text-accent" : "text-text-primary hover:bg-canvas-soft-2"
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <Folder className="w-4 h-4 shrink-0 text-text-muted" />
                      <span className="truncate">{owner}/{r.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Users Category */}
            {users.length > 0 && (
              <div className="p-xs">
                <div className="font-space-grotesk font-bold text-[10px] uppercase tracking-wider text-text-muted px-xs py-xxs">
                  Users
                </div>
                {users.map((u, i) => {
                  const itemIndex = repos.length + i;
                  const isFocused = focusedIndex === itemIndex;
                  return (
                    <Link
                      key={u.id}
                      href={`/${u.username}`}
                      className={`flex items-center gap-xs p-xs rounded-xs font-inter text-xs transition-colors ${
                        isFocused ? "bg-accent-soft text-accent" : "text-text-primary hover:bg-canvas-soft-2"
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <User className="w-4 h-4 shrink-0 text-text-muted" />
                      <span className="truncate">@{u.username} ({u.name || "User"})</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Issues Category */}
            {issues.length > 0 && (
              <div className="p-xs">
                <div className="font-space-grotesk font-bold text-[10px] uppercase tracking-wider text-text-muted px-xs py-xxs">
                  Issues & PRs
                </div>
                {issues.map((issue, i) => {
                  const itemIndex = repos.length + users.length + i;
                  const isFocused = focusedIndex === itemIndex;
                  const owner = issue.repository.organization ? issue.repository.organization.slug : issue.repository.owner?.username;
                  return (
                    <Link
                      key={issue.id}
                      href={`/${owner}/${issue.repository.name}/issues/${issue.number}`}
                      className={`flex items-center gap-xs p-xs rounded-xs font-inter text-xs transition-colors ${
                        isFocused ? "bg-accent-soft text-accent" : "text-text-primary hover:bg-canvas-soft-2"
                      }`}
                      onClick={() => setShowDropdown(false)}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-text-muted" />
                      <span className="truncate">
                        #{issue.number} {issue.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {flatItems.length === 0 && !isLoading && (
              <div className="p-md text-center text-text-muted font-inter text-xs">
                No preview results for "{query}"
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="bg-canvas-soft p-xs flex justify-between items-center text-[11px] font-inter text-text-muted border-t border-hairline">
            <span>Arrow keys to navigate, Enter to select</span>
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className={`flex items-center gap-xxs px-xs py-[2px] rounded-xs font-semibold ${
                focusedIndex === flatItems.length ? "bg-accent text-white" : "hover:text-accent hover:underline"
              }`}
              onClick={() => setShowDropdown(false)}
            >
              See all results
              <CornerDownLeft className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
