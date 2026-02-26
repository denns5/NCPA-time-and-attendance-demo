"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Role } from "@/context/role-context";
import { LucideIcon } from "lucide-react";

interface RoleCardProps {
  role: Role;
  title: string;
  description: string;
  capabilities: string[];
  icon: LucideIcon;
  onSelect: (role: Role) => void;
}

export function RoleCard({ role, title, description, capabilities, icon: Icon, onSelect }: RoleCardProps) {
  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onSelect(role)}>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="space-y-1.5 text-sm text-muted-foreground mb-6 flex-1">
          {capabilities.map((cap, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-xs">&#9679;</span>
              {cap}
            </li>
          ))}
        </ul>
        <Button className="w-full" onClick={(e) => { e.stopPropagation(); onSelect(role); }}>
          Enter as {title}
        </Button>
      </CardContent>
    </Card>
  );
}
