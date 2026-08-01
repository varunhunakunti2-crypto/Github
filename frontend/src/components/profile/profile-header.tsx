"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Link as LinkIcon } from "lucide-react";
import { Button } from "@gitforge/ui";
import Avatar from "./Avatar";
import { ProfileUser } from "@gitforge/types";

interface ProfileHeaderProps {
  user: ProfileUser;
  isOwnProfile: boolean;
}

export default function ProfileHeader({ user, isOwnProfile }: ProfileHeaderProps) {
  // Support both camelCase and snake_case properties from backend serializer
  const rawFollowersCount = user.followers_count !== undefined ? user.followers_count : (user as any).followersCount || 0;
  const rawFollowingCount = user.following_count !== undefined ? user.following_count : (user as any).followingCount || 0;
  const isFollowingVal = user.is_following !== undefined ? user.is_following : (user as any).isFollowing || false;
  const bioVal = user.bio || null;
  const locationVal = user.location || null;
  const websiteUrlVal = user.website_url || (user as any).websiteUrl || null;
  const fullNameVal = user.full_name || (user as any).fullName || user.username;
  const avatarUrlVal = user.avatar_url || (user as any).avatarUrl || null;
  const rawCreatedAt = user.created_at || (user as any).createdAt;

  const [isFollowing, setIsFollowing] = useState(isFollowingVal);
  const [followersCount, setFollowersCount] = useState(rawFollowersCount);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const handleFollowToggle = async () => {
    if (isPending) return;

    const previousState = isFollowing;
    const previousCount = followersCount;
    
    setIsFollowing(!previousState);
    setFollowersCount(previousState ? previousCount - 1 : previousCount + 1);
    setIsPending(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const method = previousState ? "DELETE" : "PUT";
      const response = await fetch(`/api/v1/user/following/${user.username}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update follow status.");
      }
    } catch (err: any) {
      setIsFollowing(previousState);
      setFollowersCount(previousCount);
      setError("Failed to update.");
    } finally {
      setIsPending(false);
    }
  };

  const formattedDate = () => {
    try {
      if (!rawCreatedAt) return "March 2024";
      const date = new Date(rawCreatedAt);
      if (isNaN(date.getTime())) return "March 2024";
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    } catch (e) {
      return "March 2024";
    }
  };

  return (
    <div className="flex flex-col gap-sm text-text-primary w-full text-left">
      {/* Large Avatar (e.g. 230px on desktop, md/lg on mobile) */}
      <div className="relative group self-center md:self-start mb-xs">
        <Avatar 
          src={avatarUrlVal} 
          name={fullNameVal} 
          size="xl" 
          className="w-32 h-32 md:w-56 md:h-56 border-border shadow-sm rounded-full" 
        />
      </div>

      {/* Name and Username */}
      <div className="flex flex-col">
        <h1 className="font-space-grotesk text-2xl font-bold tracking-tight text-text-primary leading-tight">
          {fullNameVal}
        </h1>
        <span className="font-jetbrains-mono text-base text-text-muted">
          @{user.username}
        </span>
      </div>

      {/* Actions (Edit / Follow button) */}
      <div className="w-full mt-xxs">
        {isOwnProfile ? (
          <Link href="/settings/profile" passHref className="w-full">
            <Button suppressHydrationWarning={true} className="bg-base hover:bg-border text-text-primary border border-border w-full py-xs rounded-sm font-space-grotesk font-semibold text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
               Edit profile
            </Button>
          </Link>
        ) : (
          <Button
            onClick={handleFollowToggle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isPending}
            suppressHydrationWarning={true}
            className={`w-full py-xs rounded-sm font-space-grotesk font-semibold text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isFollowing
                ? "bg-surface hover:bg-danger/10 border border-border hover:border-danger text-text-muted hover:text-danger"
                : "bg-accent hover:bg-accent/90 text-white border border-transparent"
            }`}
          >
            {isFollowing ? (isHovered ? "Unfollow" : "Following") : "Follow"}
          </Button>
        )}
        {error && (
          <span className="font-inter text-xs text-danger mt-1 block text-center animate-pulse">
            {error}
          </span>
        )}
      </div>

      {/* Bio */}
      {bioVal && (
        <p className="font-inter text-text-primary text-xs leading-relaxed max-w-[280px] break-words mt-xs">
          {bioVal}
        </p>
      )}

      {/* Details list */}
      <div className="flex flex-col gap-xs mt-xs text-xs text-text-muted font-inter">
        
        {/* Followers / Following counts */}
        <div className="flex flex-wrap gap-xs text-[11px] font-semibold text-text-muted mb-xxs">
          <Link
            href={`/${user.username}?tab=followers`}
            className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            👥 <span className="font-bold text-text-primary">{followersCount}</span> followers
          </Link>
          <span>·</span>
          <Link
            href={`/${user.username}?tab=following`}
            className="hover:text-accent outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <span className="font-bold text-text-primary">{rawFollowingCount}</span> following
          </Link>
        </div>

        {locationVal && (
          <span className="flex items-center gap-xs">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {locationVal}
          </span>
        )}

        {websiteUrlVal && (
          <a
            href={websiteUrlVal.startsWith("http") ? websiteUrlVal : `https://${websiteUrlVal}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-xs hover:text-accent hover:underline rounded-xs outline-none focus-visible:ring-1 focus-visible:ring-accent truncate max-w-[240px]"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            {websiteUrlVal}
          </a>
        )}

        <div className="text-[10px] text-text-muted font-mono mt-xs border-t border-border pt-xs">
          Member-Since: <span className="text-text-primary font-bold">{formattedDate()}</span>
        </div>
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-sm animate-pulse w-full">
      {/* Avatar Circle */}
      <div className="w-32 h-32 md:w-56 md:h-56 rounded-full bg-surface border border-border self-center md:self-start"></div>

      {/* Info Stack */}
      <div className="flex flex-col gap-xs w-full mt-xs">
        <div className="h-6 bg-surface border border-border rounded-sm w-44"></div>
        <div className="h-4 bg-surface border border-border rounded-sm w-28"></div>
      </div>

      <div className="w-full h-8 bg-surface border border-border rounded-sm mt-xs"></div>

      <div className="h-10 bg-surface border border-border rounded-sm w-full mt-xs"></div>

      <div className="flex flex-col gap-xs mt-xs">
        <div className="h-4 bg-surface border border-border rounded-sm w-36"></div>
        <div className="h-4 bg-surface border border-border rounded-sm w-32"></div>
      </div>
    </div>
  );
}
