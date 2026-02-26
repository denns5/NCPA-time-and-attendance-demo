import { DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PayPeriodPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Pay Period Management</h1>
      <p className="text-muted-foreground mb-6">Track pay period status, process timesheets, and manage payroll cycles.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <DollarSign className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Pay period overview, timesheet completion tracking, and processing workflow.</p>
        </CardContent>
      </Card>
    </div>
  );
}
