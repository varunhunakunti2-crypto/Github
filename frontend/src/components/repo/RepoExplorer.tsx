"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Folder, 
  File, 
  GitBranch, 
  Copy, 
  Check, 
  Terminal,
  Code
} from "lucide-react";
import { Button, Card } from "@gitforge/ui";

export interface RepoItem {
  name: string;
  type: "tree" | "blob"; // 'tree' = directory, 'blob' = file
  path: string;
  size?: number;
  lastCommit?: {
    message: string;
    author: string;
    date: string;
  };
}

interface RepoExplorerProps {
  items: RepoItem[];
  currentPath: string;
  owner: string;
  repoName: string;
  branch?: string;
  branches?: string[];
  onBranchChange?: (branch: string) => void;
  cloneUrlHttps?: string;
  cloneUrlSsh?: string;
}

export default function RepoExplorer({
  items,
  currentPath,
  owner,
  repoName,
  branch = "main",
  branches = ["main", "dev"],
  onBranchChange,
  cloneUrlHttps = `http://localhost:3000/git/${owner}/${repoName}.git`,
  cloneUrlSsh = `git@localhost:${owner}/${repoName}.git`,
}: RepoExplorerProps) {
  const [activeCloneTab, setActiveCloneTab] = useState<"https" | "ssh">("https");
  const [copied, setCopied] = useState(false);
  const [showCloneDropdown, setShowCloneDropdown] = useState(false);

  const copyCloneUrl = () => {
    const url = activeCloneTab === "https" ? cloneUrlHttps : cloneUrlSsh;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split path into breadcrumbs
  const pathParts = currentPath ? currentPath.split("/") : [];

  // Find a commit to display in the main commit bar
  const latestCommit = items.find((i) => i.lastCommit)?.lastCommit || {
    message: "Initial commit",
    author: owner,
    date: new Date().toISOString(),
  };

  return (
    <div className="flex flex-col gap-md text-left text-text-primary font-inter w-full">
      
      {/* Branch Select, Path Nav & Clone Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-border pb-md">
        
        {/* Branch Selector & Breadcrumbs */}
        <div className="flex flex-wrap items-center gap-xs text-sm font-semibold select-none">
          {/* Branch Dropdown */}
          <div className="relative">
            <select
              value={branch}
              onChange={(e) => onBranchChange?.(e.target.value)}
              className="appearance-none pl-sm pr-lg py-[5px] bg-base border border-border rounded-sm text-xs font-semibold font-space-grotesk text-text-primary cursor-pointer hover:bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <GitBranch className="w-3.5 h-3.5 absolute right-xs top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
          </div>

          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-xxs font-space-grotesk text-xs">
            <Link
              href={`/${owner}/${repoName}`}
              className="text-accent hover:underline rounded-xs outline-none focus-visible:ring-1 focus-visible:ring-accent px-xxs py-[2px]"
            >
              {repoName}
            </Link>
            
            {pathParts.map((part, index) => {
              const subPath = pathParts.slice(0, index + 1).join("/");
              return (
                <React.Fragment key={subPath}>
                  <span className="text-text-muted">/</span>
                  <Link
                    href={`/${owner}/${repoName}/tree/${branch}/${subPath}`}
                    className="text-accent hover:underline rounded-xs outline-none focus-visible:ring-1 focus-visible:ring-accent px-xxs py-[2px] truncate max-w-[120px]"
                  >
                    {part}
                  </Link>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Clone button and URL popup */}
        <div className="relative self-end sm:self-center">
          <Button
            onClick={() => setShowCloneDropdown(!showCloneDropdown)}
            className="bg-accent hover:bg-accent/90 text-white py-xs px-md rounded-sm font-space-grotesk font-semibold text-xs transition-colors flex items-center gap-xs focus:ring-2 focus:ring-accent outline-none"
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </Button>

          {showCloneDropdown && (
            <Card className="absolute right-0 mt-xs p-md bg-surface border-border shadow-md rounded-sm w-[280px] z-50 flex flex-col gap-sm">
              <div className="flex items-center justify-between border-b border-border pb-xs">
                <span className="font-space-grotesk font-bold text-xs">Clone</span>
                <div className="flex gap-xs">
                  <button
                    onClick={() => setActiveCloneTab("https")}
                    className={`text-[10px] font-bold px-xs py-xxs rounded-xs ${
                      activeCloneTab === "https"
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-text-muted border border-transparent hover:text-text-primary"
                    }`}
                  >
                    HTTPS
                  </button>
                  <button
                    onClick={() => setActiveCloneTab("ssh")}
                    className={`text-[10px] font-bold px-xs py-xxs rounded-xs ${
                      activeCloneTab === "ssh"
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "text-text-muted border border-transparent hover:text-text-primary"
                    }`}
                  >
                    SSH
                  </button>
                </div>
              </div>

              {/* Copy input group */}
              <div className="flex items-center bg-base border border-border rounded-sm">
                <input
                  type="text"
                  readOnly
                  value={activeCloneTab === "https" ? cloneUrlHttps : cloneUrlSsh}
                  className="bg-transparent border-none text-[10px] font-mono px-xs py-xs flex-1 outline-none text-text-primary truncate select-all"
                />
                <button
                  onClick={copyCloneUrl}
                  className="p-xs text-text-muted hover:text-text-primary border-l border-border transition-colors outline-none focus:ring-1 focus:ring-accent"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="text-[9px] text-text-muted font-mono leading-relaxed flex items-start gap-xxs">
                <Terminal className="w-3.5 h-3.5 shrink-0 text-text-muted" />
                <span>Use git clone with this address to sync your repository files locally.</span>
              </div>
            </Card>
          )}
        </div>

      </div>

      {/* Main Commit Bar Header */}
      <div className="border border-border rounded-sm overflow-hidden bg-surface">
        
        {/* Latest Commit Bar */}
        <div className="bg-base border-b border-border px-md py-sm flex items-center justify-between gap-md text-xs text-text-muted font-inter">
          <div className="flex items-center gap-xs min-w-0">
            {/* Mock author circle */}
            <div className="w-5 h-5 rounded-full bg-accent/20 border border-border text-[9px] flex items-center justify-center font-bold text-accent uppercase shrink-0">
              {latestCommit.author.slice(0, 2)}
            </div>
            
            <span className="font-semibold text-text-primary hover:text-accent hover:underline cursor-pointer">
              {latestCommit.author}
            </span>
            
            <span className="text-text-primary font-medium truncate max-w-[280px] md:max-w-[400px]">
              {latestCommit.message}
            </span>
          </div>

          <span className="font-mono text-[10px] text-text-muted shrink-0">
            {new Date(latestCommit.date).toLocaleDateString()}
          </span>
        </div>

        {/* Directory/File Rows */}
        <div className="flex flex-col divide-y divide-border">
          
          {/* Back to Parent Directory Row (if not at root) */}
          {pathParts.length > 0 && (
            <Link
              href={
                pathParts.length === 1
                  ? `/${owner}/${repoName}`
                  : `/${owner}/${repoName}/tree/${branch}/${pathParts.slice(0, -1).join("/")}`
              }
              className="px-md py-[10px] text-accent font-semibold text-xs hover:bg-base/30 flex items-center gap-xs border-b border-border outline-none focus:bg-base/50"
            >
              <Folder className="w-4 h-4 shrink-0 text-text-muted" />
              <span className="font-space-grotesk">..</span>
            </Link>
          )}

          {items.map((item) => {
            const isFolder = item.type === "tree";
            const rowLink = isFolder
              ? `/${owner}/${repoName}/tree/${branch}/${item.path}`
              : `/${owner}/${repoName}/blob/${branch}/${item.path}`;

            return (
              <div
                key={item.path}
                className="px-md py-[10px] flex items-center justify-between gap-md text-xs hover:bg-base/30 transition-all font-inter"
              >
                {/* Left: Icon and Name */}
                <div className="flex items-center gap-xs min-w-0 flex-1">
                  {isFolder ? (
                    <Folder className="w-4 h-4 shrink-0 text-accent/80" />
                  ) : (
                    <File className="w-4 h-4 shrink-0 text-text-muted" />
                  )}
                  
                  <Link
                    href={rowLink}
                    className="font-space-grotesk font-semibold text-text-primary hover:text-accent hover:underline truncate outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs"
                  >
                    {item.name}
                  </Link>
                </div>

                {/* Center: Latest Commit Message (Desktop only) */}
                <div className="hidden md:block flex-1 text-text-muted truncate pr-md font-inter text-left">
                  {item.lastCommit?.message || "Update file"}
                </div>

                {/* Right: Timestamp */}
                <div className="text-text-muted text-[10px] font-mono shrink-0 text-right select-none">
                  {item.lastCommit
                    ? new Date(item.lastCommit.date).toLocaleDateString()
                    : "Recently"}
                </div>
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}
