import React from "react";
import { Github } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans flex flex-col items-center justify-center p-sm md:p-md selection:bg-primary selection:text-on-primary">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-lg">
        {/* Brand mark – lavender accent per DESIGN.md */}
        <div className="flex items-center gap-2 mb-sm">
          <Github className="w-7 h-7 text-primary" />
          <span className="font-sans font-semibold text-[20px] tracking-[-0.2px] text-ink">GitForge</span>
        </div>
        {children}
      </div>
    </div>
  );
}
