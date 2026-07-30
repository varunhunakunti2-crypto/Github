'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AssetUploadPanel from '../AssetUploadPanel';

interface SelectedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMsg?: string;
}

interface UploadedAsset {
  id: string;
  fileName: string;
  sizeBytes: number;
}

function CreateReleaseContent() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  // Form State
  const [tagName, setTagName] = useState('');
  const [targetCommitSha, setTargetCommitSha] = useState('main');
  const [title, setTitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [isPrerelease, setIsPrerelease] = useState(false);
  
  // Available target branches list
  const [branches, setBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Asset Panel State
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const currentUser = 'appi';

  useEffect(() => {
    // Load branches
    async function loadBranches() {
      try {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/branches`);
        if (res.ok) {
          const data = await res.json();
          // Extract branch names
          const names = data.map((b: any) => b.name);
          setBranches(names.length > 0 ? names : ['main']);
        } else {
          setBranches(['main']);
        }
      } catch {
        setBranches(['main']);
      }
    }

    // Load existing release if editing
    async function loadRelease() {
      try {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/id/${editId}?username=${currentUser}`);
        if (!res.ok) throw new Error('Failed to load release details');
        const data = await res.json();
        setTagName(data.tagName);
        setTargetCommitSha(data.targetCommitSha);
        setTitle(data.title);
        setBodyMarkdown(data.bodyMarkdown);
        setIsPrerelease(data.isPrerelease);
        setUploadedAssets(data.assets || []);
      } catch (err: any) {
        setError(err.message || 'Error loading release');
      } finally {
        setIsLoading(false);
      }
    }

    loadBranches();
    if (isEditMode) {
      loadRelease();
    }
  }, [owner, repo, editId, isEditMode]);

  const handleAutoGenerateNotes = async () => {
    if (!tagName.trim()) {
      alert('Please specify a tag name first to generate notes relative to previous tags.');
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagName,
          username: currentUser
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBodyMarkdown((prev) => (prev ? prev + '\n\n' + data.changelog : data.changelog));
      } else {
        alert('Could not find enough git history/prior tags to compile automatically.');
      }
    } catch {
      alert('Error generating changelog notes.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  const uploadFileWithProgress = (fileItem: SelectedFile, releaseId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', fileItem.file);

      // Update upload status
      setSelectedFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading' } : f))
      );

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, progress: percent } : f))
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f))
          );
          resolve();
        } else {
          setSelectedFiles((prev) =>
            prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', errorMsg: xhr.statusText } : f))
          );
          reject(new Error(xhr.statusText));
        }
      };

      xhr.onerror = () => {
        setSelectedFiles((prev) =>
          prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'error', errorMsg: 'Network error' } : f))
        );
        reject(new Error('Network error'));
      };

      xhr.open('POST', `/api/v1/repositories/${owner}/${repo}/releases/${releaseId}/assets?username=${currentUser}`);
      xhr.send(formData);
    });
  };

  const handleDeleteUploadedAsset = async (assetId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this release asset?');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser })
      });
      if (res.ok) {
        setUploadedAssets((prev) => prev.filter((a) => a.id !== assetId));
      } else {
        alert('Failed to delete asset');
      }
    } catch {
      alert('Error deleting asset');
    }
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let release;
      if (isEditMode) {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || tagName,
            bodyMarkdown,
            isPrerelease,
            isDraft,
            username: currentUser
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to update release');
        }
        release = await res.json();
      } else {
        const res = await fetch(`/api/v1/repositories/${owner}/${repo}/releases`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagName,
            targetCommitSha,
            title: title || tagName,
            bodyMarkdown,
            isPrerelease,
            isDraft,
            username: currentUser
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to create release');
        }
        release = await res.json();
      }

      // Upload selected files sequentially
      const filesToUpload = selectedFiles.filter((f) => f.status === 'pending');
      for (const fileItem of filesToUpload) {
        await uploadFileWithProgress(fileItem, release.id);
      }

      // Navigate back to releases list page
      router.push(`/${owner}/${repo}/releases`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-gray-300 animate-pulse">
        <div className="h-6 bg-[#1C2128] rounded w-1/3 mb-6"></div>
        <div className="h-40 bg-[#1C2128] rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-gray-300">
      <div className="border-b border-[#232830] pb-4 mb-6">
        <h1 className="text-xl font-bold text-white">
          {isEditMode ? `Edit Draft Release: ${tagName}` : 'Draft a new release'}
        </h1>
      </div>

      <div className="space-y-5">
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800 text-red-400 text-xs rounded-md">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Tag Selector & Target Branch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="release-tag" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Tag version</label>
            <input
              id="release-tag"
              type="text"
              placeholder="e.g. v1.0.0"
              className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              disabled={isEditMode}
              required
            />
          </div>

          {!isEditMode && (
            <div>
              <label htmlFor="release-target" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Target branch/commit</label>
              <select
                id="release-target"
                className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                value={targetCommitSha}
                onChange={(e) => setTargetCommitSha(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="release-title" className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Release Title</label>
          <input
            id="release-title"
            type="text"
            placeholder="Release title (defaults to tag if empty)"
            className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Body markdown editor */}
        <div>
          <div className="flex justify-between items-center mb-1.5 border-b border-[#232830] pb-2">
            <label className="block text-xs font-semibold text-gray-400 uppercase">Describe this release</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAutoGenerateNotes}
                disabled={isGeneratingNotes}
                className="px-2.5 py-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-400 text-[10px] font-bold uppercase rounded transition-colors disabled:opacity-50"
              >
                🪄 {isGeneratingNotes ? 'Generating...' : 'Auto-generate notes'}
              </button>
              <div className="flex rounded bg-[#1C2128] p-0.5 border border-[#30363D]">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`px-2.5 py-0.5 text-[10px] font-medium rounded ${!previewMode ? 'bg-[#30363D] text-white' : 'text-gray-400'}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`px-2.5 py-0.5 text-[10px] font-medium rounded ${previewMode ? 'bg-[#30363D] text-white' : 'text-gray-400'}`}
                >
                  Preview
                </button>
              </div>
            </div>
          </div>

          {!previewMode ? (
            <textarea
              placeholder="Provide a description of changes..."
              rows={10}
              className="w-full px-3 py-2 bg-[#1C2128] border border-[#30363D] rounded-md text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              value={bodyMarkdown}
              onChange={(e) => setBodyMarkdown(e.target.value)}
            />
          ) : (
            <div className="p-4 bg-[#1C2128] border border-[#30363D] rounded-md min-h-[224px] text-sm text-gray-300 whitespace-pre-wrap leading-relaxed prose prose-invert">
              {bodyMarkdown || <span className="text-gray-500 italic">No notes to preview.</span>}
            </div>
          )}
        </div>

        {/* Pre-release Checkbox */}
        <div className="flex items-start gap-2">
          <input
            id="release-prerelease"
            type="checkbox"
            className="mt-1 rounded border-[#30363D] bg-[#1C2128]"
            checked={isPrerelease}
            onChange={(e) => setIsPrerelease(e.target.checked)}
          />
          <label htmlFor="release-prerelease" className="text-xs text-gray-400 cursor-pointer select-none">
            <span className="font-semibold text-gray-300 block mb-0.5">This is a pre-release</span>
            Marks this release as non-production ready (e.g. beta or alpha version).
          </label>
        </div>

        {/* Asset Upload Panel */}
        <AssetUploadPanel
          owner={owner}
          repo={repo}
          uploadedAssets={uploadedAssets}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          onDeleteAsset={handleDeleteUploadedAsset}
          isEditMode={isEditMode}
        />

        {/* Controls */}
        <div className="flex justify-between items-center border-t border-[#232830] pt-4 mt-2">
          <Link
            href={`/${owner}/${repo}/releases`}
            className="px-4 py-2 text-sm font-semibold border border-[#30363D] hover:bg-[#30363D] text-gray-300 rounded-md transition-colors"
          >
            Cancel
          </Link>
          <div className="flex gap-3">
            <button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-gray-300 bg-[#21262D] border border-[#30363D] rounded-md hover:bg-[#30363D] transition-colors disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-500 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {isSubmitting ? 'Submitting...' : 'Publish release'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateReleasePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading editor...</div>}>
      <CreateReleaseContent />
    </Suspense>
  );
}
