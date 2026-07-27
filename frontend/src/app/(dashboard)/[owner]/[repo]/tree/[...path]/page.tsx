import React from 'react';
import { FileExplorer } from '@/components/repo/file-explorer';

export default async function RepoTreePage({ params }: { params: Promise<{ owner: string; repo: string; path: string[] }> }) {
  const { owner, repo, path } = await params;
  
  // path[0] is the ref (e.g. branch name or hash), the rest is the actual directory path
  const currentRef = path[0];
  const currentPath = path.slice(1).join('/');

  return (
    <div className="flex flex-col gap-6">
      <FileExplorer owner={owner} repo={repo} currentRef={currentRef} currentPath={currentPath} />
    </div>
  );
}
