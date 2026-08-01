"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Users, Search, UserMinus, ShieldAlert, AlertTriangle, Plus, Loader2, X } from "lucide-react";
import { Card, Button, Input, Select, Modal, Badge } from "@gitforge/ui";
import OrgHeader from "@/components/org/OrgHeader";
import InviteMemberDialog from "@/components/org/InviteMemberDialog";

export default function OrgPeoplePage() {
  const params = useParams();
  const orgSlug = params.org as string;

  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog & Confirm states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  // Remove Member Confirm Modal
  const [memberToRemove, setMemberToRemove] = useState<any>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Revoke Invite Confirm Modal
  const [inviteToRevoke, setInviteToRevoke] = useState<any>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: token ? `Bearer ${token}` : "" };

      // Org profile
      const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`, { headers });
      if (!orgRes.ok) throw new Error("Failed to load organization.");
      const orgData = await orgRes.json();
      setOrg(orgData);

      // Org members
      const membersRes = await fetch(`/api/v1/organizations/${orgSlug}/members`, { headers });
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      }

      // Pending invitations
      const invitesRes = await fetch(`/api/v1/organizations/${orgSlug}/invitations`, { headers });
      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData);
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

  const handleRoleChange = async (memberUsername: string, newRole: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/members/${memberUsername}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        // Update local state
        setMembers(prev =>
          prev.map(m => (m.user.username === memberUsername ? { ...m, role: newRole } : m))
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || "Failed to update role");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/members/${memberToRemove.user.username}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
        setMemberToRemove(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || "Failed to remove member");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!inviteToRevoke) return;
    setIsRevoking(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/invitations/${inviteToRevoke.id}`, {
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv.id !== inviteToRevoke.id));
        setInviteToRevoke(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || "Failed to revoke invitation");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-xs font-sans text-text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <span>Loading members page...</span>
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

  // Filter members by username
  const filteredMembers = members.filter(m =>
    m.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      <OrgHeader
        org={org}
        activeTab="people"
        repoCount={0} // Header handles count if fetched in overview or we can pass default
        memberCount={members.length}
      />

      <main className="max-w-[1200px] w-full mx-auto py-xl px-lg flex-1 flex flex-col gap-xl">
        {/* Search & Invite controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
          <div className="relative w-full sm:max-w-[360px]">
            <Input
              placeholder="Search members by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-lg"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>
          </div>

          {isOwner && (
            <Button
              variant="primary-sm"
              onClick={() => setIsInviteOpen(true)}
              className="flex items-center gap-xxs font-semibold"
            >
              <Plus className="w-4 h-4" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Members List */}
        <div className="flex flex-col gap-md">
          <h2 className="font-space-grotesk text-md font-bold text-text-primary">
            Members ({filteredMembers.length})
          </h2>

          <Card className="bg-canvas border-border p-xxs rounded-sm">
            <div className="divide-y divide-hairline">
              {filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-md hover:bg-canvas-soft-2 transition-colors">
                  <div className="flex items-center gap-md">
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.username}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center font-bold">
                        {member.user.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-sm text-text-primary">
                        {member.user.username}
                      </span>
                      <span className="font-sans text-xs text-text-muted">
                        {member.user.name || member.user.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-md">
                    {isOwner ? (
                      <div className="w-36">
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.user.username, e.target.value)}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="OWNER">Owner</option>
                          <option value="BILLING_MANAGER">Billing Manager</option>
                        </Select>
                      </div>
                    ) : (
                      <Badge variant={member.role === "OWNER" ? "violet" : "secondary"}>
                        {member.role}
                      </Badge>
                    )}

                    {isOwner && (
                      <Button
                        variant="secondary-sm"
                        onClick={() => setMemberToRemove(member)}
                        className="text-danger hover:border-danger hover:bg-danger/5"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredMembers.length === 0 && (
                <div className="p-xl text-center font-inter text-text-muted text-sm">
                  No members found matching "{searchQuery}"
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Pending Invitations Section */}
        <div className="flex flex-col gap-md mt-lg">
          <h2 className="font-space-grotesk text-md font-bold text-text-primary">
            Pending Invitations ({invitations.length})
          </h2>

          {invitations.length === 0 ? (
            <div className="p-lg border border-hairline border-dashed rounded-sm text-center font-inter text-text-muted text-xs">
              No pending invitations.
            </div>
          ) : (
            <Card className="bg-canvas border-border p-xxs rounded-sm">
              <div className="divide-y divide-hairline">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-md">
                    <div className="flex flex-col gap-xxs">
                      <span className="font-sans font-bold text-sm text-text-primary">
                        {inv.invitedEmail || inv.invitedUser?.username}
                      </span>
                      <span className="font-sans text-xs text-text-muted">
                        Invited by @{inv.invitedBy.username} as {inv.role.toLowerCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-sm">
                      <Badge variant="warning">Pending</Badge>
                      {isOwner && (
                        <Button
                          variant="secondary-sm"
                          onClick={() => setInviteToRevoke(inv)}
                          className="text-danger hover:border-danger hover:bg-danger/5"
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        orgSlug={orgSlug}
        onInviteSuccess={fetchData}
      />

      {/* Confirm Remove Member Dialog */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member?"
        description={memberToRemove ? `Are you sure you want to remove ${memberToRemove.user.username} from this organization?` : ""}
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setMemberToRemove(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-danger text-white hover:bg-danger/90 flex items-center gap-xxs"
            >
              {isRemoving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Remove member
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-md text-sm leading-relaxed text-text-muted">
          <ShieldAlert className="w-8 h-8 text-danger shrink-0" />
          <div>
            Removing this user will revoke all repository permissions and team memberships they have within the organization. They will no longer be able to access private repositories.
          </div>
        </div>
      </Modal>

      {/* Confirm Revoke Invite Dialog */}
      <Modal
        isOpen={!!inviteToRevoke}
        onClose={() => setInviteToRevoke(null)}
        title="Revoke Invitation?"
        description={inviteToRevoke ? `Are you sure you want to revoke the invitation to ${inviteToRevoke.invitedEmail || inviteToRevoke.invitedUser?.username}?` : ""}
        footerActions={
          <div className="flex gap-xs">
            <Button variant="secondary-sm" onClick={() => setInviteToRevoke(null)} disabled={isRevoking}>
              Cancel
            </Button>
            <Button
              variant="primary-sm"
              onClick={handleRevokeInvitation}
              disabled={isRevoking}
              className="bg-danger text-white hover:bg-danger/90 flex items-center gap-xxs"
            >
              {isRevoking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Revoke Invite
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-md text-sm leading-relaxed text-text-muted">
          <AlertTriangle className="w-8 h-8 text-warning shrink-0" />
          <div>
            Revoking this invitation prevents the recipient from using their invitation link to join the organization. You can send a new invitation later if needed.
          </div>
        </div>
      </Modal>
    </div>
  );
}
