"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@gitforge/ui";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFired = useRef(false);

  const [state, setState] = useState<"exchanging" | "error">("exchanging");
  const [errorMessage, setErrorMessage] = useState("");

  const code = searchParams.get("code");
  const provider = searchParams.get("provider") || "github";

  useEffect(() => {
    if (!code) {
      setState("error");
      setErrorMessage("Authorization code is missing from the callback parameters.");
      return;
    }

    if (hasFired.current) return;
    hasFired.current = true;

    const exchangeCode = async () => {
      try {
        const response = await fetch(`/api/v1/auth/oauth/${provider}/callback?code=${code}`, {
          method: "GET",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error?.message || `OAuth authentication with ${provider} failed.`);
        }

        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        router.push("/");
      } catch (err: any) {
        setState("error");
        setErrorMessage(err.message);
      }
    };

    exchangeCode();
  }, [code, provider, router]);

  return (
    <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Auth-Step: oauth-callback</div>
        <div>State: {state === "exchanging" ? "exchange-pending" : "error"}</div>
      </div>

      {state === "exchanging" && (
        <div className="text-left">
          <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">
            Connecting account
          </h1>
          <p className="font-sans text-body text-sm mb-md animate-pulse">
            Exchanging authorization code with {provider === "github" ? "GitHub" : "Google"}. Please wait...
          </p>
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {state === "error" && (
        <div className="text-left">
          <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight text-error">
            OAuth Error
          </h1>
          <p className="font-sans text-body text-sm mb-md">
            {errorMessage || "An unexpected error occurred during third-party authentication."}
          </p>
          <div className="flex flex-col gap-sm">
            <Link
              href="/login"
              className="inline-block w-full text-center text-sm font-medium bg-primary hover:bg-primary/90 text-white py-xs px-md rounded-sm transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: oauth-callback</div>
          <div>State: loading</div>
        </div>
        <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">Loading callback...</h1>
      </Card>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
