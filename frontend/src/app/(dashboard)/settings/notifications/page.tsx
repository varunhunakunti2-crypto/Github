"use client";

import React, { useState, useEffect } from "react";
import { Mail, MessageSquare, Inbox, ShieldAlert, Check, Loader2 } from "lucide-react";

export default function NotificationsSettingsPage() {
  const [preference, setPreference] = useState<"IMMEDIATE" | "DAILY_DIGEST" | "OFF">("IMMEDIATE");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/user", {
          headers: { Authorization: token ? `Bearer ${token}` : "" }
        });
        if (res.ok) {
          const user = await res.json();
          if (user.notificationPreference) {
            setPreference(user.notificationPreference);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ notificationPreference: preference })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[600px] mx-auto p-md space-y-md text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        <span className="font-sans text-xs text-body">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="max-w-[600px] mx-auto p-md md:p-xl space-y-md">
      <div>
        <h1 className="font-sans text-xl font-bold text-ink">Notification Settings</h1>
        <p className="font-sans text-xs text-body">Configure how and when you receive transactional notifications</p>
      </div>

      <div className="bg-canvas-soft border border-hairline rounded-sm p-md space-y-md shadow-sm">
        <div className="space-y-sm">
          <label className="font-sans font-bold text-xs text-ink block">
            Email Notifications Frequency
          </label>
          <p className="font-sans text-xs text-body">
            Choose if and how often GitForge sends updates to your registered email address.
          </p>
        </div>

        <div className="space-y-xs">
          {[
            {
              value: "IMMEDIATE",
              label: "Immediate Email",
              desc: "Receive email messages as events happen (e.g. assignments, comments, code reviews)."
            },
            {
              value: "DAILY_DIGEST",
              label: "Daily Digest Summary",
              desc: "Get a once-a-day summary compiling all your notifications into a single report."
            },
            {
              value: "OFF",
              label: "Off (In-app only)",
              desc: "Do not send any emails. Access your notifications strictly within the web console bell."
            }
          ].map(opt => (
            <label
              key={opt.value}
              className={`p-sm rounded-sm border cursor-pointer flex items-start gap-sm transition-colors ${
                preference === opt.value
                  ? "border-accent bg-primary-soft/10 text-ink"
                  : "border-hairline hover:border-text-muted text-body hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="preference"
                checked={preference === opt.value}
                onChange={() => setPreference(opt.value as any)}
                className="mt-xxs accent-accent"
              />
              <div className="space-y-xxs">
                <span className="font-sans font-bold text-xs block">{opt.label}</span>
                <span className="font-sans text-xs text-body block">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-between items-center pt-sm border-t border-hairline">
          {saveSuccess ? (
            <span className="font-sans text-xs text-success flex items-center gap-xs font-semibold">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : (
            <span />
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="font-sans text-xs bg-primary hover:bg-primary-hover text-white font-semibold px-md py-xs rounded-sm transition-colors disabled:opacity-50 flex items-center gap-xs"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
