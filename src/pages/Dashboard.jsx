const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { DollarSign, TrendingDown, BarChart3, Users, ShieldAlert, Activity } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import TopBar from "@/components/layout/TopBar";
import MetricCard from "@/components/ui/MetricCard";
import AdvisorCard from "@/components/ui/AdvisorCard";
import GradientButton from "@/components/ui/GradientButton";

export default function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [advisorSummaries, setAdvisorSummaries] = useState({});
  const [loadingAdvisors, setLoadingAdvisors] = useState(true);

  useEffect(() => {
    db.entities.MonthlyMetrics.list("-month", 6).then(setMetrics);
    db.entities.FraudAlert.filter({ status: "pending" }, "-created_date", 5).then(setAlerts);
  }, []);

  useEffect(() => {
    if (metrics.length < 2) return;
    generateAdvisorSummaries();
  }, [metrics]);

  const generateAdvisorSummaries = async () => {
    setLoadingAdvisors(true);
    const latest = metrics[0];
    const prev = metrics[1];
    const revGrowth = prev?.revenue ? (((latest.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) : 0;
    const expGrowth = prev?.expenses ? (((latest.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1) : 0;

    const context = `Latest month: Revenue $${latest.revenue?.toLocaleString()}, Expenses $${latest.expenses?.toLocaleString()}, Profit $${latest.profit?.toLocaleString()}, Productivity ${latest.productivity_avg}%, Satisfaction ${latest.satisfaction_avg}%, Headcount ${latest.headcount}. Revenue growth: ${revGrowth}%, Expense growth: ${expGrowth}%.`;

    const personas = {
      optimist: "You are Olivia, an optimistic business advisor. Give a ONE sentence upbeat summary highlighting growth opportunities and positives.",
      pessimist: "You are Peter, a pessimistic business advisor. Give a ONE sentence cautionary summary highlighting risks and concerns.",
      realist: "You are Rita, a realistic business advisor. Give a ONE sentence balanced, data-driven summary with the most likely outcome.",
    };

    const results = {};
    await Promise.all(
      Object.entries(personas).map(async ([key, systemPrompt]) => {
        const res = await db.integrations.Core.InvokeLLM({
          prompt: `${systemPrompt}\n\nBusiness data: ${context}\n\nGive your one-sentence assessment.`,
          model: "claude_sonnet_4_6",
        });
        results[key] = res;
      })
    );
    setAdvisorSummaries(results);
    setLoadingAdvisors(false);
  };

  const latest = metrics[0] || {};
  const prev = metrics[1] || {};
  const revDelta = prev.revenue ? (((latest.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1) : 0;
  const expDelta = prev.expenses ? (((latest.expenses - prev.expenses) / prev.expenses) * 100).toFixed(1) : 0;
  const profitDelta = prev.profit ? (((latest.profit - prev.profit) / prev.profit) * 100).toFixed(1) : 0;

  const radarData = [
    { metric: "Revenue", value: Math.min((latest.revenue || 0) / 3000, 100), full: 100 },
    { metric: "Profit", value: Math.min(((latest.profit || 0) / (latest.revenue || 1)) * 100, 100), full: 100 },
    { metric: "Productivity", value: latest.productivity_avg || 0, full: 100 },
    { metric: "Satisfaction", value: latest.satisfaction_avg || 0, full: 100 },
    { metric: "Growth", value: Math.max(0, parseFloat(revDelta) + 20), full: 100 },
    { metric: "Efficiency", value: Math.min(((latest.profit || 0) / (latest.expenses || 1)) * 100, 100), full: 100 },
  ];

  return (
    <div>
      <TopBar title="Dashboard" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Revenue" value={`$${(latest.revenue || 0).toLocaleString()}`} delta={parseFloat(revDelta)} deltaLabel="vs last month" icon={DollarSign} />
          <MetricCard label="Expenses" value={`$${(latest.expenses || 0).toLocaleString()}`} delta={parseFloat(expDelta)} deltaLabel="vs last month" icon={TrendingDown} />
          <MetricCard label="Net Profit" value={`$${(latest.profit || 0).toLocaleString()}`} delta={parseFloat(profitDelta)} deltaLabel="vs last month" icon={BarChart3} />
          <MetricCard label="Avg Productivity" value={`${latest.productivity_avg || 0}%`} delta={latest.productivity_avg - (prev.productivity_avg || 0)} deltaLabel="pts change" icon={Users} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5">
            <h2 className="text-base font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity size={18} className="text-purple-600" /> Business Health
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Current" dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2">
            <h2 className="text-base font-heading font-semibold text-foreground mb-3">AI Advisor Perspectives</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AdvisorCard persona="optimist" summary={advisorSummaries.optimist} loading={loadingAdvisors} />
              <AdvisorCard persona="pessimist" summary={advisorSummaries.pessimist} loading={loadingAdvisors} />
              <AdvisorCard persona="realist" summary={advisorSummaries.realist} loading={loadingAdvisors} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert size={18} className="text-purple-600" /> Recent Fraud Alerts
            </h2>
            <Link to="/fraud/alerts">
              <span className="text-sm text-purple-600 hover:underline">View all →</span>
            </Link>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No pending alerts</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Alert</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 4).map((alert) => (
                    <tr key={alert.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-foreground truncate">{alert.raw_text}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 capitalize">
                          {alert.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/fraud/alerts/${alert.id}`}>
                          <GradientButton size="sm">Investigate</GradientButton>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}