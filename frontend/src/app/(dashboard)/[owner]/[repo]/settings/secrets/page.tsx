"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Lock, Plus, Trash2, Eye, EyeOff, AlertTriangle, Loader2, Shield } from "lucide-react";

interface Secret {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function SecretsPage() {
  const { owner, repo } = useParams() as { owner: string; repo: string };
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchSecrets = async () => {
    try {
      const res = await fetch(`/api/v1/repositories/${owner}/${repo}/secrets`);
      if (res.ok) setSecrets(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSecrets(); }, [owner, repo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`/api/v1/repositories/${owner}/${repo}/secrets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ name: newName.trim().toUpperCase(), value: newValue })
      });
      setNewName("");
      setNewValue("");
      setShowCreate(false);
      fetchSecrets();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (secretId: string, secretName: string) => {
    if (!confirm(`Delete secret "${secretName}"? This action cannot be undone.`)) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/repositories/${owner}/${repo}/secrets/${secretId}`, {
      method: "DELETE",
      headers: { Authorization: token ? `Bearer ${token}` : "" }
    });
    fetchSecrets();
  };

  if (isLoading) {
    return (
      <div className="p-xl flex items-center justify-center gap-xs text-mute">
        <Loader2 className="w-5 h-5 animate-spin text-link" /> Loading secrets...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-md md:p-xl space-y-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-space-grotesk text-xl font-bold text-ink flex items-center gap-xs">
            <Shield className="w-5 h-5 text-link" /> Secrets
          </h1>
          <p className="font-inter text-xs text-mute mt-xxs">
            Encrypted environment variables for workflow runs. Values are write-only — once saved, they can never be viewed again.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-xxs px-sm py-xs bg-primary hover:bg-primary/90 text-on-primary rounded-xs font-sans text-xs font-semibold transition-colors"
        >
          <Plus className="w-3 h-3" /> New secret
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-surface border border-hairline rounded-sm p-sm space-y-xs">
          <div>
            <label className="font-sans text-[10px] font-bold text-mute uppercase block mb-xxs">Name</label>
            <input
              type="text"
              placeholder="SECRET_NAME"
              className="w-full bg-canvas border border-hairline rounded-xs px-sm py-xs text-sm font-mono text-ink focus:outline-none focus:border-link"
              value={newName}
              onChange={e => setNewName(e.target.value.replace(/[^A-Z0-9_]/gi, "").toUpperCase())}
              required
            />
          </div>
          <div>
            <label className="font-sans text-[10px] font-bold text-mute uppercase block mb-xxs">Value</label>
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                placeholder="Enter secret value..."
                className="w-full bg-canvas border border-hairline rounded-xs px-sm py-xs text-sm font-mono text-ink focus:outline-none focus:border-link pr-xl"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowValue(!showValue)} className="absolute right-xs top-1/2 -translate-y-1/2 text-mute hover:text-ink">
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-xs justify-end">
            <button type="submit" disabled={creating} className="px-sm py-xs bg-primary hover:bg-primary/90 text-on-primary rounded-xs text-xs font-semibold disabled:opacity-50">
              {creating ? "Saving..." : "Save secret"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-sm py-xs bg-canvas border border-hairline rounded-xs text-xs font-semibold hover:bg-canvas-soft-2 text-ink">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-xs items-start p-xs bg-warning/5 border border-warning/20 rounded-xs">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-xxs" />
        <p className="font-inter text-[10px] text-mute">
          Secret values are encrypted at rest with AES-256-GCM and injected into workflow runs as environment variables.
          If a secret value appears in step output, it will be automatically masked as <code className="text-warning">***</code>.
          Values cannot be retrieved after creation — update a secret by overwriting it.
        </p>
      </div>

      {/* Secrets List */}
      {secrets.length === 0 ? (
        <div className="text-center py-xl text-mute">
          <Lock className="w-8 h-8 mx-auto mb-xs" />
          <p className="font-inter text-sm">No secrets configured yet.</p>
        </div>
      ) : (
        <div className="space-y-xxs">
          {secrets.map(secret => (
            <div key={secret.id} className="flex items-center justify-between p-sm bg-surface border border-hairline rounded-sm">
              <div className="flex items-center gap-sm">
                <Lock className="w-4 h-4 text-mute" />
                <div>
                  <span className="font-mono text-sm font-bold text-ink">{secret.name}</span>
                  <span className="font-inter text-[10px] text-mute block">
                    Updated {new Date(secret.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(secret.id, secret.name)}
                className="p-xxs rounded-xs hover:bg-error/10 text-mute hover:text-error transition-colors"
                title="Delete secret"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
