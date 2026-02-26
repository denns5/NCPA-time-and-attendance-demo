import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuditLogPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Audit Log</h1>
      <p className="text-muted-foreground mb-6">Immutable record of all changes to timesheets, schedules, leave balances, and approvals.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ScrollText className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Filterable audit trail with user, action, entity, before/after values, and timestamps.</p>
        </CardContent>
      </Card>
    </div>
  );
}
