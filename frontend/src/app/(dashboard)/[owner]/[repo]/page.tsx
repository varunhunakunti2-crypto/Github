import React from 'react';
import { FileExplorer } from '@/components/repo/file-explorer';
import ReadmeSection from '@/components/repo/ReadmeSection';

export default async function RepoRootPage({ params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;
  
  return (
    <div className="flex flex-col gap-6">
      <FileExplorer owner={owner} repo={repo} currentRef="HEAD" currentPath="" />
      {/* Assuming ReadmeSection handles fetching the readme internally or we pass it props */}
      <ReadmeSection owner={owner} repo={repo} branch="HEAD" />
    </div>
  );
}
