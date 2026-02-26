import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SchedulePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Schedule</h1>
      <p className="text-muted-foreground mb-6">View your shift schedule, coverage assignments, and upcoming changes.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Calendar className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Monthly calendar view with shift codes, coverage notes, and schedule modifications.</p>
        </CardContent>
      </Card>
    </div>
  );
}
