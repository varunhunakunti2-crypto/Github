"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Users2, Shield, Folder, Trash, UserMinus, Plus, UserPlus, FileCode, ArrowLeft, Loader2, Key } from "lucide-react";
import { Card, Button, Input, Select, Modal, Label, Badge } from "@gitforge/ui";

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.org as string;
  const teamSlug = params.slug as string;

  const [org, setOrg] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [orgRepos, setOrgRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Action states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  const [isGrantRepoOpen, setIsGrantRepoOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [accessLevel, setAccessLevel] = useState("READ");
  const [isGrantingRepo, setIsGrantingRepo] = useState(false);
  const [grantRepoError, setGrantRepoError] = useState("");

  // Remove member confirm
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Delete team confirm
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      // Org profile
      const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`, { headers });
      if (!orgRes.ok) throw new Error("Failed to load organization.");
      const orgData = await orgRes.json();
      setOrg(orgData);

      // Team profile
      const teamRes = await fetch(`/api/v1/organizations/${orgSlug}/teams/${teamSlug}`, { headers });
      if (!teamRes.ok) throw new Error("Failed to load team details.");
      const teamData = await teamRes.json();
      setTeam(teamData);

      // Fetch org members to allow adding them
      const membersRes = await fetch(`/api/v1/organizations/${orgSlug}/members`, { headers });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setOrgMembers(membersData);
      }

      // Fetch org repos to allow granting access
      const reposRes = await fetch(`/api/v1/organizations/${orgSlug}/repositories`, { headers });
      if (reposRes.ok) {
        const reposData = await reposRes.json();
        setOrgRepos(reposData);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgSlug && teamSlug) {
      fetchData();
    }
  }, [orgSlug, teamSlug]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUsername) return;
    setIsAddingMember(true);
    setAddMemberError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/teams/${teamSlug}/members/${newMemberUsername}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ role: newMemberRole }),
      });

      if (res.ok) {
        setIsAddMemberOpen(false);
        setNewMemberUsername("");
        setNewMemberRole("MEMBER");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to add team member.");
      }
    } catch (err: any) {
      setAddMemberError(err.message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemovingMember(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/teams/${teamSlug}/members/${memberToRemove.user.username}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.ok) {
        setMemberToRemove(null);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || "Failed to remove member.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleGrantRepoAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName) return;
    setIsGrantingRepo(true);
    setGrantRepoError("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/teams/${teamSlug}/repositories/${repoName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ permission: accessLevel }),
      });

      if (res.ok) {
        setIsGrantRepoOpen(false);
        setRepoName("");
        setAccessLevel("READ");
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Failed to grant access.");
      }
    } catch (err: any) {
      setGrantRepoError(err.message);
    } finally {
      setIsGrantingRepo(false);
    }
  };

  const handleDeleteTeam = async () => {
    setIsDeletingTeam(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/teams/${teamSlug}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.ok) {
        router.push(`/orgs/${orgSlug}/teams`);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || "Failed to delete team.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingTeam(false);
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-xs font-sans text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span>Loading team details...</span>
        </div>
      </div>
    );
  }

  if (error || !org || !team) {
    return (
      <div className="min-h-screen bg-canvas p-3xl">
        <div className="max-w-[600px] mx-auto text-center flex flex-col gap-sm items-center">
          <h2 className="font-space-grotesk text-2xl font-bold text-danger">Error</h2>
          <p className="font-inter text-text-muted text-sm">{error || "Team not found"}</p>
        </div>
      </div>
    );
  }

  const isOrgOwner = org.myRole === "OWNER";
  const isTeamMaintainer = team.myTeamRole === "MAINTAINER" || isOrgOwner;

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      {/* Subheader */}
      <div className="bg-canvas border-b border-border py-md px-lg">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <Link
            href={`/orgs/${orgSlug}/teams`}
            className="flex items-center gap-xs font-sans text-xs text-text-muted hover:text-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </Link>

          {isOrgOwner && (
            <Button
              variant="secondary-sm"
              onClick={() => setIsDeleteOpen(true)}
              className="text-danger border-danger/35 hover:bg-danger/5 flex items-center gap-xxs"
            >
              <Trash className="w-4 h-4" />
              Delete Team
            </Button>
          )}
        </div>
      </div>

      <main className="max-w-[1200px] w-full mx-auto py-xl px-lg flex-1 flex flex-col gap-xl">
        {/* Team Profile Summary */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <div className="w-12 h-12 bg-accent-soft rounded-sm flex items-center justify-center text-accent">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-text-primary">
                {team.name}
              </h1>
              <p className="font-inter text-xs text-text-muted">
                Slug: {team.slug} • Privacy: {team.privacy.toLowerCase()}
              </p>
            </div>
          </div>

          <Badge variant={team.myTeamRole === "MAINTAINER" ? "violet" : "secondary"}>
            {team.myTeamRole || "MEMBER"}
          </Badge>
        </div>

        {/* CODEOWNERS Notice */}
        <div className="p-md bg-canvas border border-hairline rounded-sm flex items-start gap-md">
          <FileCode className="w-6 h-6 text-accent shrink-0 mt-xxs" />
          <div className="flex flex-col gap-xxs">
            <span className="font-space-grotesk font-bold text-sm text-text-primary">
              CODEOWNERS Reference
            </span>
            <p className="font-inter text-xs text-text-muted leading-relaxed">
              If this team is referenced in a repository's `CODEOWNERS` file using `@${org.slug}/${team.slug}`, team members will automatically receive pull request review requests when files under matching patterns are changed.
            </p>
          </div>
        </div>

        {/* Team Members */}
        <div className="flex flex-col gap-md">
          <div className="flex justify-between items-center">
            <h2 className="font-space-grotesk text-md font-bold text-text-primary">
              Members ({team.members?.length || 0})
            </h2>
            {isTeamMaintainer && (
              <Button
                variant="primary-sm"
                onClick={() => setIsAddMemberOpen(true)}
                className="flex items-center gap-xxs"
              >
                <UserPlus className="w-4 h-4" />
                Add Member
              </Button>
            )}
          </div>

          <Card className="bg-canvas border-border p-xxs rounded-sm">
            <div className="divide-y divide-hairline">
              {team.members?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-md">
                  <div className="flex items-center gap-md">
                    {m.user.avatarUrl ? (
                      <img
                        src={m.user.avatarUrl}
                        alt={m.user.username}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold text-xs">
                        {m.user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-sm text-text-primary">
                        {m.user.username}
                      </span>
                      <span className="font-sans text-xs text-text-muted">
                        {m.user.name || m.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm">
                    <Badge variant={m.role === "MAINTAINER" ? "violet" : "secondary"}>
                      {m.role}
                    </Badge>
                    {isTeamMaintainer && m.userId !== team.ownerId && (
                      <Button
                        variant="secondary-sm"
                        onClick={() => setMemberToRemove(m)}
                        className="text-danger hover:border-danger hover:bg-danger/5"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Repository Permissions */}
        <div className="flex flex-col gap-md">
          <div className="flex justify-between items-center">
            <h2 className="font-space-grotesk text-md font-bold text-text-primary">
              Repositories ({team.repositories?.length || 0})
            </h2>
            {isTeamMaintainer && (
              <Button
                variant="primary-sm"
                onClick={() => setIsGrantRepoOpen(true)}
                className="flex items-center gap-xxs"
              >
                <Folder className="w-4 h-4" />
                Grant Access
              </Button>
            )}
          </div>

          <Card className="bg-canvas border-border p-xxs rounded-sm">
            <div className="divide-y divide-hairline">
              {team.repositories?.map((repo: any) => (
                <div key={repo.id} className="flex items-center justify-between p-md">
                  <div className="flex flex-col">
                    <Link
                      href={`/${orgSlug}/${repo.name}`}
                      className="font-space-grotesk font-bold text-sm text-text-primary hover:text-accent hover:underline"
                    >
                      {repo.name}
                    </Link>
                    <span className="font-mono text-[10px] text-text-muted">
                      {repo.isPrivate ? "Private" : "Public"}
                    </span>
                  </div>

                  <div className="flex items-center gap-sm">
                    <Badge variant="success">
                      <Key className="w-3 h-3 mr-xxs inline" />
                      {repo.accessLevel}
                    </Badge>
                  </div>
                </div>
              ))}

              {(!team.repositories || team.repositories.length === 0) && (
                <div className="p-xl text-center font-inter text-text-muted text-sm">
                  This team doesn't have access to any repositories yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>

      {/* Add Member Dialog */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Add member to team"
        description="Add a member from your organization to this team."
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setIsAddMemberOpen(false)} disabled={isAddingMember}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleAddMember}
              disabled={isAddingMember || !newMemberUsername}
              className="flex items-center gap-xxs"
            >
              {isAddingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add to team
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddMember} className="flex flex-col gap-md py-xs">
          {addMemberError && (
            <div className="p-xs bg-danger/10 border border-danger text-danger text-xs rounded-sm font-inter">
              {addMemberError}
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <Label htmlFor="select-user" className="text-text-muted text-xs">
              Select Organization Member
            </Label>
            <Select
              id="select-user"
              value={newMemberUsername}
              onChange={(e) => setNewMemberUsername(e.target.value)}
              disabled={isAddingMember}
            >
              <option value="">Choose a member...</option>
              {orgMembers
                .filter(om => !team.members.some((tm: any) => tm.userId === om.userId)) // exclude already added members
                .map(om => (
                  <option key={om.id} value={om.user.username}>{om.user.username}</option>
                ))}
            </Select>
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="team-role" className="text-text-muted text-xs">
              Team Role
            </Label>
            <Select
              id="team-role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              disabled={isAddingMember}
            >
              <option value="MEMBER">Member (Standard privileges)</option>
              <option value="MAINTAINER">Maintainer (Can add/remove members and manage settings)</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* Grant Repository Access Dialog */}
      <Modal
        isOpen={isGrantRepoOpen}
        onClose={() => setIsGrantRepoOpen(false)}
        title="Grant repo access"
        description="Allow this team to access an organization repository."
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setIsGrantRepoOpen(false)} disabled={isGrantingRepo}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleGrantRepoAccess}
              disabled={isGrantingRepo || !repoName}
              className="flex items-center gap-xxs"
            >
              {isGrantingRepo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Grant Access
            </Button>
          </div>
        }
      >
        <form onSubmit={handleGrantRepoAccess} className="flex flex-col gap-md py-xs">
          {grantRepoError && (
            <div className="p-xs bg-danger/10 border border-danger text-danger text-xs rounded-sm font-inter">
              {grantRepoError}
            </div>
          )}

          <div className="flex flex-col gap-xs">
            <Label htmlFor="select-repo" className="text-text-muted text-xs">
              Select Repository
            </Label>
            <Select
              id="select-repo"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              disabled={isGrantingRepo}
            >
              <option value="">Choose a repository...</option>
              {orgRepos
                .filter(or => !team.repositories.some((tr: any) => tr.id === or.id)) // exclude already accessed repos
                .map(or => (
                  <option key={or.id} value={or.name}>{or.name}</option>
                ))}
            </Select>
          </div>

          <div className="flex flex-col gap-xs">
            <Label htmlFor="repo-permission" className="text-text-muted text-xs">
              Permission Level
            </Label>
            <Select
              id="repo-permission"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              disabled={isGrantingRepo}
            >
              <option value="READ">Read (Pull only)</option>
              <option value="WRITE">Write (Push & Pull)</option>
              <option value="MAINTAIN">Maintain (Manage branches & releases)</option>
              <option value="ADMIN">Admin (Full administrative control)</option>
            </Select>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Team Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Team?"
        description="Are you sure you want to delete this team? This action is irreversible."
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setIsDeleteOpen(false)} disabled={isDeletingTeam}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleDeleteTeam}
              disabled={isDeletingTeam}
              className="bg-danger text-white hover:bg-danger/90 flex items-center gap-xxs"
            >
              {isDeletingTeam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Delete team
            </Button>
          </div>
        }
      >
        <div className="text-sm text-text-muted font-inter leading-relaxed">
          Deleting this team will immediately remove all repository access grants associated with it. Subteams will become top-level teams.
        </div>
      </Modal>

      {/* Confirm Remove Member Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove member from team?"
        description={memberToRemove ? `Are you sure you want to remove ${memberToRemove.user.username} from this team?` : ""}
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setMemberToRemove(null)} disabled={isRemovingMember}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleRemoveMember}
              disabled={isRemovingMember}
              className="bg-danger text-white hover:bg-danger/90 flex items-center gap-xxs"
            >
              {isRemovingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Remove member
            </Button>
          </div>
        }
      >
        <div className="text-sm text-text-muted font-inter leading-relaxed">
          The user will lose any repository permissions granted to them specifically through this team's membership.
        </div>
      </Modal>
    </div>
  );
}
