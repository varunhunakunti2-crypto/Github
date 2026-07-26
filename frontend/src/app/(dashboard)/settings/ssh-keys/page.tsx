"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Input, Label, Textarea } from "@gitforge/ui";

interface SSHKey {
  id: string;
  title: string;
  fingerprint: string;
  key_type: string;
  key: string;
  created_at: string;
}

export default function SSHKeysPage() {
  const [keys, setKeys] = useState<SSHKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Add key form state
  const [title, setTitle] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [formErrors, setFormErrors] = useState<{ title?: string; key?: string }>({});

  const fetchKeys = async () => {
    setIsLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/v1/user/ssh-keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load SSH keys.");
      }

      const data = await response.json();
      setKeys(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const validateKey = (keyString: string) => {
    const trimmed = keyString.trim();
    const parts = trimmed.split(/\s+/);
    
    if (parts.length < 2) {
      return { isValid: false, message: "SSH key must contain at least a key type and the key payload, separated by space." };
    }

    const keyType = parts[0];
    const validPrefixes = [
      "ssh-rsa",
      "ssh-ed25519",
      "ecdsa-sha2-nistp256",
      "ecdsa-sha2-nistp384",
      "ecdsa-sha2-nistp521",
      "ssh-dss"
    ];

    if (!validPrefixes.includes(keyType)) {
      return { 
        isValid: false, 
        message: `Invalid SSH key type. Key must start with one of: ${validPrefixes.join(", ")}` 
      };
    }

    // Basic base64 payload validation for the second part
    const base64Payload = parts[1];
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Payload)) {
      return { isValid: false, message: "SSH key payload contains invalid characters. It must be valid base64." };
    }

    return { isValid: true, keyType };
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof formErrors = {};

    if (!title.trim()) {
      errors.title = "Title is required";
    }

    if (!publicKey.trim()) {
      errors.key = "SSH public key string is required";
    } else {
      const validation = validateKey(publicKey);
      if (!validation.isValid) {
        errors.key = validation.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setIsAdding(true);

    const validation = validateKey(publicKey);
    const key_type = validation.isValid ? validation.keyType : "ssh-rsa";

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("/api/v1/user/ssh-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          key: publicKey.trim(),
          key_type,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to add SSH key. Please try again.");
      }

      setTitle("");
      setPublicKey("");
      fetchKeys(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SSH key?")) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`/api/v1/user/ssh-keys/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete SSH key.");
      }

      setKeys(keys.filter((k) => k.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-base text-text-primary p-md md:p-xl font-inter">
      <div className="max-w-[760px] mx-auto flex flex-col gap-lg">
        
        {/* Header */}
        <div>
          <h1 className="font-space-grotesk text-3xl font-bold tracking-tight mb-xs">
            SSH Keys
          </h1>
          <p className="text-text-muted text-sm">
            Manage SSH public keys associated with your account to securely pull/push repository files.
          </p>
        </div>

        {error && (
          <div className="p-sm bg-danger/10 border border-danger text-danger text-sm rounded-sm font-inter">
            {error}
          </div>
        )}

        {/* Add SSH Key Form Card */}
        <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
          <h2 className="font-space-grotesk text-xl font-bold mb-md">
            Add SSH key
          </h2>
          <form onSubmit={handleAddKey} className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <Label htmlFor="title" className="text-text-muted font-space-grotesk">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm"
                placeholder="e.g. Work Macbook Pro"
                disabled={isAdding}
                error={!!formErrors.title}
              />
              {formErrors.title && (
                <span className="text-danger text-xs mt-1 font-inter">{formErrors.title}</span>
              )}
            </div>

            <div className="flex flex-col gap-xs">
              <Label htmlFor="publicKey" className="text-text-muted font-space-grotesk">
                Key
              </Label>
              <Textarea
                id="publicKey"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="bg-base border-border text-text-primary placeholder:text-text-muted/40 focus:border-accent focus:ring-1 focus:ring-accent rounded-sm font-mono text-xs"
                placeholder="Begins with 'ssh-rsa', 'ssh-ed25519', 'ecdsa-sha2-nistp256', etc."
                disabled={isAdding}
                error={!!formErrors.key}
              />
              {formErrors.key && (
                <span className="text-danger text-xs mt-1 font-inter">{formErrors.key}</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isAdding}
              className="bg-accent hover:bg-accent/90 text-white font-space-grotesk font-semibold py-sm rounded-sm transition-colors focus:ring-2 focus:ring-accent self-start px-lg"
            >
              {isAdding ? "Adding key..." : "Add SSH key"}
            </Button>
          </form>
        </Card>

        {/* Existing SSH Keys List Card */}
        <Card className="bg-surface border-border text-text-primary p-lg rounded-sm shadow-none">
          <h2 className="font-space-grotesk text-xl font-bold mb-md">
            SSH Keys
          </h2>

          {isLoading ? (
            <p className="text-text-muted text-sm font-inter">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-text-muted text-sm font-inter">
              There are no SSH keys associated with your account.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {keys.map((key) => (
                <div key={key.id} className="py-md flex justify-between items-center first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-xs text-left">
                    <div className="flex items-center gap-sm">
                      <span className="font-space-grotesk font-semibold text-sm">
                        {key.title}
                      </span>
                      <span className="font-jetbrains-mono text-[10px] px-xs bg-base border border-border text-text-muted rounded-full">
                        {key.key_type}
                      </span>
                    </div>

                    <div className="font-jetbrains-mono text-xs text-text-muted select-all break-all pr-sm">
                      Fingerprint: {key.fingerprint}
                    </div>

                    <div className="text-[11px] text-text-muted font-mono">
                      Added: {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDeleteKey(key.id)}
                    className="bg-transparent hover:bg-danger/10 border border-border hover:border-danger text-text-muted hover:text-danger px-sm py-xxs rounded-sm font-space-grotesk text-xs"
                  >
                    Delete
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
