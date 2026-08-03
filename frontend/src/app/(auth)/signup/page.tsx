"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@gitforge/ui";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    global?: string;
  }>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!username) {
      newErrors.username = "Username is required";
    } else if (username.length < 3 || username.length > 39) {
      newErrors.username = "Username must be between 3 and 39 characters";
    } else if (!/^[a-zA-Z0-9-]+$/.test(username)) {
      newErrors.username = "Username can only contain alphanumeric characters and hyphens";
    }

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/v1/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error?.message || "Sign up failed. Please try again.");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setErrors({ global: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-canvas-soft border border-hairline rounded-lg p-lg w-full">
        <h2 className="font-sans text-[22px] font-medium tracking-[-0.4px] text-success mb-sm">
          Account Created
        </h2>
        <p className="font-sans text-[14px] text-body mb-md leading-[1.50]">
          A verification link has been sent to <span className="font-mono text-ink">{email}</span>. Please check your inbox and follow the link to activate your account.
        </p>
        <Link href="/login" className="inline-block w-full text-center text-[14px] font-medium text-primary hover:text-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary-focus rounded-xs">
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-canvas-soft border border-hairline rounded-lg p-lg w-full">
      <h1 className="font-sans text-[22px] font-medium tracking-[-0.4px] text-ink mb-lg">
        Create your account
      </h1>

      {errors.global && (
        <div className="mb-md p-sm bg-error/10 border border-error/30 text-error text-[14px] rounded-md font-sans">
          {errors.global}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <Label htmlFor="username" className="text-body font-sans text-[14px] font-medium">
            Username
          </Label>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={!!errors.username}
            placeholder="e.g. appi"
            disabled={isLoading}
            autoComplete="username"
          />
          {errors.username && (
            <span className="text-error text-[12px] mt-xxs font-sans">{errors.username}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="email" className="text-body font-sans text-[14px] font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!errors.email}
            placeholder="name@example.com"
            disabled={isLoading}
            autoComplete="email"
          />
          {errors.email && (
            <span className="text-error text-[12px] mt-xxs font-sans">{errors.email}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="password" className="text-body font-sans text-[14px] font-medium">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={!!errors.password}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.password && (
            <span className="text-error text-[12px] mt-xxs font-sans">{errors.password}</span>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <Label htmlFor="confirmPassword" className="text-body font-sans text-[14px] font-medium">
            Confirm Password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={!!errors.confirmPassword}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />
          {errors.confirmPassword && (
            <span className="text-error text-[12px] mt-xxs font-sans">{errors.confirmPassword}</span>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          variant="primary"
          className="w-full mt-xs"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="mt-lg text-left text-[14px] text-body">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:text-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary-focus rounded-xs"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
