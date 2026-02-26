import { ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CompliancePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Compliance</h1>
      <p className="text-muted-foreground mb-6">Monitor FLSA compliance, meal/rest violations, and California labor law adherence.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Compliance dashboard with violation tracking, FLSA work period monitoring, and CA labor law checks.</p>
        </CardContent>
      </Card>
    </div>
  );
}
