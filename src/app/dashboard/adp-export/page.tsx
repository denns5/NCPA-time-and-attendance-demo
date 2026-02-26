"use client";

import { useEffect, useState, useCallback } from "react";
import { useRole } from "@/context/role-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";

type ExportRow = {
  employeeName: string;
  adpFileNumber: string;
  earnCode: string;
  internalCode: string;
  hours: number;
  costCenter: string;
};

type ExportData = {
  payPeriods: Array<{ start: string; end: string; label: string }>;
  codeMapping: Record<string, string>;
  preview?: {
    rows: ExportRow[];
    totalHours: number;
    hoursByCode: Array<{ code: string; hours: number }>;
    employeeCount: number;
    timesheetCount: number;
  };
  validation?: {
    allApproved: boolean;
    totalTimesheets: number;
    approvedCount: number;
    notSubmitted: number;
    totalEmployees: number;
  };
  lastExport?: { date: string; details: string } | null;
};

export default function ADPExportPage() {
  const { employeeId } = useRole();
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPP, setSelectedPP] = useState<{ start: string; end: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(
    async (ppStart?: string, ppEnd?: string) => {
      setLoading(true);
      setMessage(null);
      try {
        const params = new URLSearchParams();
        if (ppStart) params.set("ppStart", ppStart);
        if (ppEnd) params.set("ppEnd", ppEnd);
        const res = await fetch(`/api/adp-export?${params}`);
        const json: ExportData = await res.json();
        setData(json);
        if (!selectedPP && json.payPeriods?.length > 0) {
          const defaultPP = json.payPeriods[Math.min(2, json.payPeriods.length - 1)];
          setSelectedPP({ start: defaultPP.start, end: defaultPP.end });
        }
      } catch {
        console.error("Failed to load export data");
      } finally {
        setLoading(false);
      }
    },
    [selectedPP]
  );

  useEffect(() => {
    if (selectedPP) {
      fetchData(selectedPP.start, selectedPP.end);
    } else {
      fetchData();
    }
  }, [selectedPP]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePPChange = (value: string) => {
    const [start, end] = value.split("|");
    setSelectedPP({ start, end });
  };

  const handleExport = async () => {
    if (!selectedPP || !data?.preview) return;
    setExporting(true);

    try {
      // Call API to mark as processed
      const res = await fetch("/api/adp-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "export",
          ppStart: selectedPP.start,
          ppEnd: selectedPP.end,
          adminId: employeeId,
        }),
      });
      const result = await res.json();

      if (result.success) {
        // Generate CSV on client side
        const csvRows = [
          ["Employee", "ADP File#", "Earn Code", "Hours", "Cost Center"].join(","),
          ...data.preview.rows.map((r) =>
            [r.employeeName, r.adpFileNumber, r.earnCode, r.hours, r.costCenter].join(",")
          ),
        ];
        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ADP_Export_${selectedPP.start}_to_${selectedPP.end}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setMessage({ type: "success", text: `Exported ${result.processedCount} timesheets and generated CSV.` });
        fetchData(selectedPP.start, selectedPP.end);
      } else {
        setMessage({ type: "error", text: result.error || "Export failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-destructive">Failed to load export data.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">ADP Export</h1>
          <p className="text-muted-foreground text-sm">
            Preview and export timesheet data for ADP payroll processing.
          </p>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
          message.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      {/* Pay Period Selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Pay Period:</label>
        <select
          className="text-sm border rounded-md px-3 py-2"
          value={selectedPP ? `${selectedPP.start}|${selectedPP.end}` : ""}
          onChange={(e) => handlePPChange(e.target.value)}
        >
          {data.payPeriods.map((pp) => (
            <option key={pp.start} value={`${pp.start}|${pp.end}`}>{pp.label}</option>
          ))}
        </select>
        {data.lastExport && (
          <span className="text-xs text-muted-foreground">
            Last export: {new Date(data.lastExport.date).toLocaleString()}
          </span>
        )}
      </div>

      {/* Code Mapping Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ADP Earn Code Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(data.codeMapping).map(([internal, adp]) => (
              <div key={internal} className="flex items-center gap-1 text-xs">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{internal}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono font-medium">{adp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation */}
      {data.validation && (
        <Card className={data.validation.allApproved ? "border-green-200" : "border-amber-200"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              {data.validation.allApproved ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {data.validation.allApproved
                    ? "All timesheets approved — ready to export"
                    : "Not all timesheets are approved"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.validation.approvedCount} of {data.validation.totalTimesheets} timesheets approved
                  {data.validation.notSubmitted > 0 && ` · ${data.validation.notSubmitted} employees have not submitted`}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{data.preview?.employeeCount || 0} employees</Badge>
                <Badge variant="secondary">{data.preview?.totalHours || 0} hours</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {data.preview && data.preview.rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Export Preview</CardTitle>
              <Button
                onClick={handleExport}
                disabled={exporting || !data.validation?.allApproved}
              >
                <Download className="h-4 w-4 mr-1" />
                {exporting ? "Generating..." : "Generate CSV"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-2 px-3 text-left font-medium">Employee</th>
                    <th className="py-2 px-3 text-left font-medium">ADP File #</th>
                    <th className="py-2 px-3 text-left font-medium">Earn Code</th>
                    <th className="py-2 px-3 text-right font-medium">Hours</th>
                    <th className="py-2 px-3 text-left font-medium">Cost Center</th>
                  </tr>
                </thead>
                <tbody>
                  {data.preview.rows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 px-3 font-medium">{row.employeeName}</td>
                      <td className="py-1.5 px-3 font-mono text-xs">{row.adpFileNumber}</td>
                      <td className="py-1.5 px-3">
                        <Badge variant="outline" className="text-xs font-mono">{row.earnCode}</Badge>
                      </td>
                      <td className="py-1.5 px-3 text-right">{row.hours}</td>
                      <td className="py-1.5 px-3 font-mono text-xs text-muted-foreground">{row.costCenter}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={3} className="py-2 px-3 font-medium">Total</td>
                    <td className="py-2 px-3 text-right font-bold">{data.preview.totalHours}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Hours Summary by Code */}
            {data.preview.hoursByCode.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Summary by Earn Code</p>
                <div className="flex flex-wrap gap-3">
                  {data.preview.hoursByCode.map((item) => (
                    <div key={item.code} className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono font-medium">{item.code}</span>
                      <span className="text-muted-foreground">{item.hours}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.preview && data.preview.rows.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Data to Export</p>
            <p className="text-sm">No approved timesheets found for this pay period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
