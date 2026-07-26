"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Scale, HelpCircle } from "lucide-react";

interface LicenseBadgeProps {
  licenseName?: string | null;
  owner: string;
  repo: string;
  branch?: string;
}

export default function LicenseBadge({
  licenseName,
  owner,
  repo,
  branch = "main",
}: LicenseBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const hasLicense = licenseName && licenseName !== "None";

  return (
    <div className="flex flex-col gap-xs text-left text-text-primary font-inter w-full">
      <h3 className="font-space-grotesk text-xs font-bold text-text-muted uppercase tracking-wider select-none">
        License
      </h3>

      {hasLicense ? (
        <Link
          href={`/${owner}/${repo}/blob/${branch}/LICENSE`}
          className="flex items-center gap-xs text-xs text-accent hover:underline font-semibold outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-xs py-xxs self-start"
        >
          <Scale className="w-4 h-4 shrink-0 text-text-muted" />
          <span>{licenseName} license</span>
        </Link>
      ) : (
        <div className="relative flex items-center gap-xs text-xs text-text-muted select-none self-start">
          <Scale className="w-4 h-4 shrink-0" />
          <span>No license</span>
          
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            className="p-[2px] text-text-muted hover:text-text-primary transition-colors outline-none focus:ring-1 focus:ring-accent rounded-full"
            aria-label="License information"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showTooltip && (
            <div className="absolute left-0 bottom-full mb-xs p-sm bg-surface border border-border text-text-muted text-[10px] leading-relaxed rounded-sm shadow-md w-[220px] z-50">
              Without a license, default copyright laws apply. Others retain all rights to their source code and you cannot copy, distribute, or modify it without permission.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
