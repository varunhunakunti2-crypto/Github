"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input, Label, Checkbox } from "@gitforge/ui";

interface Token {
  id: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  masked_token?: string;
  created_at: string;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create token form state
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiration, setExpiration] = useState("30"); // days
  const [isCreating, setIsCreating] = useState(false);
  const [newRawToken, setNewRawToken] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<{ name?: string }>({});

  const availableScopes = [
    { id: "repo", label: "repo", description: "Full control of private and public repositories" },
    { id: "user", label: "user", description: "Update profile metadata and user settings" },
    { id: "write:packages", label: "write:packages", description: "Upload packages to GitForge registry" },
    { id: "read:packages", label: "read:packages", description: "Download packages from GitForge registry" },
    { id: "admin:org", label: "admin:org", description: "Full control of organization and team settings" },
  ];

  const fetchTokens = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/v1/user/tokens", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load personal access tokens.");
      }

      const data = await response.json();
      setTokens(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleScopeChange = (scopeId: string, checked: boolean) => {
    if (checked) {
      setScopes([...scopes, scopeId]);
    } else {
      setScopes(scopes.filter((s) => s !== scopeId));
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setFormErrors({ name: "Token description name is required" });
      return;
    }
    setFormErrors({});
    setIsCreating(true);

    // Calculate expires_at date based on selected expiration in days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(expiration));

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/v1/user/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          scopes,
          expires_at: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate token. Please try again.");
      }

      const data = await response.json();
      setNewRawToken(data.raw_token || data.token);
      setName("");
      setScopes([]);
      setExpiration("30");
      fetchTokens(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this token? This action cannot be undone.")) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/v1/user/tokens/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to revoke token.");
      }

      setTokens(tokens.filter((t) => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-soft-2 text-ink p-md md:p-xl font-sans">
      <div className="max-w-[760px] mx-auto flex flex-col gap-lg">
        
        {/* Header */}
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight mb-xs">
            Personal Access Tokens
          </h1>
          <p className="text-body text-sm">
            Manage personal tokens used to authenticate requests via Git CLI or HTTP APIs.
          </p>
        </div>

        {error && (
          <div className="p-sm bg-error/10 border border-error text-error text-sm rounded-sm font-sans">
            {error}
          </div>
        )}

        {/* Raw Token Show-Once Alert Box */}
        {newRawToken && (
          <div className="p-lg bg-primary/10 border border-accent rounded-sm text-left">
            <h3 className="font-sans text-lg font-bold text-primary mb-xs">
              New Personal Access Token Generated
            </h3>
            <p className="text-ink text-sm mb-md font-sans">
              Make sure to copy your personal access token now. <span className="font-bold text-error">You won't be able to see it again!</span>
            </p>
            <div className="flex gap-sm items-center">
              <code className="flex-1 p-sm bg-canvas-soft-2 border border-hairline rounded-sm font-jetbrains-mono text-sm text-success select-all break-all">
                {newRawToken}
              </code>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(newRawToken);
                  alert("Token copied to clipboard!");
                }}
                className="bg-primary hover:bg-primary/90 text-white px-md py-xs rounded-sm font-sans text-xs"
              >
                Copy
              </Button>
            </div>
            <button
              onClick={() => setNewRawToken(null)}
              className="mt-sm text-xs text-body hover:text-ink hover:underline"
            >
              I have saved this token
            </button>
          </div>
        )}

        {/* Generate Token Form Card */}
        <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
          <h2 className="font-sans text-xl font-bold mb-md">
            Generate new token
          </h2>
          <form onSubmit={handleCreateToken} className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <Label htmlFor="name" className="text-body font-sans">
                Description / Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-canvas-soft-2 border-hairline text-ink placeholder:text-body/40 focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm"
                placeholder="What is this token for?"
                disabled={isCreating}
                error={!!formErrors.name}
              />
              {formErrors.name && (
                <span className="text-error text-xs mt-1 font-sans">{formErrors.name}</span>
              )}
            </div>

            <div className="flex flex-col gap-xs">
              <Label htmlFor="expiration" className="text-body font-sans">
                Expiration
              </Label>
              <select
                id="expiration"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                disabled={isCreating}
                className="w-full h-[40px] px-sm bg-canvas-soft-2 text-ink border border-hairline rounded-sm transition-colors duration-200 outline-none focus:border-accent font-sans font-body-sm"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">Custom (1 year)</option>
              </select>
            </div>

            <div className="flex flex-col gap-xs">
              <Label className="text-body font-sans mb-xs">
                Select Scopes
              </Label>
              <div className="flex flex-col gap-sm border border-hairline bg-canvas-soft-2 p-sm rounded-sm">
                {availableScopes.map((scope) => (
                  <div key={scope.id} className="flex items-start gap-sm">
                    <Checkbox
                      id={`scope-${scope.id}`}
                      checked={scopes.includes(scope.id)}
                      onChange={(e) => handleScopeChange(scope.id, e.target.checked)}
                      disabled={isCreating}
                      className="mt-1"
                    />
                    <div className="flex flex-col">
                      <label
                        htmlFor={`scope-${scope.id}`}
                        className="font-jetbrains-mono text-xs font-semibold text-ink cursor-pointer"
                      >
                        {scope.label}
                      </label>
                      <span className="text-body text-[11px] font-sans">
                        {scope.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="bg-primary hover:bg-primary/90 text-white font-sans font-semibold py-sm rounded-sm transition-colors focus:ring-2 focus:ring-primary-focus self-start px-lg"
            >
              {isCreating ? "Generating..." : "Generate Token"}
            </Button>
          </form>
        </Card>

        {/* Existing Tokens List Card */}
        <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
          <h2 className="font-sans text-xl font-bold mb-md">
            Active Tokens
          </h2>

          {isLoading ? (
            <p className="text-body text-sm font-sans">Loading tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-body text-sm font-sans">
              You haven't generated any personal access tokens yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {tokens.map((token) => (
                <div key={token.id} className="py-md flex justify-between items-center first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-xs text-left">
                    <div className="flex items-center gap-sm">
                      <span className="font-sans font-semibold text-sm">
                        {token.name}
                      </span>
                      <code className="font-jetbrains-mono text-xs px-xs py-xxs bg-canvas-soft-2 border border-hairline rounded-sm text-body">
                        {token.masked_token || "gitforge_••••••••"}
                      </code>
                    </div>
                    
                    <div className="flex flex-wrap gap-xs py-xxs">
                      {token.scopes.map((scope) => (
                        <span
                          key={scope}
                          className="font-jetbrains-mono text-[10px] px-xs bg-primary/15 border border-accent/20 text-primary rounded-full"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] text-body font-mono flex gap-md">
                      <span>
                        Created: {new Date(token.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Expires:{" "}
                        {token.expires_at
                          ? new Date(token.expires_at).toLocaleDateString()
                          : "Never"}
                      </span>
                      <span>
                        Last used:{" "}
                        {token.last_used_at
                          ? new Date(token.last_used_at).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRevokeToken(token.id)}
                    className="bg-transparent hover:bg-error/10 border border-hairline hover:border-error text-body hover:text-error px-sm py-xxs rounded-sm font-sans text-xs"
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
