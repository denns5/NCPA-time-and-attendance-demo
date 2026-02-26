import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { payRules } from "@/db/schema";

export async function GET() {
  const rules = await db.select().from(payRules);

  // Compute summary counts
  const heaCount = rules.filter((r) => r.employeeGroup.toLowerCase().includes("hea")).length;
  const ibewCount = rules.filter((r) => r.employeeGroup.toLowerCase().includes("ibew")).length;
  const generalCount = rules.filter((r) => !r.employeeGroup.toLowerCase().includes("hea") && !r.employeeGroup.toLowerCase().includes("ibew")).length;

  // Get unique categories
  const categories = Array.from(new Set(rules.map((r) => r.category))).sort();
  const groups = Array.from(new Set(rules.map((r) => r.employeeGroup))).sort();

  return NextResponse.json({
    rules,
    summary: { total: rules.length, heaCount, ibewCount, generalCount },
    categories,
    groups,
  });
}
