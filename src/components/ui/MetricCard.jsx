import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function MetricCard({ label, value, delta, deltaLabel, icon: Icon }) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0 || delta === undefined;

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
            <Icon size={18} className="text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="text-2xl font-heading font-bold text-foreground mb-1">{value}</div>
      {!isNeutral && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={14} className="text-emerald-600" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span className={`text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
            {isPositive ? "+" : ""}{delta}%
          </span>
          {deltaLabel && <span className="text-xs text-muted-foreground">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}