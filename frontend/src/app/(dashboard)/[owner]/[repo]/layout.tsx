import React from 'react';
import { RepoHeader } from '@/components/repo/repo-header';
import ArchivedBanner from '@/components/repo/ArchivedBanner';

export default async function RepoLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo } = await params;
  
  // In a real app, this would be fetched from the API context
  const isArchived = false;

  return (
    <div className="min-h-screen bg-[#0B0D10] text-gray-300">
      <RepoHeader owner={owner} repo={repo} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isArchived && <ArchivedBanner isArchived={isArchived} />}
        {children}
      </div>
    </div>
  );
}
