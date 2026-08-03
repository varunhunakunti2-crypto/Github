"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@gitforge/ui";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasFired = useRef(false);

  const [state, setState] = useState<"pending" | "success" | "error">("pending");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("Verification token is missing from the link.");
      return;
    }

    if (hasFired.current) return;
    hasFired.current = true;

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error?.message || "Email verification failed. The link may have expired or is invalid.");
        }

        setState("success");
      } catch (err: any) {
        setState("error");
        setErrorMessage(err.message);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Auth-Step: verify-email</div>
        <div>
          State:{" "}
          {state === "pending"
            ? "pending"
            : state === "success"
            ? "verified"
            : "error-token"}
        </div>
      </div>

      {state === "pending" && (
        <div className="text-left">
          <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">
            Verifying your email
          </h1>
          <p className="font-sans text-body text-sm mb-md animate-pulse">
            Validating your account activation token. Please wait...
          </p>
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {state === "success" && (
        <div className="text-left">
          <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight text-success">
            Email Verified
          </h1>
          <p className="font-sans text-body text-sm mb-md">
            Thank you! Your email address has been successfully verified. You can now access your dashboard.
          </p>
          <Link
            href="/login"
            className="inline-block w-full text-center text-sm font-medium bg-primary hover:bg-primary/90 text-white py-sm px-md rounded-sm transition-colors focus:ring-2 focus:ring-primary-focus"
          >
            Continue to Sign In
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="text-left">
          <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight text-error">
            Verification Failed
          </h1>
          <p className="font-sans text-body text-sm mb-md">
            {errorMessage || "An unexpected error occurred during verification."}
          </p>
          <div className="flex flex-col gap-sm">
            <Link
              href="/signup"
              className="inline-block w-full text-center text-sm font-medium bg-border hover:bg-border/80 text-ink py-xs px-md rounded-sm transition-colors"
            >
              Sign Up Again
            </Link>
            <Link
              href="/login"
              className="inline-block w-full text-center text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: verify-email</div>
          <div>State: loading</div>
        </div>
        <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">Verifying...</h1>
      </Card>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
