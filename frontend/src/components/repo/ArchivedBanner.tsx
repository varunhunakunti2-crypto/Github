"use client";

import React from "react";
import { Archive } from "lucide-react";

interface ArchivedBannerProps {
  isArchived: boolean;
}

export default function ArchivedBanner({ isArchived }: ArchivedBannerProps) {
  if (!isArchived) return null;

  return (
    <div className="bg-[#fff8c5] border border-[#d29922] text-[#9a6700] p-sm rounded-sm font-inter text-xs flex items-center gap-xs select-none mb-md text-left">
      <Archive className="w-4 h-4 shrink-0 text-[#9a6700]" />
      <span>
        <strong>This repository has been archived.</strong> It is now read-only.
      </span>
    </div>
  );
}
