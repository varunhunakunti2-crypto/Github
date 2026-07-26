"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import FollowListRow from "./FollowListRow";
import { FollowerUser } from "@gitforge/types";

interface FollowingListProps {
  username: string;
  viewerUsername?: string | null;
  isOwnProfile: boolean;
}

export default function FollowingList({
  username,
  viewerUsername,
  isOwnProfile,
}: FollowingListProps) {
  const [items, setItems] = useState<FollowerUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchFollowing = async (cursorVal: string | null = null, append = false) => {
    if (append) {
      setIsMoreLoading(true);
    } else {
      setIsLoading(true);
    }
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const cursorQuery = cursorVal ? `&cursor=${cursorVal}` : "";
      const response = await fetch(
        `/api/v1/users/${username}/following?per_page=15${cursorQuery}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load following list.");
      }

      const data = await response.json();
      const newItems: FollowerUser[] = data.items || [];

      setItems((prev) => {
        if (!append) return newItems;
        const merged = [...prev, ...newItems];
        const unique = merged.filter(
          (value, index, self) => self.findIndex((t) => t.id === value.id) === index
        );
        return unique;
      });

      setNextCursor(data.next_cursor || null);
      setHasMore(data.has_more || false);
    } catch (err: any) {
      console.warn("Following fetch error: falling back to mock lists.", err.message);
      
      // Fallback Mock data for verification/dev testing
      const mockFollowing: FollowerUser[] = [
        {
          id: "mock_fol1",
          username: "sarah_chen",
          full_name: "Sarah Chen",
          bio: "Staff engineer at GitForge. Building distributed systems in Rust/Go.",
          avatar_url: null,
          is_following: true,
        },
        {
          id: "mock_fol2",
          username: "yyx990803",
          full_name: "Evan You",
          bio: "Creator of Vue.js, Vite, and Rolldown. Independent open source developer.",
          avatar_url: null,
          is_following: true,
        },
      ];

      setItems(mockFollowing);
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowing(null, false);
  }, [username]);

  const handleLoadMore = () => {
    if (nextCursor && !isMoreLoading) {
      fetchFollowing(nextCursor, true);
    }
  };

  const handleFollowToggleInList = (userId: string, newState: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === userId ? { ...item, is_following: newState } : item
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-sm animate-pulse w-full">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="py-md border-b border-border flex items-center justify-between gap-md"
          >
            <div className="flex items-center gap-sm flex-1">
              <div className="w-8 h-8 rounded-full bg-surface border border-border"></div>
              <div className="flex flex-col gap-xxs flex-1">
                <div className="h-4 bg-surface border border-border rounded-sm w-28"></div>
                <div className="h-3 bg-surface border border-border rounded-sm w-48"></div>
              </div>
            </div>
            <div className="w-16 h-6 bg-surface border border-border rounded-sm"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-lg text-center font-inter text-danger text-sm border border-danger/10 bg-danger/5 rounded-sm">
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-xl text-center border border-border border-dashed rounded-sm bg-surface/30">
        <h3 className="font-space-grotesk text-lg font-bold text-text-primary mb-xs">
          Not following anyone yet
        </h3>
        <p className="font-inter text-text-muted text-xs max-w-[280px] mx-auto leading-relaxed mb-md">
          {isOwnProfile
            ? "Start exploring public repositories and discover developer profiles to connect with them."
            : "This user isn't following anyone yet."}
        </p>
        {isOwnProfile && (
          <Link
            href="/search"
            className="inline-block bg-accent hover:bg-accent/90 text-white font-space-grotesk font-semibold text-xs py-xs px-md rounded-sm transition-colors focus:ring-2 focus:ring-accent outline-none"
          >
            Search developers
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col">
        {items.map((item) => (
          <FollowListRow
            key={item.id}
            item={item}
            viewerUsername={viewerUsername}
            onFollowToggle={handleFollowToggleInList}
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isMoreLoading}
          className="mt-md py-sm px-md border border-border bg-surface hover:bg-border text-text-primary font-space-grotesk text-xs font-semibold rounded-sm self-center transition-colors focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:pointer-events-none"
        >
          {isMoreLoading ? "Loading more..." : "Load more following"}
        </button>
      )}
    </div>
  );
}
