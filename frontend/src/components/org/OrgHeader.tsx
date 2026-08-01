"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Building, Users, GitFork, Shield, Settings, Users2, Pencil, Check, X, Loader2 } from "lucide-react";
import { Badge, Button, Input, Textarea } from "@gitforge/ui";

interface OrgHeaderProps {
  org: {
    name: string;
    slug: string;
    description: string | null;
    avatarUrl: string | null;
    billingEmail: string;
    myRole: "OWNER" | "MEMBER" | "BILLING_MANAGER" | null;
    members: any[];
    repositoriesCount?: number;
  };
  activeTab: "overview" | "people" | "teams" | "settings";
  repoCount: number;
  memberCount: number;
  onOrgUpdate?: (updatedOrg: any) => void;
}

export default function OrgHeader({
  org,
  activeTab,
  repoCount,
  memberCount,
  onOrgUpdate
}: OrgHeaderProps) {
  const isOwner = org.myRole === "OWNER";
  
  // Edit description states
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(org.description || "");
  const [isSavingDesc, setIsSavingDesc] = useState(false);

  const handleSaveDesc = async () => {
    setIsSavingDesc(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${org.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: org.name,
          billingEmail: org.billingEmail,
          description: descValue
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (onOrgUpdate) {
          onOrgUpdate(updated);
        }
        setIsEditingDesc(false);
      }
    } catch (e) {
      console.error("Failed to update description", e);
    } finally {
      setIsSavingDesc(false);
    }
  };

  return (
    <div className="border-b border-border bg-canvas pt-xl px-lg">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-lg">
        {/* Main Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
          <div className="flex items-center gap-md">
            {org.avatarUrl ? (
              <img
                src={org.avatarUrl}
                alt={org.name}
                className="w-16 h-16 rounded-md object-cover border border-border"
              />
            ) : (
              <div className="w-16 h-16 rounded-md bg-accent-soft border border-hairline flex items-center justify-center text-accent">
                <Building className="w-8 h-8" />
              </div>
            )}
            
            <div className="flex flex-col gap-xxs">
              <div className="flex items-center gap-xs">
                <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-text-primary">
                  {org.name}
                </h1>
                {org.myRole && (
                  <Badge variant={org.myRole === "OWNER" ? "violet" : "secondary"} className="font-mono text-[10px]">
                    <Shield className="w-3 h-3 mr-xxs inline" />
                    {org.myRole}
                  </Badge>
                )}
              </div>
              <span className="font-mono text-xs text-text-muted">
                gitforge.dev/orgs/{org.slug}
              </span>
            </div>
          </div>

          {/* Org stats */}
          <div className="flex items-center gap-md text-xs font-mono text-text-muted">
            <div className="flex items-center gap-xs">
              <GitFork className="w-4 h-4 text-text-muted" />
              <span>{repoCount} Repositories</span>
            </div>
            <div className="flex items-center gap-xs">
              <Users className="w-4 h-4 text-text-muted" />
              <span>{memberCount} Members</span>
            </div>
          </div>
        </div>

        {/* Description section */}
        <div className="max-w-[800px]">
          {isEditingDesc ? (
            <div className="flex flex-col gap-xs">
              <Textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                placeholder="Describe this organization..."
                className="min-h-[80px]"
                disabled={isSavingDesc}
              />
              <div className="flex gap-xs justify-end">
                <Button
                  variant="secondary-sm"
                  onClick={() => {
                    setDescValue(org.description || "");
                    setIsEditingDesc(false);
                  }}
                  disabled={isSavingDesc}
                >
                  <X className="w-3.5 h-3.5 mr-xxs" />
                  Cancel
                </Button>
                <Button
                  variant="primary-sm"
                  onClick={handleSaveDesc}
                  disabled={isSavingDesc}
                >
                  {isSavingDesc ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-xxs" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-xxs" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-xs group">
              <p className="font-inter text-sm text-text-muted leading-relaxed">
                {org.description || "No description provided."}
              </p>
              {isOwner && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="p-xxs rounded-xs hover:bg-canvas-soft text-text-muted hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Edit description"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-xxs" aria-label="Organization navigation">
          <Link
            href={`/orgs/${org.slug}`}
            className={`font-sans text-sm font-medium px-md h-[40px] flex items-center justify-center border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-accent text-accent font-semibold"
                : "border-transparent text-text-muted hover:text-text-primary hover:border-border"
            }`}
          >
            <GitFork className="w-4 h-4 mr-xs shrink-0" />
            Repositories
          </Link>

          <Link
            href={`/orgs/${org.slug}/people`}
            className={`font-sans text-sm font-medium px-md h-[40px] flex items-center justify-center border-b-2 transition-all ${
              activeTab === "people"
                ? "border-accent text-accent font-semibold"
                : "border-transparent text-text-muted hover:text-text-primary hover:border-border"
            }`}
          >
            <Users className="w-4 h-4 mr-xs shrink-0" />
            People
          </Link>

          <Link
            href={`/orgs/${org.slug}/teams`}
            className={`font-sans text-sm font-medium px-md h-[40px] flex items-center justify-center border-b-2 transition-all ${
              activeTab === "teams"
                ? "border-accent text-accent font-semibold"
                : "border-transparent text-text-muted hover:text-text-primary hover:border-border"
            }`}
          >
            <Users2 className="w-4 h-4 mr-xs shrink-0" />
            Teams
          </Link>

          {isOwner && (
            <Link
              href={`/orgs/${org.slug}/settings`}
              className={`font-sans text-sm font-medium px-md h-[40px] flex items-center justify-center border-b-2 transition-all ${
                activeTab === "settings"
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text-primary hover:border-border"
              }`}
            >
              <Settings className="w-4 h-4 mr-xs shrink-0" />
              Settings
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
