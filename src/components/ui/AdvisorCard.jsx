import React from "react";
import { Smile, Frown, Scale } from "lucide-react";
import GradientButton from "./GradientButton";
import { Link } from "react-router-dom";

const personas = {
  optimist: {
    name: "Olivia",
    subtitle: "The Optimist",
    icon: Smile,
    gradient: "from-emerald-500 to-teal-500",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
  },
  pessimist: {
    name: "Peter",
    subtitle: "The Pessimist",
    icon: Frown,
    gradient: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  realist: {
    name: "Rita",
    subtitle: "The Realist",
    icon: Scale,
    gradient: "from-blue-500 to-indigo-500",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
};

export default function AdvisorCard({ persona, summary, loading }) {
  const p = personas[persona];
  const Icon = p.icon;

  return (
    <div className={`bg-card border border-border rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <div className="font-heading font-semibold text-foreground text-sm">{p.name}</div>
          <div className="text-xs text-muted-foreground">{p.subtitle}</div>
        </div>
      </div>
      <div className="flex-1 mb-4">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded-full w-full animate-pulse" />
            <div className="h-3 bg-muted rounded-full w-4/5 animate-pulse" />
            <div className="h-3 bg-muted rounded-full w-3/5 animate-pulse" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
        )}
      </div>
      <Link to={`/perspectives?agent=${persona}`}>
        <GradientButton variant="secondary" size="sm" className="w-full">
          Ask {p.name} →
        </GradientButton>
      </Link>
    </div>
  );
}