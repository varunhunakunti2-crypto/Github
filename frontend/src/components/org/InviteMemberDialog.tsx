"use client";

import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Select, Label } from "@gitforge/ui";
import { Mail, User, Shield, AlertCircle, CheckCircle, Loader2 } from "lucide-react";

interface InviteMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
  onInviteSuccess?: () => void;
}

export default function InviteMemberDialog({
  isOpen,
  onClose,
  orgSlug,
  onInviteSuccess
}: InviteMemberDialogProps) {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/organizations/${orgSlug}/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ emailOrUsername, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to send invitation.");
      }

      setSuccess(`Invitation sent successfully to ${emailOrUsername}!`);
      setEmailOrUsername("");
      setRole("MEMBER");
      
      if (onInviteSuccess) {
        onInviteSuccess();
      }

      // Close after a brief delay so they see the success state
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite a new member"
      description="Invite someone by their GitForge username or email address."
      footerActions={
        <div className="flex gap-xs">
          <Button variant="secondary-sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary-sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !emailOrUsername}
            className="flex items-center gap-xxs"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Send invitation
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-md py-sm">
        {error && (
          <div className="p-xs bg-error/10 border border-error text-error text-xs rounded-sm font-sans flex items-center gap-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-xs bg-success/10 border border-success text-success text-xs rounded-sm font-sans flex items-center gap-xs">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="flex flex-col gap-xs">
          <Label htmlFor="invite-target" className="text-body text-xs">
            Username or Email Address
          </Label>
          <div className="relative">
            <Input
              id="invite-target"
              type="text"
              placeholder="e.g. appi or member@example.com"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={isSubmitting || !!success}
              className="pl-lg"
              required
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-body">
              {emailOrUsername.includes("@") ? (
                <Mail className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="invite-role" className="text-body text-xs">
            Organization Role
          </Label>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isSubmitting || !!success}
          >
            <option value="MEMBER">Member (Can view repos and teams)</option>
            <option value="OWNER">Owner (Full administrative access)</option>
            <option value="BILLING_MANAGER">Billing Manager (Manage invoices & plans)</option>
          </Select>
        </div>
      </form>
    </Modal>
  );
}
