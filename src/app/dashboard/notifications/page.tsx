import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Notifications</h1>
      <p className="text-muted-foreground mb-6">Stay updated on timesheet approvals, leave decisions, and schedule changes.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Real-time notifications with read/unread status and direct links to relevant items.</p>
        </CardContent>
      </Card>
    </div>
  );
}
