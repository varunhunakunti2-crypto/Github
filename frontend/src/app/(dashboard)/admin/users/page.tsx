"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "@gitforge/ui";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string | null;
  isPlatformAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals / Confirm states
  const [confirmingAction, setConfirmingAction] = useState<{
    type: "suspend" | "unsuspend" | "promote" | "demote" | "reset_password";
    user: AdminUser;
  } | null>(null);
  const [promoteConfirmCheck, setPromoteConfirmCheck] = useState(false);

  // User audit trail state
  const [activeTrailUser, setActiveTrailUser] = useState<AdminUser | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Temporary password reset result
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/users?q=${encodeURIComponent(search)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load user records.");
      }

      const data = await response.json();
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleUserAction = async () => {
    if (!confirmingAction) return;

    const { type, user } = confirmingAction;
    let endpoint = "";
    let method = "POST";

    if (type === "suspend") endpoint = `/api/v1/admin/users/${user.id}/suspend`;
    else if (type === "unsuspend") endpoint = `/api/v1/admin/users/${user.id}/unsuspend`;
    else if (type === "promote") endpoint = `/api/v1/admin/users/${user.id}/promote`;
    else if (type === "demote") endpoint = `/api/v1/admin/users/${user.id}/demote`;
    else if (type === "reset_password") endpoint = `/api/v1/admin/users/${user.id}/reset-password`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Action failed.");
      }

      if (type === "reset_password") {
        const data = await response.json();
        setTempPasswordResult(data.tempPassword);
      } else {
        // Refresh users list
        fetchUsers();
        setConfirmingAction(null);
        setPromoteConfirmCheck(false);
      }
    } catch (err: any) {
      alert(err.message);
      setConfirmingAction(null);
      setPromoteConfirmCheck(false);
    }
  };

  const fetchAuditTrail = async (targetUser: AdminUser) => {
    setActiveTrailUser(targetUser);
    setIsLoadingAudit(true);
    setAuditLogs([]);
    try {
      const response = await fetch(`/api/v1/admin/users/${targetUser.id}/audit-trail`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load audit trail");
      const data = await response.json();
      setAuditLogs(data || []);
    } catch (err: any) {
      alert(err.message);
      setActiveTrailUser(null);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  return (
    <div className="flex flex-col gap-md text-gray-200">
      
      {/* Search Input */}
      <div className="flex justify-between items-center gap-md">
        <Input
          placeholder="Search users by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#161B22] border-[#30363D] text-white text-sm max-w-md w-full px-md py-xs rounded-sm"
        />
        <Button onClick={fetchUsers} className="bg-[#1F242C] hover:bg-[#282F3B] text-white border border-[#30363D] px-md py-xs text-xs rounded-sm font-semibold">
          Refresh List
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-gray-400">Loading user database...</div>
      ) : error ? (
        <div className="p-md bg-danger/10 border border-danger text-danger text-sm rounded-sm">{error}</div>
      ) : (
        <div className="flex flex-col gap-sm">
          {users.map((userRecord) => (
            <Card key={userRecord.id} className="bg-[#161B22] border-[#30363D] p-md rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-sm">
              <div className="text-left">
                <div className="flex items-center gap-xs flex-wrap">
                  <span className="font-semibold text-white">{userRecord.name || userRecord.username}</span>
                  <span className="text-xs text-gray-400">@{userRecord.username}</span>
                  {userRecord.isPlatformAdmin && (
                    <span className="bg-[#A12B2E] text-white text-[9px] px-xs font-bold uppercase rounded-sm">
                      Admin
                    </span>
                  )}
                  {userRecord.isSuspended && (
                    <span className="bg-danger/20 text-danger border border-danger/30 text-[9px] px-xs font-bold uppercase rounded-sm">
                      Suspended
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-xxs">
                  Email: {userRecord.email} • Joined: {new Date(userRecord.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-xs flex-wrap">
                <Button
                  onClick={() => fetchAuditTrail(userRecord)}
                  className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-xs py-xxs rounded-sm border border-border"
                >
                  Audit Trail
                </Button>
                <Button
                  onClick={() => setConfirmingAction({ type: "reset_password", user: userRecord })}
                  className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-xs py-xxs rounded-sm border border-border"
                >
                  Reset Pwd
                </Button>

                {userRecord.isPlatformAdmin ? (
                  <Button
                    onClick={() => setConfirmingAction({ type: "demote", user: userRecord })}
                    className="bg-transparent hover:bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs px-xs py-xxs rounded-sm"
                  >
                    Demote Admin
                  </Button>
                ) : (
                  <Button
                    onClick={() => setConfirmingAction({ type: "promote", user: userRecord })}
                    className="bg-[#A12B2E] hover:bg-[#B33538] text-white text-xs px-xs py-xxs rounded-sm"
                  >
                    Promote Admin
                  </Button>
                )}

                {userRecord.isSuspended ? (
                  <Button
                    onClick={() => setConfirmingAction({ type: "unsuspend", user: userRecord })}
                    className="bg-success hover:bg-success/90 text-white text-xs px-xs py-xxs rounded-sm"
                  >
                    Unsuspend
                  </Button>
                ) : (
                  <Button
                    onClick={() => setConfirmingAction({ type: "suspend", user: userRecord })}
                    className="bg-transparent hover:bg-danger/10 text-danger border border-danger/20 text-xs px-xs py-xxs rounded-sm"
                  >
                    Suspend
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-md z-50">
          <Card className="bg-[#161B22] border-[#30363D] p-lg max-w-md w-full rounded-sm text-left flex flex-col gap-md">
            <h3 className="font-space-grotesk font-bold text-md text-white">
              Confirm Action: {confirmingAction.type.replace("_", " ").toUpperCase()}
            </h3>

            {tempPasswordResult ? (
              <div className="flex flex-col gap-sm">
                <p className="text-xs text-gray-300">
                  Password has been force-reset. Provide the following temporary password to the user:
                </p>
                <div className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm font-mono text-center text-success font-bold">
                  {tempPasswordResult}
                </div>
                <Button
                  onClick={() => {
                    setTempPasswordResult(null);
                    setConfirmingAction(null);
                    fetchUsers();
                  }}
                  className="bg-accent text-white text-xs px-md py-xs rounded-sm w-full"
                >
                  Close & Refresh
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                <p className="text-xs text-gray-300">
                  Are you sure you want to perform this action on user{" "}
                  <strong className="text-white">@{confirmingAction.user.username}</strong> ({confirmingAction.user.email})?
                </p>

                {(confirmingAction.type === "promote" || confirmingAction.type === "demote") && (
                  <div className="bg-danger/10 border border-danger/20 p-sm rounded-sm text-xs text-danger flex flex-col gap-xs">
                    <span className="font-bold">⚠️ CRITICAL PRIVILEGE ESCALATION NOTICE:</span>
                    <span>
                      Promoting or demoting a user to platform admin grants or revokes the highest levels of database access.
                    </span>
                    <label className="flex items-center gap-xs mt-xxs cursor-pointer text-gray-200">
                      <input
                        type="checkbox"
                        checked={promoteConfirmCheck}
                        onChange={(e) => setPromoteConfirmCheck(e.target.checked)}
                        className="rounded-sm border-[#30363D]"
                      />
                      I understand the scope and accept the security responsibility
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-sm">
                  <Button
                    onClick={() => {
                      setConfirmingAction(null);
                      setPromoteConfirmCheck(false);
                    }}
                    className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-border rounded-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUserAction}
                    disabled={
                      (confirmingAction.type === "promote" || confirmingAction.type === "demote") && !promoteConfirmCheck
                    }
                    className={`${
                      confirmingAction.type === "suspend" || confirmingAction.type === "demote"
                        ? "bg-danger hover:bg-danger/90"
                        : "bg-success hover:bg-success/90"
                    } text-white text-xs px-sm py-xxs rounded-sm`}
                  >
                    Confirm Action
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Audit Trail Drawer Modal */}
      {activeTrailUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-50">
          <div className="bg-[#161B22] border-l border-[#30363D] w-full max-w-lg h-full p-lg flex flex-col gap-md text-left overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#30363D] pb-xs">
              <h3 className="font-space-grotesk font-bold text-md text-white">
                Audit Trail: @{activeTrailUser.username}
              </h3>
              <Button
                onClick={() => setActiveTrailUser(null)}
                className="bg-transparent text-gray-400 hover:text-white text-xs px-xs"
              >
                ✕ Close
              </Button>
            </div>

            {isLoadingAudit ? (
              <div className="text-center py-xl text-gray-400">Loading audit trail...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-xl text-gray-400 text-xs">No recorded logs found for this user.</div>
            ) : (
              <div className="flex flex-col gap-sm flex-1">
                {auditLogs.map((log) => (
                  <div key={log.id} className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm flex flex-col gap-xxs text-[11px]">
                    <div className="flex justify-between text-gray-400">
                      <span className="font-bold text-[#F85149]">{log.action}</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-300">
                      Target: {log.targetType} ({log.targetId})
                    </div>
                    {log.details && (
                      <div className="bg-[#161B22] p-xxs text-gray-400 rounded-sm font-mono mt-xxs overflow-x-auto">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
