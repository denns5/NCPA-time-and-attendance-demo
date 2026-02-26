import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SchedulingPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Scheduling</h1>
      <p className="text-muted-foreground mb-6">Manage shift schedules, assign coverage, and handle shift swaps.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarClock className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Full team schedule grid, coverage assignment, minimum staffing validation, and shift swap management.</p>
        </CardContent>
      </Card>
    </div>
  );
}
