"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  AlertTriangle,
  Info,
  BellOff,
} from "lucide-react";

type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkTo: string | null;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  timesheet_submitted: Clock,
  timesheet_approved: CheckCircle,
  timesheet_rejected: XCircle,
  leave_request: CalendarDays,
  leave_approved: CheckCircle,
  leave_rejected: XCircle,
  schedule_change: CalendarDays,
  overtime_alert: AlertTriangle,
  system: Info,
};

const TYPE_COLORS: Record<string, string> = {
  timesheet_submitted: "text-blue-600",
  timesheet_approved: "text-green-600",
  timesheet_rejected: "text-red-600",
  leave_request: "text-blue-600",
  leave_approved: "text-green-600",
  leave_rejected: "text-red-600",
  schedule_change: "text-amber-600",
  overtime_alert: "text-orange-600",
  system: "text-gray-600",
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date("2024-07-15T12:00:00");
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const { employeeId } = useRole();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?userId=${employeeId}`);
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.notifications || []);
      setUnreadCount(json.unreadCount || 0);
    } catch {
      console.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markRead = async (id: number) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", notificationId: id }),
      });
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      console.error("Failed to mark notification as read");
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read", userId: employeeId }),
      });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      console.error("Failed to mark notifications as read");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            Stay updated on timesheet approvals, leave decisions, and schedule changes.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {unreadCount > 0 && (
        <Badge variant="secondary">{unreadCount} unread</Badge>
      )}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BellOff className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No notifications</p>
            <p className="text-sm">You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {items.map((notification) => {
            const Icon = TYPE_ICONS[notification.type] || Bell;
            const iconColor = TYPE_COLORS[notification.type] || "text-gray-600";

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.isRead ? "bg-blue-50/50 border-blue-100" : "border-transparent"
                }`}
                onClick={() => {
                  if (!notification.isRead) markRead(notification.id);
                  if (notification.linkTo) window.location.href = notification.linkTo;
                }}
              >
                <div className={`mt-0.5 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${!notification.isRead ? "font-semibold" : "font-medium"}`}>
                      {notification.title}
                    </span>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{notification.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                  {formatRelativeTime(notification.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
