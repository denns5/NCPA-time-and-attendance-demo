"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";

type PayRule = {
  id: number;
  ruleId: string;
  category: string;
  description: string;
  employeeGroup: string;
  scheduleType: string | null;
  triggerCondition: string;
  calculation: string;
  dependencies: string | null;
  isActive: boolean;
};

type PayRulesData = {
  rules: PayRule[];
  summary: { total: number; heaCount: number; ibewCount: number; generalCount: number };
  categories: string[];
  groups: string[];
};

export default function PayRulesPage() {
  const [data, setData] = useState<PayRulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pay-rules");
      const json: PayRulesData = await res.json();
      setData(json);
    } catch {
      console.error("Failed to load pay rules");
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
    return <div className="text-destructive">Failed to load pay rules.</div>;
  }

  // Client-side filtering
  const filtered = data.rules.filter((rule) => {
    const matchesSearch =
      !search ||
      rule.ruleId.toLowerCase().includes(search.toLowerCase()) ||
      rule.description.toLowerCase().includes(search.toLowerCase()) ||
      rule.triggerCondition.toLowerCase().includes(search.toLowerCase()) ||
      rule.calculation.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
    const matchesGroup = groupFilter === "all" || rule.employeeGroup === groupFilter;
    return matchesSearch && matchesCategory && matchesGroup;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pay Rules Engine</h1>
        <p className="text-muted-foreground text-sm">
          Browse and search all {data.summary.total} business rules governing pay calculations.
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="secondary">{data.summary.total} Total Rules</Badge>
        <Badge variant="outline">HEA: {data.summary.heaCount}</Badge>
        <Badge variant="outline">IBEW: {data.summary.ibewCount}</Badge>
        <Badge variant="outline">General: {data.summary.generalCount}</Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border rounded-md"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border rounded-md px-3 py-2"
            >
              <option value="all">All Categories</option>
              {data.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="text-sm border rounded-md px-3 py-2"
            >
              <option value="all">All Groups</option>
              {data.groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filtered.length} of {data.summary.total} rules
          </p>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 text-left font-medium w-8"></th>
                  <th className="py-2 px-3 text-left font-medium">Rule ID</th>
                  <th className="py-2 px-3 text-left font-medium">Category</th>
                  <th className="py-2 px-3 text-left font-medium">Description</th>
                  <th className="py-2 px-3 text-left font-medium">Group</th>
                  <th className="py-2 px-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rule) => (
                  <Fragment key={rule.id}>
                    <tr
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                    >
                      <td className="py-2 px-3">
                        {expandedId === rule.id ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{rule.ruleId}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                      </td>
                      <td className="py-2 px-3 max-w-md truncate">{rule.description}</td>
                      <td className="py-2 px-3 text-muted-foreground">{rule.employeeGroup}</td>
                      <td className="py-2 px-3">
                        <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                          {rule.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                    {expandedId === rule.id && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={6} className="px-8 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Trigger Condition</p>
                              <p className="bg-white p-2 rounded border text-xs">{rule.triggerCondition}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Calculation</p>
                              <p className="bg-white p-2 rounded border text-xs">{rule.calculation}</p>
                            </div>
                            {rule.scheduleType && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Schedule Type</p>
                                <p className="text-xs">{rule.scheduleType}</p>
                              </div>
                            )}
                            {rule.dependencies && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Dependencies</p>
                                <p className="text-xs">{rule.dependencies}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
