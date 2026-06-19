import React from "react";
import { CheckCircle2, Loader2, Circle, AlertTriangle } from "lucide-react";

const statusConfig = {
  pending: { icon: Circle, color: "text-muted-foreground", bg: "bg-muted", label: "Pending" },
  running: { icon: Loader2, color: "text-purple-600", bg: "bg-purple-100", label: "Running", animate: true },
  done: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100", label: "Complete" },
  error: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-100", label: "Error" },
};

export default function AgentTrace({ steps }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const config = statusConfig[step.status] || statusConfig.pending;
        const Icon = config.icon;
        const isLast = i === steps.length - 1;

        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={`${config.color} ${config.animate ? "animate-spin" : ""}`} />
              </div>
              {!isLast && <div className="w-px h-full bg-border min-h-[32px]" />}
            </div>
            <div className={`pb-5 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-foreground">{step.name}</span>
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${config.color}`}>
                  {config.label}
                </span>
              </div>
              {step.output && (
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md">{step.output}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}