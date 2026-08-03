"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Button, Input, Label } from "@gitforge/ui";

function TwoFactorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [backupCode, setBackupCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isBackupMode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isBackupMode]);

  const getChallengeToken = () => {
    return (
      searchParams.get("challenge_token") ||
      (typeof window !== "undefined" ? sessionStorage.getItem("challenge_token") : null) ||
      ""
    );
  };

  const handleCodeChange = (element: HTMLInputElement, index: number) => {
    const value = element.value;
    if (isNaN(Number(value))) return;

    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1);
    setCode(newCode);

    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((char) => char !== "")) {
      handleSubmitCode(newCode.join(""));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newCode = [...code];
      if (!code[index] && index > 0 && inputRefs.current[index - 1]) {
        newCode[index - 1] = "";
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    if (pasteData.length === 6 && /^\d+$/.test(pasteData)) {
      const newCode = pasteData.split("");
      setCode(newCode);
      handleSubmitCode(pasteData);
    }
  };

  const handleSubmitCode = async (codeStr: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setError("");

    const challenge_token = getChallengeToken();

    try {
      const response = await fetch("/api/v1/auth/2fa/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: codeStr, challenge_token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Invalid two-factor authentication code.");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      sessionStorage.removeItem("challenge_token");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupCode || isLoading) return;

    setIsLoading(true);
    setError("");

    const challenge_token = getChallengeToken();

    try {
      const response = await fetch("/api/v1/auth/2fa/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backup_code: backupCode, challenge_token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Invalid backup code.");
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      sessionStorage.removeItem("challenge_token");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
      <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
        <div>Auth-Step: two-factor</div>
        <div>State: challenge-pending</div>
      </div>

      <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">
        Two-factor verification
      </h1>

      <p className="font-sans text-body text-sm mb-md">
        {isBackupMode
          ? "Enter one of the recovery backup codes generated during 2FA setup."
          : "Enter the verification code from your authenticator app."}
      </p>

      {error && (
        <div className="mb-md p-sm bg-error/10 border border-error text-error text-sm rounded-sm font-sans">
          {error}
        </div>
      )}

      {!isBackupMode ? (
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <Label className="text-body font-sans mb-xs">
              Verification Code
            </Label>
            <div className="flex justify-between gap-xs">
              {code.map((char, index) => (
                <input
                  key={index}
                  type="text"
                  pattern="\d*"
                  maxLength={1}
                  value={char}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  onChange={(e) => handleCodeChange(e.target, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={handlePaste}
                  disabled={isLoading}
                  className="w-12 h-14 bg-canvas-soft-2 border border-hairline text-ink text-center font-jetbrains-mono text-xl focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm outline-none transition-colors"
                />
              ))}
            </div>
          </div>

          <div className="mt-md text-left text-sm">
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsBackupMode(true);
              }}
              className="text-primary hover:underline focus:outline-none focus:ring-1 focus:ring-primary-focus rounded-sm"
            >
              Use a backup code
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitBackup} className="flex flex-col gap-md" noValidate>
          <div className="flex flex-col gap-xs">
            <Label htmlFor="backupCode" className="text-body font-sans">
              Backup Recovery Code
            </Label>
            <Input
              id="backupCode"
              type="text"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              className="bg-canvas-soft-2 border-hairline text-ink placeholder:text-body/40 focus:border-accent focus:ring-1 focus:ring-primary-focus rounded-sm font-jetbrains-mono"
              error={!!error}
              placeholder="e.g. 12345-67890"
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !backupCode}
            className="bg-primary hover:bg-primary/90 text-white w-full rounded-sm font-sans font-semibold py-sm transition-colors focus:ring-2 focus:ring-primary-focus"
          >
            {isLoading ? "Verifying..." : "Verify backup code"}
          </Button>

          <div className="mt-md text-left text-sm">
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsBackupMode(false);
              }}
              className="text-primary hover:underline focus:outline-none"
            >
              Use authenticator app code
            </button>
          </div>
        </form>
      )}

      <div className="mt-lg border-t border-hairline pt-md text-left text-sm text-body">
        <Link
          href="/login"
          className="text-body hover:text-ink hover:underline focus:outline-none"
        >
          Cancel sign in
        </Link>
      </div>
    </Card>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <Card className="bg-canvas-soft border-hairline text-ink p-lg rounded-sm shadow-none">
        <div className="mb-md font-mono text-[12px] text-body border border-hairline bg-canvas-soft-2 p-xs rounded-sm">
          <div>Auth-Step: two-factor</div>
          <div>State: loading</div>
        </div>
        <h1 className="font-sans text-3xl font-bold mb-sm tracking-tight">Loading two-factor...</h1>
      </Card>
    }>
      <TwoFactorContent />
    </Suspense>
  );
}
