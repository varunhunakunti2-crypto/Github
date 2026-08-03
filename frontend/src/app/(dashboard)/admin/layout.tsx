"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check client-side session user payload
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user.isPlatformAdmin) {
        setIsAdmin(false);
      } else {
        setIsAdmin(true);
      }
    } catch (e) {
      setIsAdmin(false);
    }
  }, [router]);

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B0D10] text-gray-400 font-inter">
        Verifying administrator privileges...
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B0D10] text-gray-200 font-inter p-lg text-center">
        <span className="text-4xl mb-sm">🚫</span>
        <h1 className="font-space-grotesk text-2xl font-bold text-white mb-xs">403 — Forbidden</h1>
        <p className="text-gray-400 text-sm max-w-sm mb-md">
          You do not have the required platform administrator permissions to view this resource.
        </p>
        <Link href="/">
          <span className="text-accent hover:underline text-sm cursor-pointer">Return to Dashboard</span>
        </Link>
      </div>
    );
  }

  const tabs = [
    { name: "Users", path: "/admin/users" },
    { name: "Repositories", path: "/admin/repositories" },
    { name: "Abuse Reports", path: "/admin/reports" },
    { name: "Analytics", path: "/admin/analytics" },
    { name: "Audit Logs", path: "/admin/logs" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D10] text-gray-300 font-inter flex flex-col">
      {/* Distinct Administrator Warning Banner */}
      <div className="bg-[#7A1A1C] border-b border-[#A12B2E] text-white text-xs px-md py-xs font-semibold flex justify-between items-center select-none shadow-md">
        <span className="flex items-center gap-xs">
          🚨 PLATFORM ADMINISTRATOR CONSOLE — High Privilege Actions Mode
        </span>
        <span className="bg-[#A12B2E] px-xs py-xxs rounded-sm uppercase text-[9px] font-bold tracking-wider">
          Superuser Mode
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col gap-lg flex-1">
        {/* Navigation Tabs */}
        <div className="border-b border-[#30363D] flex gap-md">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || pathname?.startsWith(tab.path + "/");
            return (
              <Link key={tab.path} href={tab.path}>
                <span className={`pb-xs px-xs border-b-2 text-sm font-semibold transition-colors duration-150 cursor-pointer block ${
                  isActive
                    ? "border-[#F85149] text-[#F85149]"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}>
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Content Render */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
