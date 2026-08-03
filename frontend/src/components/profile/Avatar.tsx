"use client";

import React, { useState } from "react";
import { cn } from "@gitforge/ui/src/index";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const getInitials = () => {
    if (!name) return "?";
    const cleanName = name.trim();
    if (!cleanName) return "?";
    
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: "w-8 h-8 text-xs font-semibold",
    md: "w-10 h-10 text-sm font-semibold",
    lg: "w-12 h-12 text-base font-semibold",
    xl: "w-24 h-24 text-2xl font-bold font-sans",
  };

  const showImage = src && !hasError;

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-hairline select-none bg-canvas-soft",
        sizeClasses[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name || "User Avatar"}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="text-primary font-medium select-none uppercase tracking-wide">
          {getInitials()}
        </span>
      )}
    </div>
  );
}
