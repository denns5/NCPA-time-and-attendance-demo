import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TimesheetPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Timesheet</h1>
      <p className="text-muted-foreground mb-6">View and submit your timesheet for the current pay period.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Timesheet entry with auto-populated schedule data, pay code selection, and submission workflow.</p>
        </CardContent>
      </Card>
    </div>
  );
}
