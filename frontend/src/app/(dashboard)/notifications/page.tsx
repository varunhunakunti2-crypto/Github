"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, BellOff, Bell, Inbox, AlertCircle, RefreshCw, MessageSquare, GitPullRequest, ArrowLeft } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "participating" | "mentions">("unread");
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/notifications", {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ isRead })
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead } : n))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/notifications/read", {
        method: "PUT",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMute = async (id: string, isUnsubscribed: boolean) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/notifications/${id}/subscription`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ isUnsubscribed })
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, isUnsubscribed } : n
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      await handleMarkRead(n.id, true);
    }
    router.push(n.url);
  };

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "mentions") return n.reason.toUpperCase() === "MENTION";
    if (activeTab === "participating") return n.reason.toUpperCase() === "ASSIGN" || n.reason.toUpperCase() === "REVIEW_REQUESTED";
    return true;
  });

  const getReasonColor = (reason: string) => {
    switch (reason.toUpperCase()) {
      case "ASSIGN":
        return "bg-primary-soft text-primary border border-accent/20";
      case "MENTION":
        return "bg-success-soft text-success border border-success/20";
      case "REVIEW_REQUESTED":
        return "bg-warning-soft text-warning border border-warning/20";
      default:
        return "bg-canvas-soft text-body border border-hairline";
    }
  };

  const getReasonIcon = (reason: string) => {
    switch (reason.toUpperCase()) {
      case "ASSIGN":
        return <Inbox className="w-4 h-4" />;
      case "MENTION":
        return <MessageSquare className="w-4 h-4" />;
      case "REVIEW_REQUESTED":
        return <GitPullRequest className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto p-md md:p-xl space-y-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm border-b border-hairline pb-sm">
        <div className="flex items-center gap-sm">
          <button
            onClick={() => router.back()}
            className="p-xs rounded-full hover:bg-canvas-soft-2 text-body hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-sans text-xl font-bold text-ink">Notifications Inbox</h1>
            <p className="font-sans text-xs text-body">Manage mentions, pull request review requests, and subscriptions</p>
          </div>
        </div>

        <div className="flex gap-xs">
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-xs font-sans text-xs bg-canvas hover:bg-canvas-soft border border-hairline px-sm py-xs rounded-sm text-ink hover:text-ink transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.isRead).length === 0}
            className="flex items-center gap-xs font-sans text-xs bg-canvas hover:bg-canvas-soft border border-hairline px-sm py-xs rounded-sm text-ink hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline gap-sm overflow-x-auto scrollbar-none">
        {(["unread", "all", "participating", "mentions"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`font-sans text-xs font-semibold px-sm py-xs border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-accent text-primary"
                : "border-transparent text-body hover:text-ink"
            }`}
          >
            {tab}
            <span className="ml-xs bg-canvas-soft-2 px-xxs py-[2px] rounded-xs font-mono text-[10px] text-body border border-hairline">
              {notifications.filter(n => {
                if (tab === "unread") return !n.isRead;
                if (tab === "mentions") return n.reason.toUpperCase() === "MENTION";
                if (tab === "participating") return n.reason.toUpperCase() === "ASSIGN" || n.reason.toUpperCase() === "REVIEW_REQUESTED";
                return true;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* Inbox List */}
      <div className="bg-canvas-soft border border-hairline rounded-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-xl text-center flex flex-col items-center justify-center gap-xs text-body font-sans text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span>Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-xl text-center flex flex-col items-center justify-center gap-sm bg-canvas-soft/30 min-h-[300px]">
            <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center border border-hairline shadow-inner">
              <Check className="w-6 h-6 text-success" />
            </div>
            <h3 className="font-sans font-bold text-ink text-sm mt-xs">You're all caught up!</h3>
            <p className="font-sans text-xs text-body max-w-[320px]">
              No {activeTab !== "all" ? `${activeTab} ` : ""}notifications to display. Check back later or adjust filters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {filteredNotifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-sm md:p-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-xs cursor-pointer hover:bg-canvas-soft transition-colors ${
                  !n.isRead ? "bg-primary-soft/10 border-l-2 border-accent" : ""
                }`}
              >
                <div className="flex gap-xs items-start min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full bg-canvas border border-hairline flex items-center justify-center mt-xxs shrink-0">
                    {getReasonIcon(n.reason)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-xxs">
                    <div className="flex items-center gap-xs flex-wrap">
                      <span className="font-sans font-semibold text-[10px] text-body hover:underline">
                        {n.repository.name}
                      </span>
                      <span className={`text-[9px] font-mono font-semibold px-xxs py-[1px] rounded-xs ${getReasonColor(n.reason)}`}>
                        {n.reason.toLowerCase().replace("_", " ")}
                      </span>
                      {n.isUnsubscribed && (
                        <span className="text-[9px] font-mono font-semibold px-xxs py-[1px] rounded-xs bg-error-soft text-error border border-error/20">
                          muted
                        </span>
                      )}
                    </div>
                    <h4 className="font-sans font-bold text-xs text-ink line-clamp-1">
                      {n.title}
                    </h4>
                    <p className="font-sans text-xs text-body line-clamp-2">
                      {n.body}
                    </p>
                  </div>
                </div>

                {/* Inline Actions */}
                <div className="flex gap-xs items-center shrink-0 self-end sm:self-center pt-xs sm:pt-0 pl-10 sm:pl-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(n.id, !n.isRead);
                    }}
                    className="p-xs rounded-xs hover:bg-canvas-soft-2 text-body hover:text-ink transition-colors"
                    title={n.isRead ? "Mark as unread" : "Mark as read"}
                  >
                    <Check className={`w-4 h-4 ${n.isRead ? "text-body" : "text-success font-bold"}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMute(n.id, !n.isUnsubscribed);
                    }}
                    className={`p-xs rounded-xs hover:bg-canvas-soft-2 transition-colors ${
                      n.isUnsubscribed ? "text-error hover:text-error-hover" : "text-body hover:text-ink"
                    }`}
                    title={n.isUnsubscribed ? "Unmute thread" : "Mute thread"}
                  >
                    <BellOff className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    className="p-xs rounded-xs hover:bg-canvas-soft-2 text-body hover:text-error transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
