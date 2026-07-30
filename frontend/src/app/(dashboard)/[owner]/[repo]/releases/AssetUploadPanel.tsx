'use client';

import React, { useRef, useState } from 'react';

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

interface AssetUploadPanelProps {
  owner: string;
  repo: string;
  uploadedAssets: UploadedAsset[];
  selectedFiles: SelectedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<SelectedFile[]>>;
  onDeleteAsset: (assetId: string) => Promise<void>;
  isEditMode: boolean;
}

export default function AssetUploadPanel({
  owner,
  repo,
  uploadedAssets,
  selectedFiles,
  setSelectedFiles,
  onDeleteAsset,
  isEditMode
}: AssetUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const SIZE_LIMIT_MB = 500;
  const SIZE_LIMIT_BYTES = SIZE_LIMIT_MB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (files: File[]) => {
    const validFiles: SelectedFile[] = [];
    files.forEach((f) => {
      if (f.size > SIZE_LIMIT_BYTES) {
        alert(`File "${f.name}" exceeds the ${SIZE_LIMIT_MB}MB size limit.`);
        return;
      }
      validFiles.push({
        id: Math.random().toString(36).substring(7),
        file: f,
        progress: 0,
        status: 'pending'
      });
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border border-[#232830] rounded-lg bg-[#14171C] p-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">
        Attach binaries / Assets
      </h3>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-950/10'
            : 'border-[#30363D] bg-[#1C2128]/50 hover:bg-[#1C2128]'
        }`}
      >
        <span className="text-2xl mb-2 block">📤</span>
        <p className="text-xs font-semibold text-gray-300">
          Drag and drop files here or click to select
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Max size: {SIZE_LIMIT_MB}MB per file.
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />
      </div>

      {/* Uploaded Assets List (Already saved to server) */}
      {uploadedAssets.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Uploaded Assets
          </p>
          {uploadedAssets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between p-2.5 bg-[#1C2128] border border-[#30363D] rounded-md text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">📦</span>
                <span className="text-gray-200 font-semibold truncate" title={asset.fileName}>
                  {asset.fileName}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                  ({formatSize(asset.sizeBytes)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => onDeleteAsset(asset.id)}
                className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded border border-red-900/40 hover:bg-red-950/20 transition-all focus:outline-none"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected Files List (Pending upload or currently uploading) */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Selected for Upload
          </p>
          {selectedFiles.map((item) => (
            <div
              key={item.id}
              className="p-2.5 bg-[#1C2128] border border-[#30363D] rounded-md text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">📎</span>
                  <span className="text-gray-300 truncate font-semibold" title={item.file.name}>
                    {item.file.name}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    ({formatSize(item.file.size)})
                  </span>
                </div>
                {item.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => removeSelectedFile(item.id)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    ✕
                  </button>
                )}
                {item.status === 'uploading' && (
                  <span className="text-[10px] text-blue-400 font-semibold animate-pulse">
                    Uploading...
                  </span>
                )}
                {item.status === 'success' && (
                  <span className="text-[10px] text-green-400 font-semibold">
                    ✓ Ready
                  </span>
                )}
                {item.status === 'error' && (
                  <span className="text-[10px] text-red-400 font-semibold" title={item.errorMsg}>
                    ⚠️ Failed
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {(item.status === 'uploading' || item.status === 'success') && (
                <div className="w-full bg-[#14171C] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-150"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
