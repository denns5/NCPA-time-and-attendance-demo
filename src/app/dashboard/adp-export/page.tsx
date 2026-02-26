import { FileOutput } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdpExportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">ADP Export</h1>
      <p className="text-muted-foreground mb-6">Generate and export payroll data to ADP with pay code mapping and validation.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileOutput className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">ADP export with pay code mapping, pre-export validation, CSV generation, and export audit trail.</p>
        </CardContent>
      </Card>
    </div>
  );
}
