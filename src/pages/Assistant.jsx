const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from "react";
import { invokeClaude } from "@/lib/claude";

import { Send, Loader2, Sparkles, Bot, User } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import ReactMarkdown from "react-markdown";

const personaPrompts = {
  general: "You are the Business Buddy. Help users with their business, finances, strategy, and operations in a friendly, practical way. Keep answers clear, concise, and action-oriented.",
  optimist: "You are Olivia, the upbeat Business Buddy. Highlight opportunities, growth possibilities, and positive next steps while staying grounded in the business data.",
  pessimist: "You are Peter, the cautious Business Buddy. Point out risks, inefficiencies, and potential problems, but always offer constructive, practical advice.",
  realist: "You are Rita, the realistic Business Buddy. Give balanced, data-driven recommendations and focus on the most likely outcomes and next steps.",
};

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState("general");
  const [metrics, setMetrics] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    db.entities.MonthlyMetrics.list("-month", 1).then(data => {
      if (data.length) setMetrics(data[0]);
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const detectPersona = (text) => {
    if (text.includes("@Optimist") || text.includes("@optimist")) return "optimist";
    if (text.includes("@Pessimist") || text.includes("@pessimist")) return "pessimist";
    if (text.includes("@Realist") || text.includes("@realist")) return "realist";
    return persona;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const detected = detectPersona(input);
    const cleanInput = input.replace(/@(Optimist|Pessimist|Realist|optimist|pessimist|realist)/g, "").trim();

    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const metricsContext = metrics
      ? `\nCurrent business data: Revenue $${metrics.revenue?.toLocaleString()}, Expenses $${metrics.expenses?.toLocaleString()}, Profit $${metrics.profit?.toLocaleString()}, Productivity ${metrics.productivity_avg}%, Satisfaction ${metrics.satisfaction_avg}%.`
      : "";

    const conversationHistory = messages.slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
    const prompt = `${personaPrompts[detected]}${metricsContext}\n\nConversation history:\n${conversationHistory}\n\nHuman: ${cleanInput}\n\nAssistant:`;

    try {
      const res = await invokeClaude(prompt, {
        model: "claude-sonnet-4-6",
        stop_sequences: ["Human:"],
        max_tokens: 800,
        temperature: 0.5,
      });

      const assistantMsg = { role: "assistant", content: res, persona: detected };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const assistantMsg = { role: "assistant", content: `Error: ${error.message}`, persona: detected };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const personaLabels = {
    general: { label: "General", color: "bg-purple-100 text-purple-700" },
    optimist: { label: "Olivia", color: "bg-emerald-100 text-emerald-700" },
    pessimist: { label: "Peter", color: "bg-amber-100 text-amber-700" },
    realist: { label: "Rita", color: "bg-blue-100 text-blue-700" },
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="AI Assistant" />
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Persona:</span>
          {Object.entries(personaLabels).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPersona(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${persona === key ? p.color : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {p.label}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-2">Tip: type @Optimist, @Pessimist, or @Realist in your message</span>
        </div>

        <div className="flex-1 bg-card border border-border rounded-xl overflow-y-auto p-4 space-y-4 mb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mb-3">
                <Sparkles size={24} className="text-white" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">Business Buddy</h3>
              <p className="text-sm text-muted-foreground max-w-sm">Ask about your business, finances, strategy, or switch to an advisor persona.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white" : "bg-muted"}`}>
                {msg.persona && msg.role === "assistant" && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5 ${personaLabels[msg.persona]?.color || ""}`}>
                    {personaLabels[msg.persona]?.label}
                  </span>
                )}
                {msg.role === "user" ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 size={16} className="animate-spin text-purple-600" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your business..."
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
          />
          <GradientButton onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </GradientButton>
        </div>
      </div>
    </div>
  );
}