const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Plus, DollarSign, TrendingUp, X, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function Finances() {
  const [metrics, setMetrics] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [form, setForm] = useState({ type: "expense", category: "", description: "", amount: "", date: "" });

  useEffect(() => {
    db.entities.MonthlyMetrics.list("month", 12).then(setMetrics);
    db.entities.BusinessTransaction.list("-date", 20).then(setTransactions);
  }, []);

  const chartData = metrics.map((m) => ({
    month: moment(m.month).format("MMM"),
    Revenue: m.revenue,
    Expenses: m.expenses,
    Profit: m.profit,
  }));

  const expenseCategories = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + (t.amount || 0);
      return acc;
    }, {});

  const expensePieData = Object.entries(expenseCategories).map(([name, value]) => ({ name, value }));
  const expenseColors = ["#7c3aed", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#0ea5e9"];
  const totalExpense = expensePieData.reduce((sum, item) => sum + item.value, 0);

  const handleAddTransaction = async () => {
    if (!form.amount || !form.date) return;
    await db.entities.BusinessTransaction.create({ ...form, amount: parseFloat(form.amount) });
    setShowAdd(false);
    setForm({ type: "expense", category: "", description: "", amount: "", date: "" });
    db.entities.BusinessTransaction.list("-date", 20).then(setTransactions);
  };

  const askAIFinances = async () => {
    setLoadingAI(true);
    const latest = metrics[metrics.length - 1] || {};
    const context = `Revenue: $${latest.revenue?.toLocaleString()}, Expenses: $${latest.expenses?.toLocaleString()}, Profit: $${latest.profit?.toLocaleString()}. ${transactions.length} recent transactions.`;
    const res = await db.integrations.Core.InvokeLLM({
      prompt: `You are a financial advisor. Analyze this business financial data and give 3 actionable insights in bullet points. Keep it concise.\n\n${context}`,
      model: "claude_sonnet_4_6",
    });
    setAiInsight(typeof res === "string" ? res : JSON.stringify(res));
    setLoadingAI(false);
  };

  return (
    <div>
      <TopBar title="Finances" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-foreground">Revenue vs Expenses</h2>
            <GradientButton onClick={askAIFinances} disabled={loadingAI} size="sm">
              {loadingAI ? <Loader2 size={14} className="animate-spin mr-1" /> : <TrendingUp size={14} className="mr-1" />}
              Ask AI about finances
            </GradientButton>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="Revenue" stroke="#7c3aed" fill="url(#revGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-foreground">Expense categories</h2>
              <span className="text-xs text-muted-foreground">{totalExpense ? `$${totalExpense.toLocaleString()} total` : "No expenses yet"}</span>
            </div>
            {expensePieData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={expensePieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={4}>
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={expenseColors[index % expenseColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No expense categories to display yet.</div>
            )}
            {expensePieData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                {expensePieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: expenseColors[index % expenseColors.length] }} />
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="ml-auto text-muted-foreground">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {aiInsight && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-purple-800">AI Financial Insights</h3>
              <button onClick={() => setAiInsight("")} className="text-purple-400 hover:text-purple-600"><X size={16} /></button>
            </div>
            <div className="prose prose-sm max-w-none text-purple-900">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="font-heading font-semibold text-foreground">Transactions</h2>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
              <Plus size={14} /> Add Transaction
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground">{moment(t.date).format("MMM D, YYYY")}</td>
                  <td className="py-3 px-4 text-foreground">{t.description}</td>
                  <td className="py-3 px-4 text-muted-foreground">{t.category}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${t.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {t.type === "income" ? "+" : "-"}${t.amount?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleAddTransaction} className="w-full py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Save Transaction</button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}