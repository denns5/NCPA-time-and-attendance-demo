import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function TeamPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Team Dashboard</h1>
      <p className="text-muted-foreground mb-6">Overview of your team&apos;s status, attendance, and OT tracking.</p>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Coming Soon</p>
          <p className="text-sm">Team roster, current shift status, OT tracking, and leave calendar overview.</p>
        </CardContent>
      </Card>
    </div>
  );
}
