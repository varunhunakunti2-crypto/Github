import React from "react";
import Link from "next/link";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Github, Settings, Plus, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col text-ink">
      {/* Global Navigation Header – top-nav per DESIGN.md */}
      <header className="bg-canvas border-b border-hairline sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-md h-[56px] flex items-center justify-between gap-md">
          {/* Logo & Brand */}
          <div className="flex items-center gap-md">
            <Link href="/" className="flex items-center gap-xs font-sans font-semibold text-[14px] text-ink hover:text-primary transition-colors">
              <Github className="w-5 h-5 text-primary" />
              <span>GitForge</span>
            </Link>

            {/* Main Nav Links */}
            <nav className="hidden md:flex items-center gap-sm">
              <Link href="/" className="font-sans text-[14px] text-mute hover:text-ink transition-colors flex items-center gap-xxs">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            </nav>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-[420px]">
            <GlobalSearchBar />
          </div>

          {/* User Tools & Real-time Notification Bell */}
          <div className="flex items-center gap-xs">
            <Link
              href="/new"
              className="p-xs rounded-md hover:bg-canvas-soft text-mute hover:text-ink transition-colors"
              title="Create new repository"
            >
              <Plus className="w-5 h-5" />
            </Link>

            <NotificationBell />

            <Link
              href="/settings/notifications"
              className="p-xs rounded-md hover:bg-canvas-soft text-mute hover:text-ink transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto">
        {children}
      </main>
    </div>
  );
}
