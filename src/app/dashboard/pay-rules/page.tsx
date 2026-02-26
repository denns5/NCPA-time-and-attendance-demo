import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PayRulesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Pay Rules Engine</h1>
      <p className="text-muted-foreground mb-6">View and manage all pay calculation rules, OT policies, and leave accrual configurations.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">133 pay rules across HEA, IBEW, audit, payroll, and compliance categories with dependency tracking.</p>
        </CardContent>
      </Card>
    </div>
  );
}
