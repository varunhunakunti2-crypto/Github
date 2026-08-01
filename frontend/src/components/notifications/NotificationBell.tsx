"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Inbox, ShieldAlert, Check, FileText, GitPullRequest, Building, MessageSquare, Loader2 } from "lucide-react";
import { io, Socket } from "socket.io-client";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch initial notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/notifications", {
        headers: { Authorization: token ? `Bearer ${token}` : "" }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.slice(0, 5)); // display top 5 in preview
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch (e) {
      console.warn("Failed to fetch initial notifications", e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Setup WebSocket connection
    const token = localStorage.getItem("access_token");
    if (!token) return;

    // Connect to NestJS WebSocket Gateway (port 3001)
    const socket = io("http://localhost:3001", {
      query: { token },
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("WebSocket connected to notifications gateway");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("WebSocket disconnected from notifications gateway");
    });

    socket.on("notification", (notification: any) => {
      console.log("New real-time notification received", notification);
      // Prepend new notification to preview list
      setNotifications(prev => [notification, ...prev].slice(0, 5));
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/notifications/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ isRead: true })
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn("Failed to mark notification as read", err);
    }
  };

  const handleNotificationClick = async (n: any) => {
    setIsOpen(false);
    if (!n.isRead) {
      // Mark as read in background
      try {
        const token = localStorage.getItem("access_token");
        await fetch(`/api/v1/notifications/${n.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ isRead: true })
        });
      } catch (err) {
        console.warn(err);
      }
    }
    // Refresh navbar unread badge
    fetchNotifications();
    router.push(n.url);
  };

  const getReasonIcon = (reason: string) => {
    switch (reason.toUpperCase()) {
      case "ASSIGN":
        return <Inbox className="w-3.5 h-3.5 text-accent" />;
      case "MENTION":
        return <MessageSquare className="w-3.5 h-3.5 text-success" />;
      case "REVIEW_REQUESTED":
        return <GitPullRequest className="w-3.5 h-3.5 text-warning" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-xs rounded-full hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary transition-colors focus-visible:outline focus-visible:outline-accent"
        aria-label="Open notifications menu"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-xxs right-xxs flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white font-mono animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Real-time Connection Indicator */}
      {isConnected && (
        <span className="absolute bottom-[2px] right-[2px] w-2 h-2 bg-success rounded-full border border-canvas" title="Live updates active" />
      )}

      {/* Preview Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-xs w-[320px] bg-surface border border-border shadow-xl rounded-sm z-50 overflow-hidden flex flex-col">
          <div className="p-sm border-b border-hairline flex justify-between items-center bg-canvas-soft">
            <span className="font-space-grotesk text-xs font-bold text-text-primary">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono text-text-muted">
                {unreadCount} unread
              </span>
            )}
          </div>

          <div className="max-h-[280px] overflow-y-auto divide-y divide-hairline">
            {notifications.length === 0 ? (
              <div className="p-xl text-center flex flex-col items-center gap-xs text-text-muted font-inter text-xs">
                <Bell className="w-6 h-6 text-text-muted opacity-50" />
                <span>You're all caught up!</span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-sm flex gap-xs cursor-pointer hover:bg-canvas-soft transition-colors ${
                    !n.isRead ? "bg-accent-soft/20 border-l-2 border-accent" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-canvas border border-hairline flex items-center justify-center shrink-0 mt-xxs">
                    {getReasonIcon(n.reason)}
                  </div>

                  <div className="flex-1 flex flex-col gap-xxs min-w-0">
                    <span className="font-sans font-semibold text-[11px] text-text-primary truncate">
                      {n.title}
                    </span>
                    <span className="font-inter text-[10px] text-text-muted line-clamp-2">
                      {n.body}
                    </span>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-xxs rounded-xs hover:bg-canvas-soft-2 text-text-muted hover:text-text-primary self-start mt-xxs shrink-0"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          <Link
            href="/notifications"
            className="p-xs text-center font-sans text-xs text-accent hover:underline border-t border-hairline bg-canvas-soft font-semibold block"
            onClick={() => setIsOpen(false)}
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
