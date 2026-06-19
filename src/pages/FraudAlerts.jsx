const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";
import { ShieldAlert, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import moment from "moment";

const riskColors = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const statusColors = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  reviewed: "bg-emerald-100 text-emerald-700",
  escalated: "bg-red-100 text-red-700",
  closed: "bg-gray-100 text-gray-600",
};

const sampleAlerts = [
  "Suspicious wire transfer of $28,400 from dormant account to newly created offshore entity. No supporting documentation.",
  "Employee reimbursement claim of $15,700 for travel expenses. Amount 4x higher than historical average. Receipts appear altered.",
  "Payment of $52,000 to vendor not in approved vendor list. Invoice number format inconsistent with legitimate invoices."
];

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = () => {
    db.entities.FraudAlert.list("-created_date", 50).then(setAlerts);
  };

  const processBatch = async () => {
    setProcessing(true);
    const toCreate = sampleAlerts.map(text => ({ raw_text: text, status: "pending" }));
    await db.entities.FraudAlert.bulkCreate(toCreate);
    loadAlerts();
    setProcessing(false);
  };

  return (
    <div>
      <TopBar title="Fraud Alerts" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-purple-600" />
            <span className="text-sm text-muted-foreground">{alerts.filter(a => a.status === "pending").length} pending alerts</span>
          </div>
          <GradientButton onClick={processBatch} disabled={processing}>
            {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Process new batch
          </GradientButton>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Alert</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Risk</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 max-w-sm">
                    <p className="text-foreground truncate">{alert.raw_text}</p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                    {moment(alert.created_date).format("MMM D, HH:mm")}
                  </td>
                  <td className="py-3 px-4">
                    {alert.risk_level ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${riskColors[alert.risk_level] || ""}`}>
                        {alert.risk_level}{alert.risk_score ? ` (${alert.risk_score})` : ""}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[alert.status] || ""}`}>
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
              {alerts.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No fraud alerts yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}