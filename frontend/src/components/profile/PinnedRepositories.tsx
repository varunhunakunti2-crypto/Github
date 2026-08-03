"use client";

import React from "react";
import Link from "next/link";
import { Star, GitFork, Lock, Pin } from "lucide-react";
import { Card } from "@gitforge/ui";
import { PinnedRepository } from "@gitforge/types";

interface PinnedRepositoriesProps {
  pins: PinnedRepository[];
  isOwnProfile: boolean;
  onManagePinsClick?: () => void;
}

export default function PinnedRepositories({
  pins,
  isOwnProfile,
  onManagePinsClick,
}: PinnedRepositoriesProps) {
  const hasPins = pins && pins.length > 0;

  return (
    <div className="flex flex-col gap-md text-left text-ink">
      <div className="flex justify-between items-center">
        <h2 className="font-sans text-lg font-bold flex items-center gap-xs">
          <Pin className="w-4 h-4 text-primary rotate-45" />
          Pinned
        </h2>
        {isOwnProfile && hasPins && (
          <button
            onClick={onManagePinsClick}
            className="text-xs text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-xs"
          >
            Customize pins
          </button>
        )}
      </div>

      {!hasPins ? (
        <Card className="bg-canvas-soft border-hairline p-xl rounded-sm flex flex-col items-center justify-center text-center border-dashed min-h-[180px]">
          <Pin className="w-8 h-8 text-body mb-sm rotate-45" />
          <h3 className="font-sans text-md font-semibold mb-xs">
            No pinned repositories
          </h3>
          <p className="font-sans text-body text-xs max-w-[320px] mb-md leading-relaxed">
            {isOwnProfile
              ? "Select and pin up to six public or private repositories to showcase on your profile page."
              : "This user hasn't pinned any repositories to show on their profile overview."}
          </p>
          {isOwnProfile && (
            <Button
              onClick={onManagePinsClick}
              className="bg-primary hover:bg-primary/90 text-white font-sans font-semibold text-xs py-xs px-md rounded-sm"
            >
              Pin repositories
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
          {pins.map((repo) => (
            <Card
              key={repo.id}
              className="bg-canvas-soft border-hairline p-md rounded-sm shadow-none flex flex-col justify-between hover:border-accent/40 transition-colors group relative"
            >
              <div className="flex flex-col gap-xs">
                {/* Repository Name and Visibility */}
                <div className="flex items-center justify-between gap-sm">
                  <Link
                    href={`/${repo.owner_username}/${repo.name}`}
                    className="font-sans font-bold text-sm text-ink hover:text-primary hover:underline break-all"
                  >
                    {repo.name}
                  </Link>
                  <span className="flex items-center gap-xxs px-xs py-[2px] bg-canvas-soft-2 border border-hairline text-[10px] text-body rounded-full font-mono uppercase">
                    {repo.is_private && <Lock className="w-2.5 h-2.5" />}
                    {repo.is_private ? "Private" : "Public"}
                  </span>
                </div>

                {/* Description */}
                {repo.description && (
                  <p className="font-sans text-body text-xs leading-relaxed line-clamp-2 min-h-[36px]">
                    {repo.description}
                  </p>
                )}
              </div>

              {/* Language and Stats footer */}
              <div className="flex items-center justify-between mt-md pt-xs border-t border-hairline/40 font-mono text-[11px] text-body">
                <div className="flex items-center gap-md">
                  {repo.language && (
                    <span className="flex items-center gap-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: repo.language_color || "#7C5CFF",
                        }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span className="flex items-center gap-xs">
                    <Star className="w-3.5 h-3.5" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-xs">
                    <GitFork className="w-3.5 h-3.5" />
                    {repo.forks_count}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple internal helper component
function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="bg-primary hover:bg-primary/90 text-white font-sans font-semibold text-xs py-xs px-md rounded-sm transition-colors focus:ring-2 focus:ring-primary-focus outline-none"
      {...props}
    >
      {children}
    </button>
  );
}
