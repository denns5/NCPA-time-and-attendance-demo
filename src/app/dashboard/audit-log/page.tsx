"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, ChevronRight, Shield } from "lucide-react";

type AuditEntry = {
  id: number;
  userId: number | null;
  userName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
};

type AuditData = {
  entries: AuditEntry[];
  actions: string[];
  entityTypes: string[];
};

function formatAction(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function JsonDiff({ label, value, color }: { label: string; value: string | null; color: string }) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <div className={`text-xs p-2 rounded border ${color} space-y-0.5`}>
          {Object.entries(parsed).map(([key, val]) => (
            <div key={key} className="flex gap-2">
              <span className="font-medium">{key}:</span>
              <span>{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  } catch {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <p className="text-xs p-2 rounded border bg-muted">{value}</p>
      </div>
    );
  }
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-log");
      const json: AuditData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load audit log");
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
    return <div className="text-destructive">Failed to load audit log.</div>;
  }

  const filtered = data.entries.filter((e) => {
    const matchesAction = actionFilter === "all" || e.action === actionFilter;
    const matchesEntity = entityFilter === "all" || e.entityType === entityFilter;
    return matchesAction && matchesEntity;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted-foreground text-sm">
            Immutable record of all system changes and approvals.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-sm border rounded-md px-3 py-2"
        >
          <option value="all">All Actions</option>
          {data.actions.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="text-sm border rounded-md px-3 py-2"
        >
          <option value="all">All Entity Types</option>
          {data.entityTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Badge variant="secondary">{filtered.length} entries</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium w-8"></th>
                  <th className="py-2 px-3 text-left font-medium">Timestamp</th>
                  <th className="py-2 px-3 text-left font-medium">User</th>
                  <th className="py-2 px-3 text-left font-medium">Action</th>
                  <th className="py-2 px-3 text-left font-medium">Entity</th>
                  <th className="py-2 px-3 text-left font-medium">ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="py-2 px-3">
                        {expandedId === entry.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-medium">{entry.userName}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">
                          {formatAction(entry.action)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{entry.entityType}</td>
                      <td className="py-2 px-3 text-muted-foreground">{entry.entityId != null ? `#${entry.entityId}` : "—"}</td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={6} className="px-8 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <JsonDiff label="Previous Value" value={entry.oldValue} color="bg-red-50 border-red-200" />
                            <JsonDiff label="New Value" value={entry.newValue} color="bg-green-50 border-green-200" />
                          </div>
                          {!entry.oldValue && !entry.newValue && (
                            <p className="text-xs text-muted-foreground">No detailed change data recorded.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No audit log entries match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
