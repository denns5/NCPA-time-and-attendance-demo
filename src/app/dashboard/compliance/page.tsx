"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight, Shield } from "lucide-react";

type ComplianceCheck = {
  name: string;
  category: string;
  status: "pass" | "warning" | "violation";
  count: number;
  details: Array<{ employee: string; date: string; description: string }>;
};

type ComplianceData = {
  checks: ComplianceCheck[];
  summary: { passed: number; warnings: number; violations: number; total: number };
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  pass: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Pass" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Warning" },
  violation: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Violation" },
};

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance");
      const json: ComplianceData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load compliance data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load compliance data.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            FLSA, California Labor Code, and operational compliance checks for July 2024.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{data.summary.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{data.summary.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700">{data.summary.violations}</p>
                <p className="text-xs text-muted-foreground">Violations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check Cards */}
      <div className="space-y-3">
        {data.checks.map((check) => {
          const config = STATUS_CONFIG[check.status];
          const Icon = config.icon;
          const isExpanded = expandedCheck === check.name;

          return (
            <Card key={check.name} className={check.status !== "pass" ? config.bg : ""}>
              <CardHeader
                className="pb-2 cursor-pointer"
                onClick={() => setExpandedCheck(isExpanded ? null : check.name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${config.color}`} />
                    <div>
                      <CardTitle className="text-sm">{check.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{check.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={check.status === "pass" ? "secondary" : "outline"} className={check.status !== "pass" ? `${config.color} border-current` : ""}>
                      {config.label}{check.count > 0 ? ` (${check.count})` : ""}
                    </Badge>
                    {check.details.length > 0 && (
                      isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && check.details.length > 0 && (
                <CardContent className="pt-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-1.5 text-left font-medium">Employee/Area</th>
                        <th className="py-1.5 text-left font-medium">Date</th>
                        <th className="py-1.5 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {check.details.map((detail, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 font-medium">{detail.employee}</td>
                          <td className="py-1.5 text-muted-foreground whitespace-nowrap">{detail.date}</td>
                          <td className="py-1.5 text-muted-foreground">{detail.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
