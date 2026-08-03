"use client";

import React from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { ProfileOrganization } from "@gitforge/types";

interface OrganizationsListProps {
  organizations: ProfileOrganization[];
  isOwnProfile: boolean;
}

export default function OrganizationsList({
  organizations,
  isOwnProfile,
}: OrganizationsListProps) {
  const hasOrgs = organizations && organizations.length > 0;

  if (!hasOrgs) return null;

  return (
    <div className="flex flex-col gap-sm text-left text-ink">
      <h2 className="font-sans text-sm font-bold text-body">
        Organizations
      </h2>

      <div className="flex flex-wrap gap-md">
        {organizations.map((org) => (
          <Link
            key={org.id}
            href={`/orgs/${org.slug}`}
            className="flex items-center gap-xs p-xs bg-canvas-soft border border-hairline rounded-sm hover:border-accent/40 hover:bg-canvas-soft/80 transition-all group"
          >
            {/* Org avatar (md = 40px) */}
            <Avatar
              src={org.avatar_url}
              name={org.name}
              size="md"
              className="border-hairline shadow-none"
            />
            
            <div className="flex flex-col text-left pr-xs select-none">
              <span className="font-sans font-bold text-xs group-hover:text-primary group-hover:underline">
                {org.name}
              </span>
              <span className="font-jetbrains-mono text-[9px] text-body">
                @{org.slug}
              </span>
            </div>

            {/* Role badge for own profile */}
            {isOwnProfile && org.role && (
              <span className="font-mono text-[9px] px-xs py-[2px] bg-canvas-soft-2 border border-hairline text-body rounded-full uppercase ml-xxs">
                {org.role}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
