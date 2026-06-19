const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Smile, Frown, Scale, Send, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import ReactMarkdown from "react-markdown";

const personas = {
  optimist: { name: "Olivia", subtitle: "The Optimist", icon: Smile, gradient: "from-emerald-500 to-teal-500" },
  pessimist: { name: "Peter", subtitle: "The Pessimist", icon: Frown, gradient: "from-amber-500 to-orange-500" },
  realist: { name: "Rita", subtitle: "The Realist", icon: Scale, gradient: "from-blue-500 to-indigo-500" },
};

const systemPrompts = {
  optimist: `You are Olivia, an optimistic business advisor. Focus on growth opportunities, market tailwinds, team strengths, and silver linings. Be encouraging but data-informed. Structure your response with:
1. Assessment (2-3 paragraphs)
2. Key Metrics Cited
3. Suggested Action`,
  pessimist: `You are Peter, a pessimistic business advisor. Spot risks, inefficiencies, hidden costs, worst-case scenarios, cash flow crunches, and compliance dangers. Be cautionary but constructive. Structure your response with:
1. Assessment (2-3 paragraphs)
2. Key Metrics Cited
3. Suggested Action`,
  realist: `You are Rita, a realistic business advisor. Be data-driven, balanced, and probabilistic. Focus on most likely outcomes, trade-offs, and actionable steps. Structure your response with:
1. Assessment (2-3 paragraphs)
2. Key Metrics Cited
3. Suggested Action`,
};

export default function Perspectives() {
  const [query, setQuery] = useState("How is our business doing this quarter?");
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    db.entities.MonthlyMetrics.list("-month", 6).then(setMetrics);
  }, []);

  const askAdvisors = async () => {
    if (!query.trim() || metrics.length === 0) return;
    setLoading(true);
    setResponses({});

    const latest = metrics[0];
    const prev = metrics[1] || {};
    const context = `Business metrics (last 6 months available):
Latest month: Revenue $${latest.revenue?.toLocaleString()}, Expenses $${latest.expenses?.toLocaleString()}, Profit $${latest.profit?.toLocaleString()}, Productivity ${latest.productivity_avg}%, Satisfaction ${latest.satisfaction_avg}%, Headcount ${latest.headcount}.
Previous month: Revenue $${prev.revenue?.toLocaleString() || "N/A"}, Expenses $${prev.expenses?.toLocaleString() || "N/A"}, Profit $${prev.profit?.toLocaleString() || "N/A"}.
6-month trend: Revenue grew from $${metrics[metrics.length - 1]?.revenue?.toLocaleString()} to $${latest.revenue?.toLocaleString()}.`;

    const sessionId = `adv-${Date.now()}`;
    const results = {};

    await Promise.all(
      Object.entries(systemPrompts).map(async ([key, sysPrompt]) => {
        const res = await db.integrations.Core.InvokeLLM({
          prompt: `${sysPrompt}\n\nBusiness context:\n${context}\n\nUser question: ${query}`,
          model: "claude_sonnet_4_6",
        });
        results[key] = res;
        db.entities.AgentAudit.create({
          session_id: sessionId,
          agent_name: personas[key].name,
          action: "advisor_response",
          input_summary: query,
          output_summary: typeof res === "string" ? res.slice(0, 200) : JSON.stringify(res).slice(0, 200),
        });
      })
    );

    setResponses(results);
    setLoading(false);
  };

  return (
    <div>
      <TopBar title="Advisor Perspectives" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <label className="text-sm font-medium text-foreground block mb-2">Ask your AI advisors</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAdvisors()}
              placeholder="e.g. Should we hire two more developers?"
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
            <GradientButton onClick={askAdvisors} disabled={loading || !query.trim()}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span className="ml-2">Ask the Advisors</span>
            </GradientButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(personas).map(([key, p]) => {
            const Icon = p.icon;
            const response = responses[key];
            return (
              <div key={key} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.gradient} flex items-center justify-center`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-foreground text-sm">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.subtitle}</div>
                  </div>
                </div>
                <div className="flex-1 min-h-[200px]">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-purple-600 text-xs font-medium">
                        <Loader2 size={14} className="animate-spin" /> Analyzing...
                      </div>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="h-3 bg-muted rounded-full animate-pulse" style={{ width: `${100 - n * 12}%` }} />
                      ))}
                    </div>
                  ) : response ? (
                    <div className="prose prose-sm max-w-none text-muted-foreground">
                      <ReactMarkdown>{typeof response === "string" ? response : JSON.stringify(response)}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Ask a question to see {p.name}'s perspective...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}