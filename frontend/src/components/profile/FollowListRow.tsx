"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@gitforge/ui/src/index";
import Avatar from "./Avatar";
import { FollowerUser } from "@gitforge/types";

interface FollowListRowProps {
  item: FollowerUser;
  viewerUsername?: string | null;
  onFollowToggle?: (userId: string, newState: boolean) => void;
}

export default function FollowListRow({
  item,
  viewerUsername,
  onFollowToggle,
}: FollowListRowProps) {
  const [isFollowing, setIsFollowing] = useState(item.is_following || false);
  const [isPending, setIsPending] = useState(false);
  const [rowError, setRowError] = useState("");

  const isSelf = viewerUsername === item.username;

  const handleFollowAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent navigating to the profile link

    if (isPending) return;

    const previousState = isFollowing;
    setIsFollowing(!previousState);
    setRowError("");
    setIsPending(true);

    try {
      const token = localStorage.getItem("access_token");
      const method = previousState ? "DELETE" : "PUT";
      const response = await fetch(`/api/v1/user/following/${item.username}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Action failed.");
      }

      onFollowToggle?.(item.id, !previousState);
    } catch (err) {
      // Revert state on error and display inline error
      setIsFollowing(previousState);
      setRowError("Failed to update.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="relative group border-b border-border py-md flex items-center justify-between gap-md text-left text-text-primary hover:bg-surface/10 px-xs transition-colors rounded-sm">
      {/* Wrapped Link for whole row except button */}
      <Link href={`/${item.username}`} className="flex-1 flex items-center gap-sm min-w-0 outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm">
        <Avatar src={item.avatar_url} name={item.full_name || item.username} size="sm" className="border-border shadow-none" />
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-xxs sm:gap-xs">
            <span className="font-jetbrains-mono text-sm font-semibold text-text-primary hover:text-accent hover:underline">
              @{item.username}
            </span>
            {item.full_name && (
              <span className="font-inter text-xs text-text-muted">
                {item.full_name}
              </span>
            )}
          </div>
          {item.bio && (
            <p className="font-inter text-text-muted text-xs truncate mt-xxs max-w-[480px]">
              {item.bio}
            </p>
          )}
        </div>
      </Link>

      {/* Action / Error Section */}
      <div className="shrink-0 flex flex-col items-end gap-xxs min-w-[80px]">
        {viewerUsername && !isSelf && (
          <button
            onClick={handleFollowAction}
            disabled={isPending}
            className={cn(
              "px-sm py-xxs rounded-sm font-space-grotesk font-semibold text-xs transition-colors outline-none focus:ring-1 focus:ring-accent focus:ring-offset-1 focus:ring-offset-base",
              isFollowing
                ? "bg-surface hover:bg-danger/10 border border-border hover:border-danger text-text-primary hover:text-danger"
                : "bg-accent hover:bg-accent/90 text-white border border-transparent"
            )}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}
        
        {rowError && (
          <span className="font-inter text-[10px] text-danger mt-1 animate-pulse">
            {rowError}
          </span>
        )}
      </div>
    </div>
  );
}
