"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2, Building, ShieldCheck } from "lucide-react";
import { Card, Button } from "@gitforge/ui";

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [invite, setInvite] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchInvite = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/invitations/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Invalid or expired invitation link.");
      }
      const data = await res.json();
      setInvite(data);
      if (data.isExpired) {
        setError("This invitation link has expired.");
      } else if (data.status !== "PENDING") {
        setError(`This invitation has already been ${data.status.toLowerCase()}.`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleAccept = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const userToken = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/invitations/${token}/accept`, {
        method: "POST",
        headers: {
          Authorization: userToken ? `Bearer ${userToken}` : "",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to accept invitation.");
      }

      const data = await res.json();
      setSuccessMessage("Invitation accepted! Redirecting to organization...");
      setTimeout(() => {
        router.push(`/orgs/${data.orgSlug || invite.orgSlug}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const userToken = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/invitations/${token}/decline`, {
        method: "POST",
        headers: {
          Authorization: userToken ? `Bearer ${userToken}` : "",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to decline invitation.");
      }

      setSuccessMessage("Invitation declined. Redirecting to home...");
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-xs font-sans text-body">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span>Validating invitation...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[500px] mx-auto py-4xl px-lg">
      <Card className="bg-canvas-soft border-hairline text-ink p-xl rounded-sm shadow-none flex flex-col gap-lg items-center text-center">
        <div className="w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center text-primary">
          <Mail className="w-6 h-6" />
        </div>

        {error ? (
          <div className="flex flex-col gap-sm items-center">
            <XCircle className="w-8 h-8 text-error" />
            <h1 className="font-sans text-xl font-bold tracking-tight">
              Invitation Error
            </h1>
            <p className="font-sans text-body text-xs leading-relaxed max-w-[340px]">
              {error}
            </p>
            <div className="mt-md">
              <Button variant="secondary" onClick={() => router.push("/")}>
                Go to Homepage
              </Button>
            </div>
          </div>
        ) : successMessage ? (
          <div className="flex flex-col gap-sm items-center py-md">
            <CheckCircle className="w-8 h-8 text-success" />
            <h2 className="font-sans text-md font-bold tracking-tight">
              {successMessage}
            </h2>
          </div>
        ) : (
          <div className="flex flex-col gap-md w-full">
            <div>
              <h1 className="font-sans text-xl font-bold tracking-tight">
                Join {invite.orgName}
              </h1>
              <p className="font-sans text-body text-xs mt-xs">
                @{invite.invitedBy} has invited you to join the organization as a{" "}
                <strong className="text-ink">{invite.role.toLowerCase()}</strong>.
              </p>
            </div>

            <div className="bg-canvas border border-hairline p-md rounded-sm text-left flex items-start gap-md mt-sm">
              <Building className="w-6 h-6 text-primary shrink-0 mt-xxs" />
              <div className="flex flex-col">
                <span className="font-sans font-bold text-sm text-ink">
                  {invite.orgName}
                </span>
                <span className="font-sans text-xs text-body">
                  gitforge.dev/orgs/{invite.orgSlug}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-xs mt-md w-full">
              <Button
                variant="secondary"
                onClick={handleDecline}
                className="w-full font-semibold border-error/35 hover:bg-error/5 hover:text-error"
                disabled={isProcessing}
              >
                Decline
              </Button>
              <Button
                variant="primary"
                onClick={handleAccept}
                className="w-full font-semibold flex items-center gap-xxs"
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Accept & Join
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
