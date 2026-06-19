const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { FolderOpen } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import moment from "moment";

const statusColors = {
  open: "bg-amber-100 text-amber-700",
  investigating: "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function FraudCases() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    db.entities.FraudCase.list("-created_date", 50).then(setCases);
  }, []);

  const updateStatus = async (caseId, newStatus) => {
    await db.entities.FraudCase.update(caseId, { status: newStatus });
    db.entities.FraudCase.list("-created_date", 50).then(setCases);
  };

  return (
    <div>
      <TopBar title="Fraud Cases" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <FolderOpen size={20} className="text-purple-600" />
          <span className="text-sm text-muted-foreground">{cases.filter(c => c.status === "open" || c.status === "investigating").length} active cases</span>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Case #</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Risk Score</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">SAR Filed</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-foreground">{c.case_number}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${(c.risk_score || 0) >= 70 ? "text-red-500" : (c.risk_score || 0) >= 40 ? "text-amber-500" : "text-emerald-600"}`}>
                      {c.risk_score || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[c.status] || ""}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{c.sar_filed ? "✅ Yes" : "No"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{moment(c.created_date).format("MMM D, YYYY")}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.status === "open" && (
                        <button onClick={() => updateStatus(c.id, "investigating")} className="px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors">
                          Start Investigation
                        </button>
                      )}
                      {c.status === "investigating" && (
                        <button onClick={() => updateStatus(c.id, "resolved")} className="px-2.5 py-1 text-xs font-medium rounded-md border border-border hover:bg-muted transition-colors">
                          Resolve
                        </button>
                      )}
                      {(c.status === "resolved" || c.status === "open") && (
                        <button onClick={() => updateStatus(c.id, "closed")} className="px-2.5 py-1 text-xs font-medium text-muted-foreground rounded-md border border-border hover:bg-muted transition-colors">
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No fraud cases yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}