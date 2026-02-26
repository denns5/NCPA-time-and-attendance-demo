"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LeaveBalanceDetail,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_COLORS,
  SHIFT_WORKER_ONLY_TYPES,
  LeaveType,
} from "@/lib/leave-types";
import {
  Palmtree,
  ThermometerSun,
  CalendarDays,
  Banknote,
  Gift,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const LEAVE_TYPE_ICONS: Record<LeaveType, React.ComponentType<{ className?: string }>> = {
  vacation: Palmtree,
  sick: ThermometerSun,
  float: CalendarDays,
  lba: Banknote,
  holiday_bank: Gift,
  comp: Clock,
};

interface LeaveBalancesProps {
  balances: LeaveBalanceDetail[];
  employeeType: string;
}

export function LeaveBalances({ balances, employeeType }: LeaveBalancesProps) {
  const isShift = employeeType === "ibew_1245";

  const filteredBalances = balances.filter(
    (b) => isShift || !SHIFT_WORKER_ONLY_TYPES.includes(b.leaveType)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredBalances.map((balance) => (
        <BalanceCard key={balance.leaveType} balance={balance} />
      ))}
    </div>
  );
}

function BalanceCard({ balance }: { balance: LeaveBalanceDetail }) {
  const [expanded, setExpanded] = useState(false);
  const colors = LEAVE_TYPE_COLORS[balance.leaveType];
  const Icon = LEAVE_TYPE_ICONS[balance.leaveType];
  const label = LEAVE_TYPE_LABELS[balance.leaveType];

  const nearCap = balance.percentOfCap !== null && balance.percentOfCap >= 80;
  const progressPercent = balance.percentOfCap ?? 0;

  return (
    <Card className={`${colors.border} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Icon className={`h-4 w-4 ${colors.text}`} />
            </div>
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
          </div>
          {nearCap && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs">
              Near Cap
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <span className="text-3xl font-bold">{balance.balanceHours}</span>
          <span className="text-sm text-muted-foreground ml-1">hours</span>
        </div>

        {/* Progress bar (only shown when there's a cap) */}
        {balance.capHours !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{balance.balanceHours}h used of {balance.capHours}h cap</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent >= 90
                    ? "bg-red-500"
                    : progressPercent >= 80
                    ? "bg-amber-500"
                    : colors.progress
                }`}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Projected EOY */}
        {balance.accrualRatePerPeriod > 0 && (
          <div className="text-xs text-muted-foreground">
            Projected EOY: <span className="font-medium">{balance.projectedBalance}h</span>
          </div>
        )}

        {/* Expandable YTD breakdown */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          YTD Breakdown
        </button>

        {expanded && (
          <div className={`text-xs space-y-1 p-3 rounded-lg ${colors.bg}`}>
            <div className="flex justify-between">
              <span>Beginning of Year</span>
              <span className="font-medium">{balance.boyBalance}h</span>
            </div>
            {balance.ytdAccrued > 0 && (
              <div className="flex justify-between text-green-600">
                <span>+ Accrued YTD</span>
                <span className="font-medium">+{balance.ytdAccrued}h</span>
              </div>
            )}
            {balance.ytdUsed > 0 && (
              <div className="flex justify-between text-red-600">
                <span>- Used YTD</span>
                <span className="font-medium">-{balance.ytdUsed}h</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1 font-medium">
              <span>= Current Balance</span>
              <span>{balance.balanceHours}h</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
