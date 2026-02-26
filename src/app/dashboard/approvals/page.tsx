import { CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ApprovalsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Approvals</h1>
      <p className="text-muted-foreground mb-6">Review and approve or reject timesheets and leave requests from your team.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Pending timesheets and leave requests with approve/reject actions and notes.</p>
        </CardContent>
      </Card>
    </div>
  );
}
