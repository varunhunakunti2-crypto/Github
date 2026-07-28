'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import Monaco Diff Editor to prevent SSR issues
const CodeDiffEditor = dynamic(
  () => import('@/components/editor/CodeEditor').then((mod) => mod.CodeDiffEditor),
  { ssr: false, loading: () => <div className="h-64 bg-[#0B0D10] border border-[#232830] rounded animate-pulse" /> }
);

interface ChangedFile {
  path: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
}

interface CommitDetail {
  hash: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
  committerName: string;
  committerEmail: string;
  committerDate: string;
  subject: string;
  fullMessage: string;
  parents: string[];
  gpg: string;
  files: ChangedFile[];
}

export default function CommitDetailPage({ params }: { params: Promise<{ owner: string; repo: string; sha: string }> }) {
  const { owner, repo, sha } = React.use(params);

  const [commit, setCommit] = useState<CommitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expand state per file
  const [expandedFiles, setExpandedFiles] = useState<{ [path: string]: boolean }>({});
  // Loaded file contents for diffs
  const [fileContents, setFileContents] = useState<{ [path: string]: { original: string; modified: string } }>({});
  const [loadingContents, setLoadingContents] = useState<{ [path: string]: boolean }>({});

  const [authorUser, setAuthorUser] = useState<{ username: string | null } | null>(null);
  const [committerUser, setCommitterUser] = useState<{ username: string | null } | null>(null);

  useEffect(() => {
    async function loadCommit() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/commits/${sha}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Commit not found (404)');
          throw new Error('Failed to load commit details');
        }
        const data = await res.json();
        setCommit(data);

        // Auto-expand if under 10 files
        if (data.files.length <= 10) {
          const autoExpand: { [path: string]: boolean } = {};
          data.files.forEach((f: ChangedFile) => {
            autoExpand[f.path] = true;
            // Load diff content
            loadDiffContent(f, data.parents[0]);
          });
          setExpandedFiles(autoExpand);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadCommit();
  }, [owner, repo, sha]);

  const loadDiffContent = async (file: ChangedFile, parentSha: string) => {
    if (fileContents[file.path] || loadingContents[file.path]) return;

    setLoadingContents(prev => ({ ...prev, [file.path]: true }));
    try {
      let original = '';
      let modified = '';

      // 1. Fetch original content (unless file was added)
      if (file.status !== 'added') {
        const baseRef = parentSha || '4b825dc642cb6eb9a0ff1be748474d22f8ee7875';
        const oldFile = file.oldPath || file.path;
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/raw/${baseRef}/${oldFile}`);
        if (res.ok) original = await res.text();
      }

      // 2. Fetch modified content (unless file was deleted)
      if (file.status !== 'deleted') {
        const res = await fetch(`/api/v1/repos/${owner}/${repo}/raw/${sha}/${file.path}`);
        if (res.ok) modified = await res.text();
      }

      setFileContents(prev => ({
        ...prev,
        [file.path]: { original, modified }
      }));
    } catch (e) {
      console.error('Failed to load file contents for diff', e);
    } finally {
      setLoadingContents(prev => ({ ...prev, [file.path]: false }));
    }
  };

  const toggleExpand = (file: ChangedFile) => {
    const isExpanding = !expandedFiles[file.path];
    setExpandedFiles(prev => ({ ...prev, [file.path]: isExpanding }));
    if (isExpanding && commit) {
      loadDiffContent(file, commit.parents[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto p-6 animate-pulse">
        <div className="h-10 bg-[#14171C] border border-[#232830] rounded w-3/4"></div>
        <div className="h-20 bg-[#14171C] border border-[#232830] rounded"></div>
        <div className="h-64 bg-[#14171C] border border-[#232830] rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-red-400 font-space-grotesk">
        <h3 className="text-lg font-bold">Error</h3>
        <p className="text-xs mt-2 text-gray-500">{error}</p>
      </div>
    );
  }

  useEffect(() => {
    if (commit) {
      fetch(`/api/v1/users/lookup/${encodeURIComponent(commit.authorEmail)}`)
        .then(res => res.ok ? res.json() : { username: null })
        .then(data => setAuthorUser(data))
        .catch(() => setAuthorUser({ username: null }));
      
      if (commit.committerEmail && commit.committerEmail !== commit.authorEmail) {
        fetch(`/api/v1/users/lookup/${encodeURIComponent(commit.committerEmail)}`)
          .then(res => res.ok ? res.json() : { username: null })
          .then(data => setCommitterUser(data))
          .catch(() => setCommitterUser({ username: null }));
      }
    }
  }, [commit]);

  if (!commit) return null;

  const totalAdditions = commit.files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = commit.files.reduce((sum, f) => sum + f.deletions, 0);

  // Check if author and committer differ
  const showCommitter = commit.authorEmail !== commit.committerEmail || commit.authorName !== commit.committerName;

  return (
    <div className="flex flex-col gap-6 font-space-grotesk max-w-4xl mx-auto p-4 md:p-6 text-gray-200">
      {/* 2. Commit Header */}
      <div className="bg-[#14171C] border border-[#232830] rounded-lg p-5 flex flex-col gap-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100">{commit.subject}</h2>
            {commit.fullMessage.split('\n').length > 1 && (
              <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap font-mono">
                {commit.fullMessage.split('\n').slice(1).join('\n')}
              </pre>
            )}
          </div>
          <Link
            href={`/${owner}/${repo}/tree/${commit.hash}`}
            className="px-3 py-1.5 text-xs border border-[#232830] hover:bg-gray-800 rounded transition text-gray-300 shrink-0"
          >
            Browse files
          </Link>
        </div>

        {/* parents & SHAs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#232830] text-xs text-gray-400">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-mono">Commit:</span>
              <span className="font-mono text-gray-300 select-all font-bold">{commit.hash}</span>
              <button 
                onClick={() => navigator.clipboard.writeText(commit.hash)}
                className="text-gray-500 hover:text-gray-300 ml-1"
                title="Copy full SHA"
              >
                📋
              </button>
            </div>
            {commit.parents.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500 font-mono">Parent{commit.parents.length > 1 ? 's' : ''}:</span>
                {commit.parents.map((p, idx) => (
                  <Link
                    key={p}
                    href={`/${owner}/${repo}/commit/${p}`}
                    className="font-mono text-[#7C5CFF] hover:underline"
                  >
                    {p.slice(0, 7)} {commit.parents.length > 1 ? `(Parent ${idx + 1})` : ''}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {commit.gpg === 'G' && (
            <span className="sm:ml-auto px-2 py-0.5 border border-green-500/30 bg-green-950/20 text-green-400 text-[10px] font-bold rounded uppercase">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* 3. Author Section */}
      <div className="bg-[#14171C]/50 border border-[#232830] rounded-lg p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#7C5CFF]/20 flex items-center justify-center font-bold text-[#7C5CFF]">
              {commit.authorName[0]?.toUpperCase()}
            </span>
            {authorUser?.username ? (
              <Link href={`/${authorUser.username}`} className="text-blue-400 font-semibold hover:underline">
                {commit.authorName}
              </Link>
            ) : (
              <span className="text-gray-200 font-semibold">{commit.authorName}</span>
            )}
            <span className="text-gray-500">&lt;{commit.authorEmail}&gt;</span>
            <span className="text-gray-500">authored on {new Date(commit.authorDate).toLocaleString()}</span>
          </div>

          {showCommitter && (
            <div className="text-[11px] text-gray-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#232830] flex items-center gap-2">
              <span>committed by</span>
              {committerUser?.username ? (
                <Link href={`/${committerUser.username}`} className="text-blue-400 font-semibold hover:underline">
                  {commit.committerName}
                </Link>
              ) : (
                <span className="text-gray-300 font-semibold">{commit.committerName}</span>
              )}
              <span>on {new Date(commit.committerDate).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Files Changed Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
          <span>Files Changed</span>
          <span className="font-mono text-gray-500">
            {commit.files.length} files: 
            <span className="text-green-400 ml-1">+{totalAdditions}</span>
            <span className="text-red-400 ml-1">-{totalDeletions}</span>
          </span>
        </div>

        {/* Files diff toggle boxes */}
        <div className="flex flex-col gap-4">
          {commit.files.map((file) => {
            const isExpanded = !!expandedFiles[file.path];
            const content = fileContents[file.path];
            const isLoading = !!loadingContents[file.path];

            return (
              <div key={file.path} className="border border-[#232830] rounded-lg bg-[#0B0D10] overflow-hidden flex flex-col">
                {/* File Header */}
                <div
                  onClick={() => toggleExpand(file)}
                  className="bg-[#14171C]/50 px-4 py-3 flex items-center justify-between border-b border-[#232830] cursor-pointer hover:bg-gray-800/40 transition select-none"
                >
                  <div className="flex items-center gap-2 font-mono text-xs text-gray-300">
                    <span className="text-gray-500">{isExpanded ? '▼' : '▶'}</span>
                    <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${file.status === 'added' ? 'text-green-400' : file.status === 'deleted' ? 'text-red-400' : 'text-[#7C5CFF]'}`}>
                      {file.status}
                    </span>
                    <span>{file.path}</span>
                    {file.oldPath && <span className="text-gray-500">(renamed from {file.oldPath})</span>}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-gray-500">
                      +{file.additions} -{file.deletions}
                    </span>
                    <Link
                      href={`/${owner}/${repo}/blob/${commit.hash}/${file.path}`}
                      className="text-gray-400 hover:text-[#7C5CFF] hover:underline font-space-grotesk text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View file
                    </Link>
                  </div>
                </div>

                {/* Diff Viewer Area */}
                {isExpanded && (
                  <div className="p-4 border-t border-[#232830] bg-[#0B0D10]">
                    {isLoading ? (
                      <div className="h-64 bg-[#14171C] animate-pulse rounded border border-[#232830]" />
                    ) : content ? (
                      <CodeDiffEditor
                        original={content.original}
                        modified={content.modified}
                        filename={file.path}
                        inline={false}
                      />
                    ) : (
                      <div className="p-4 text-center text-xs text-gray-500 italic">
                        Binary file change not shown
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
