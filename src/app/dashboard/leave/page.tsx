import { PalmtreeIcon as PlaneTakeoff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function LeavePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Leave Management</h1>
      <p className="text-muted-foreground mb-6">View balances, submit requests, and track leave history.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PlaneTakeoff className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Leave balances (vacation, sick, float, LBA, holiday bank), request form, and approval tracking.</p>
        </CardContent>
      </Card>
    </div>
  );
}
