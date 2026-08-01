import React from "react";
import Link from "next/link";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";
import NotificationBell from "@/components/notifications/NotificationBell";
import { GitBranch, Settings, Plus, LayoutDashboard } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col text-text-primary">
      {/* Global Navigation Header */}
      <header className="bg-surface border-b border-hairline sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-md h-14 flex items-center justify-between gap-md">
          {/* Logo & Brand */}
          <div className="flex items-center gap-md">
            <Link href="/" className="flex items-center gap-xs font-space-grotesk font-bold text-sm tracking-wider text-accent">
              <GitBranch className="w-5 h-5" />
              <span>GITFORGE</span>
            </Link>
            
            {/* Main Nav Links */}
            <nav className="hidden md:flex items-center gap-sm">
              <Link href="/" className="font-sans text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-xxs">
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
              className="p-xs rounded-full hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary transition-colors"
              title="Create new repository"
            >
              <Plus className="w-5 h-5" />
            </Link>

            <NotificationBell />

            <Link
              href="/settings/notifications"
              className="p-xs rounded-full hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto">
        {children}
      </main>
    </div>
  );
}
