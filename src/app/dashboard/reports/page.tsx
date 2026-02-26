import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-muted-foreground mb-6">Generate overtime, leave usage, staffing, compliance, and payroll cost reports.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Configurable reports by department, location, date range with export capabilities.</p>
        </CardContent>
      </Card>
    </div>
  );
}
