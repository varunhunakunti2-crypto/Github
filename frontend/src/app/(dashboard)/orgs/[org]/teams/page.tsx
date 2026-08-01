"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users2, Lock, Eye, Plus, ChevronRight, Loader2, Network } from "lucide-react";
import { Card, Button, Input, Select, Modal, Label } from "@gitforge/ui";
import OrgHeader from "@/components/org/OrgHeader";

export default function OrgTeamsPage() {
  const params = useParams();
  const orgSlug = params.org as string;

  const [org, setOrg] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create team state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamSlug, setTeamSlug] = useState("");
  const [privacy, setPrivacy] = useState("VISIBLE");
  const [parentTeamId, setParentTeamId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      // Org profile
      const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`, { headers });
      if (!orgRes.ok) throw new Error("Failed to load organization.");
      const orgData = await orgRes.json();
      setOrg(orgData);

      // Teams list
      const teamsRes = await fetch(`/api/v1/organizations/${orgSlug}/teams`, { headers });
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug) {
      fetchData();
    }
  }, [orgSlug]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTeamName(val);
    const suggested = val
      .toLowerCase()
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, "-");
    setTeamSlug(suggested);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamSlug) return;
    setIsSubmitting(true);
    setCreateError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          name: teamName,
          slug: teamSlug,
          privacy,
          parentTeamId: parentTeamId === "" ? null : parentTeamId
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setTeamName("");
        setTeamSlug("");
        setPrivacy("VISIBLE");
        setParentTeamId("");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to create team.");
      }
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-xs font-sans text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span>Loading teams page...</span>
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
        </div>
      </div>
    );
  }

  const isOwner = org.myRole === "OWNER";

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      <OrgHeader
        org={org}
        activeTab="teams"
        repoCount={0}
        memberCount={0}
      />

      <main className="max-w-[1200px] w-full mx-auto py-xl px-lg flex-1 flex flex-col gap-lg">
        {/* Actions bar */}
        <div className="flex justify-between items-center">
          <h2 className="font-space-grotesk text-lg font-bold text-text-primary">
            Teams
          </h2>
          {isOwner && (
            <Button
              variant="primary-sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-xxs font-semibold"
            >
              <Plus className="w-4 h-4" />
              New Team
            </Button>
          )}
        </div>

        {/* Teams List */}
        {teams.length === 0 ? (
          <Card className="bg-surface border-border p-3xl rounded-sm text-center flex flex-col items-center justify-center border-dashed min-h-[220px]">
            <Users2 className="w-8 h-8 text-text-muted mb-sm" />
            <h3 className="font-space-grotesk text-md font-semibold mb-xs text-text-primary">
              No teams created yet
            </h3>
            <p className="font-inter text-text-muted text-xs max-w-[340px] mb-md leading-relaxed">
              Teams allow you to group organization members and manage repository access control collectively.
            </p>
            {isOwner && (
              <Button variant="primary-sm" onClick={() => setIsCreateOpen(true)}>
                Create a team
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="bg-canvas border-border p-md rounded-sm flex items-center justify-between hover:border-accent/40 transition-all group"
              >
                <div className="flex flex-col gap-xs">
                  <div className="flex items-center gap-sm">
                    <Link
                      href={`/orgs/${org.slug}/teams/${team.slug}`}
                      className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent hover:underline"
                    >
                      {team.name}
                    </Link>
                    <span className="flex items-center gap-xxs px-xs py-[2px] bg-canvas-soft border border-hairline text-[10px] text-text-muted rounded-full font-mono uppercase">
                      {team.privacy === "SECRET" ? <Lock className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      {team.privacy}
                    </span>
                  </div>

                  <p className="font-inter text-text-muted text-xs flex items-center gap-xs">
                    <Users2 className="w-3.5 h-3.5" />
                    {team.members?.length || 0} members
                  </p>

                  {team.parentTeam && (
                    <span className="font-mono text-[10px] text-text-muted flex items-center gap-xxs mt-xxs">
                      <Network className="w-3 h-3 text-accent" />
                      Child of {team.parentTeam.name}
                    </span>
                  )}
                </div>

                <Link href={`/orgs/${org.slug}/teams/${team.slug}`}>
                  <Button variant="secondary-sm" className="p-xs">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Team Dialog */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create a new team"
        description="Organize members, specify privacy settings, and choose nested parent structures."
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleCreateTeam}
              disabled={isSubmitting || !teamName || !teamSlug}
              className="flex items-center gap-xxs"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create Team
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateTeam} className="flex flex-col gap-md py-xs">
          {createError && (
            <div className="p-xs bg-danger/10 border border-danger text-danger text-xs rounded-sm font-inter">
              {createError}
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <Label htmlFor="team-name" className="text-text-muted text-xs">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="e.g. Engineering"
              value={teamName}
              onChange={handleNameChange}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="team-slug" className="text-text-muted text-xs">
              Team Slug
            </Label>
            <Input
              id="team-slug"
              type="text"
              placeholder="e.g. engineering"
              value={teamSlug}
              onChange={(e) => setTeamSlug(e.target.value.toLowerCase())}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="team-privacy" className="text-text-muted text-xs">
              Privacy Settings
            </Label>
            <Select
              id="team-privacy"
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="VISIBLE">Visible (Any org member can see this team)</option>
              <option value="SECRET">Secret (Only members and org owners can see this team)</option>
            </Select>
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="parent-team" className="text-text-muted text-xs">
              Parent Team (Optional, for nested structures)
            </Label>
            <Select
              id="parent-team"
              value={parentTeamId}
              onChange={(e) => setParentTeamId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">None (Top-level team)</option>
              {teams
                .filter(t => !t.parentTeamId) // Only allow top-level teams as parents
                .map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
