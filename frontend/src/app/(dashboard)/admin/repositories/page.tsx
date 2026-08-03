"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input } from "@gitforge/ui";

interface AdminRepository {
  id: string;
  name: string;
  isPrivate: boolean;
  isArchived: boolean;
  createdAt: string;
  sizeBytes: number;
  owner?: { id: string; username: string } | null;
  organization?: { id: string; slug: string } | null;
  storageFootprint: {
    gitSize: number;
    lfsSize: number;
    artifactsSize: number;
    packagesSize: number;
  };
}

export default function AdminRepositoriesPage() {
  const [repos, setRepos] = useState<AdminRepository[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modals / Confirm states
  const [confirmingAction, setConfirmingAction] = useState<{
    type: "archive" | "unarchive" | "transfer" | "delete";
    repo: AdminRepository;
  } | null>(null);

  // Form states for modals
  const [transferNewOwner, setTransferNewOwner] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const fetchRepos = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/repositories?q=${encodeURIComponent(search)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load repository records.");
      }

      const data = await response.json();
      setRepos(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [search]);

  const handleRepoAction = async () => {
    if (!confirmingAction) return;

    const { type, repo } = confirmingAction;
    const ownerName = repo.owner?.username || repo.organization?.slug || "";

    let endpoint = "";
    let method = "POST";
    let body: any = {};

    if (type === "archive") {
      endpoint = `/api/v1/admin/repositories/${ownerName}/${repo.name}/archive`;
      body = { reason: actionReason };
    } else if (type === "unarchive") {
      endpoint = `/api/v1/admin/repositories/${ownerName}/${repo.name}/unarchive`;
    } else if (type === "transfer") {
      endpoint = `/api/v1/admin/repositories/${ownerName}/${repo.name}/transfer`;
      body = { newOwner: transferNewOwner };
    } else if (type === "delete") {
      endpoint = `/api/v1/admin/repositories/${ownerName}/${repo.name}`;
      method = "DELETE";
      body = { reason: actionReason };
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: method !== "GET" ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Action failed.");
      }

      fetchRepos();
      setConfirmingAction(null);
      setTransferNewOwner("");
      setActionReason("");
      setDeleteConfirmationText("");
    } catch (err: any) {
      alert(err.message);
      setConfirmingAction(null);
      setTransferNewOwner("");
      setActionReason("");
      setDeleteConfirmationText("");
    }
  };

  const getRepoOwnerName = (repo: AdminRepository) => {
    return repo.owner?.username || repo.organization?.slug || "Unknown";
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col gap-md text-gray-200">
      
      {/* Search Bar */}
      <div className="flex justify-between items-center gap-md">
        <Input
          placeholder="Search repositories by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#161B22] border-[#30363D] text-white text-sm max-w-md w-full px-md py-xs rounded-sm"
        />
        <Button onClick={fetchRepos} className="bg-[#1F242C] hover:bg-[#282F3B] text-white border border-[#30363D] px-md py-xs text-xs rounded-sm font-semibold">
          Refresh List
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-xl text-gray-400">Loading repositories...</div>
      ) : error ? (
        <div className="p-md bg-error/10 border border-error text-error text-sm rounded-sm">{error}</div>
      ) : (
        <div className="flex flex-col gap-sm">
          {repos.map((repoRecord) => {
            const ownerName = getRepoOwnerName(repoRecord);
            return (
              <Card key={repoRecord.id} className="bg-[#161B22] border-[#30363D] p-md rounded-sm flex flex-col gap-sm text-left">
                
                {/* Header Row */}
                <div className="flex justify-between items-start flex-wrap gap-xs">
                  <div>
                    <div className="flex items-center gap-xs flex-wrap">
                      <span className="font-semibold text-white text-md">
                        {ownerName}/{repoRecord.name}
                      </span>
                      <span className="text-[10px] px-xs bg-gray-800 text-gray-400 rounded-sm">
                        {repoRecord.isPrivate ? "Private" : "Public"}
                      </span>
                      {repoRecord.isArchived && (
                        <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] px-xs font-bold uppercase rounded-sm">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-xxs">
                      Created: {new Date(repoRecord.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex gap-xs flex-wrap">
                    <Button
                      onClick={() => setConfirmingAction({ type: "transfer", repo: repoRecord })}
                      className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-xs py-xxs rounded-sm border border-hairline"
                    >
                      Transfer
                    </Button>

                    {repoRecord.isArchived ? (
                      <Button
                        onClick={() => setConfirmingAction({ type: "unarchive", repo: repoRecord })}
                        className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-xs py-xxs rounded-sm border border-hairline"
                      >
                        Unarchive
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setConfirmingAction({ type: "archive", repo: repoRecord })}
                        className="bg-transparent hover:bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs px-xs py-xxs rounded-sm"
                      >
                        Archive
                      </Button>
                    )}

                    <Button
                      onClick={() => setConfirmingAction({ type: "delete", repo: repoRecord })}
                      className="bg-transparent hover:bg-error/10 text-error border border-error/20 text-xs px-xs py-xxs rounded-sm"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Storage Footprint breakdown */}
                <div className="bg-[#0D1117] border border-[#30363D] p-sm rounded-sm text-xs grid grid-cols-2 md:grid-cols-4 gap-sm">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Git Repository</span>
                    <strong className="text-white font-mono">{formatSize(repoRecord.storageFootprint.gitSize)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">LFS Storage</span>
                    <strong className="text-white font-mono">{formatSize(repoRecord.storageFootprint.lfsSize)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Build Artifacts</span>
                    <strong className="text-white font-mono">{formatSize(repoRecord.storageFootprint.artifactsSize)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Packages Storage</span>
                    <strong className="text-white font-mono">{formatSize(repoRecord.storageFootprint.packagesSize)}</strong>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-md z-50">
          <Card className="bg-[#161B22] border-[#30363D] p-lg max-w-md w-full rounded-sm text-left flex flex-col gap-md">
            <h3 className="font-sans font-bold text-md text-white">
              Confirm Action: {confirmingAction.type.toUpperCase()}
            </h3>

            <div className="flex flex-col gap-md">
              <p className="text-xs text-gray-300">
                Are you sure you want to perform this action on repository{" "}
                <strong className="text-white">{getRepoOwnerName(confirmingAction.repo)}/{confirmingAction.repo.name}</strong>?
              </p>

              {/* Archive / Delete Reason */}
              {(confirmingAction.type === "archive" || confirmingAction.type === "delete") && (
                <div className="flex flex-col gap-xs">
                  <label className="text-xs font-semibold text-gray-300">Reason for override (Required for logs):</label>
                  <Input
                    placeholder="E.g., policy violation, terms of service breach"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="bg-[#0D1117] border-[#30363D] text-white text-xs px-sm py-xxs rounded-sm w-full"
                  />
                </div>
              )}

              {/* Transfer ownership input */}
              {confirmingAction.type === "transfer" && (
                <div className="flex flex-col gap-sm">
                  <div className="bg-orange-500/10 border border-orange-500/20 p-sm rounded-sm text-xs text-orange-400">
                    <strong>⚠️ WARNING:</strong> Transferring ownership is a rare action that changes who controls push access and settings for this repository.
                  </div>
                  <div className="flex flex-col gap-xs">
                    <label className="text-xs font-semibold text-gray-300">New Owner Username:</label>
                    <Input
                      placeholder="Enter username of new owner"
                      value={transferNewOwner}
                      onChange={(e) => setTransferNewOwner(e.target.value)}
                      className="bg-[#0D1117] border-[#30363D] text-white text-xs px-sm py-xxs rounded-sm w-full"
                    />
                  </div>
                </div>
              )}

              {/* Delete verification text */}
              {confirmingAction.type === "delete" && (
                <div className="flex flex-col gap-xs">
                  <div className="bg-error/10 border border-error/20 p-sm rounded-sm text-xs text-error">
                    <strong>⚠️ DANGER:</strong> Deletion is irreversible. All branches, LFS files, commits, and artifacts will be deleted.
                  </div>
                  <label className="text-xs font-semibold text-gray-300">
                    Type <code className="bg-[#0D1117] px-xxs text-white font-mono rounded-sm">{getRepoOwnerName(confirmingAction.repo)}/{confirmingAction.repo.name}</code> to confirm:
                  </label>
                  <Input
                    placeholder="owner/repo"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className="bg-[#0D1117] border-[#30363D] text-white text-xs px-sm py-xxs rounded-sm w-full"
                  />
                </div>
              )}

              <div className="flex justify-end gap-sm mt-sm">
                <Button
                  onClick={() => {
                    setConfirmingAction(null);
                    setTransferNewOwner("");
                    setActionReason("");
                    setDeleteConfirmationText("");
                  }}
                  className="bg-transparent hover:bg-gray-800 text-gray-300 text-xs px-sm py-xxs border border-hairline rounded-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRepoAction}
                  disabled={
                    (confirmingAction.type === "archive" && !actionReason.trim()) ||
                    (confirmingAction.type === "transfer" && !transferNewOwner.trim()) ||
                    (confirmingAction.type === "delete" && (!actionReason.trim() || deleteConfirmationText !== `${getRepoOwnerName(confirmingAction.repo)}/${confirmingAction.repo.name}`))
                  }
                  className={`${
                    confirmingAction.type === "delete"
                      ? "bg-error hover:bg-error/90"
                      : confirmingAction.type === "archive" || confirmingAction.type === "transfer"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-success hover:bg-success/90"
                  } text-white text-xs px-sm py-xxs rounded-sm`}
                >
                  Confirm Action
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
