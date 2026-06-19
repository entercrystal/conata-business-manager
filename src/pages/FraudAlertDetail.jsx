const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

import { ShieldAlert, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import AgentTrace from "@/components/ui/AgentTrace";
import { Progress } from "@/components/ui/progress";

export default function FraudAlertDetail() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState([
    { name: "Triage Agent", status: "pending", output: null },
    { name: "Entity Checker", status: "pending", output: null },
    { name: "Risk Assessor", status: "pending", output: null },
    { name: "Escalation Agent", status: "pending", output: null },
  ]);

  useEffect(() => {
    loadAlert();
  }, [id]);

  const loadAlert = async () => {
    setLoading(true);
    const data = await db.entities.FraudAlert.list();
    const found = data.find(a => a.id === id);
    if (found) {
      setAlert(found);
      if (found.triage_data) {
        rebuildSteps(found);
      }
    }
    setLoading(false);
  };

  const rebuildSteps = (a) => {
    const newSteps = [
      { name: "Triage Agent", status: a.triage_data ? "done" : "pending", output: a.triage_data ? "Extracted transaction fields" : null },
      { name: "Entity Checker", status: a.entity_data ? "done" : "pending", output: a.entity_data ? "Entity analysis complete" : null },
      { name: "Risk Assessor", status: a.risk_score !== undefined && a.risk_score !== null ? "done" : "pending", output: a.risk_score ? `Risk score: ${a.risk_score} (${a.risk_level})` : null },
      { name: "Escalation Agent", status: a.escalation_action ? "done" : "pending", output: a.escalation_action ? `Decision: ${a.escalation_action}` : null },
    ];
    setSteps(newSteps);
  };

  const runFraudSquad = async () => {
    if (!alert) return;
    setRunning(true);
    const sessionId = `fraud-${Date.now()}`;

    const extractFields = (text) => {
      const amountMatch = text.match(/\$?([0-9]{1,3}(?:[,\.][0-9]{3})*(?:\.[0-9]+)?)/);
      const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
      const senderMatch = text.match(/from ([^\.]+?)(?: to |\.|$)/i);
      const receiverMatch = text.match(/to ([^\.]+?)(?:\.|$)/i);
      const transactionType = /wire transfer/i.test(text)
        ? "wire transfer"
        : /reimbursement/i.test(text)
        ? "reimbursement"
        : /payment/i.test(text)
        ? "vendor payment"
        : "unknown";
      const key_flags = [];
      if (/dormant/i.test(text)) key_flags.push("dormant account");
      if (/offshore/i.test(text)) key_flags.push("offshore destination");
      if (/altered|altering|alteration|altered receipts|receipts appear altered/i.test(text)) key_flags.push("altered receipts");
      if (/inconsistent/i.test(text)) key_flags.push("inconsistent information");
      if (/no supporting documentation/i.test(text)) key_flags.push("missing documentation");
      if (/not in approved vendor list/i.test(text)) key_flags.push("unapproved vendor");

      return {
        amount,
        sender: senderMatch?.[1]?.trim() || "unknown",
        receiver: receiverMatch?.[1]?.trim() || "unknown",
        date: new Date().toISOString().split("T")[0],
        transaction_type: transactionType,
        key_flags,
      };
    };

    const analyzeEntities = (fields, text) => {
      const offshoreRisk = /offshore/i.test(text);
      const suspicious = /(dormant|offshore|altered|inconsistent|unapproved|missing documentation|no supporting documentation)/i.test(text);
      const companyType = offshoreRisk ? "offshore entity" : /vendor/i.test(text) ? "vendor" : "unknown";
      const registrationStatus = suspicious ? "suspicious" : "unknown";
      const estimatedRevenue = fields.amount >= 50000 ? "high" : fields.amount >= 15000 ? "medium" : "low";
      const redFlags = [];
      if (offshoreRisk) redFlags.push("offshore destination");
      if (/dormant/i.test(text)) redFlags.push("dormant account");
      if (/altered/i.test(text)) redFlags.push("altered documentation");
      if (/inconsistent/i.test(text)) redFlags.push("inconsistent invoice format");
      if (/no supporting documentation/i.test(text)) redFlags.push("missing supporting documents");
      if (/not in approved vendor list/i.test(text)) redFlags.push("unapproved vendor");

      return {
        company_type: companyType,
        registration_status: registrationStatus,
        estimated_revenue: estimatedRevenue,
        red_flags: redFlags,
        offshore_risk: offshoreRisk,
        news_sentiment: suspicious ? "negative" : "unknown",
      };
    };

    const assessRisk = (fields, entity) => {
      let score = 20;
      if (entity.offshore_risk) score += 25;
      if (/dormant/i.test(alert.raw_text)) score += 20;
      if (/altered|inconsistent|missing documentation|unapproved|no supporting documentation/i.test(alert.raw_text)) score += 20;
      if (fields.amount >= 50000) score += 25;
      else if (fields.amount >= 15000) score += 15;
      else if (fields.amount >= 5000) score += 10;
      score += Math.min(fields.key_flags.length * 5, 15);
      score = Math.min(100, score);

      const riskLevel = score >= 75 ? "critical" : score >= 50 ? "high" : score >= 35 ? "medium" : "low";
      const riskFactors = [...entity.red_flags, ...(fields.key_flags || [])].slice(0, 5);
      const reasoning = `This alert scored ${score}/100 because ${riskFactors.length ? `it contains ${riskFactors.join(", ")}.` : "it contains concerning indicators."}`;

      return {
        risk_score: score,
        risk_level: riskLevel,
        reasoning,
        risk_factors: riskFactors,
      };
    };

    const decideAction = (riskData) => {
      if (riskData.risk_score >= 75) {
        return {
          action: "file_sar",
          reasoning: "The fraud score is very high, indicating suspicious activity that should be escalated for formal reporting.",
        };
      }
      if (riskData.risk_score >= 35) {
        return {
          action: "manual_review",
          reasoning: "The alert is risky enough to require a human review before a final decision.",
        };
      }
      return {
        action: "auto_approve",
        reasoning: "The transaction appears lower risk and can proceed without escalation.",
      };
    };

    try {
      const triageData = extractFields(alert.raw_text);
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "done", output: `Amount: $${triageData.amount?.toLocaleString()}, Sender: ${triageData.sender}, Receiver: ${triageData.receiver}` } : s));
      await db.entities.AgentAudit.create({ session_id: sessionId, agent_name: "Triage Agent", action: "extract_fields", input_summary: alert.raw_text.slice(0, 100), output_summary: JSON.stringify(triageData).slice(0, 200) });

      const entityData = analyzeEntities(triageData, alert.raw_text);
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: "done", output: `Type: ${entityData.company_type}, Offshore: ${entityData.offshore_risk ? "Yes" : "No"}, ${entityData.red_flags.length} red flags` } : s));
      await db.entities.AgentAudit.create({ session_id: sessionId, agent_name: "Entity Checker", action: "entity_analysis", input_summary: JSON.stringify(triageData).slice(0, 100), output_summary: JSON.stringify(entityData).slice(0, 200) });

      const riskData = assessRisk(triageData, entityData);
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: "done", output: `Score: ${riskData.risk_score}/100 (${riskData.risk_level}). ${riskData.reasoning}` } : s));
      await db.entities.AgentAudit.create({ session_id: sessionId, agent_name: "Risk Assessor", action: "risk_assessment", input_summary: "Combined triage + entity data", output_summary: `Score: ${riskData.risk_score}, Level: ${riskData.risk_level}` });

      const escData = decideAction(riskData);
      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: "done", output: `Decision: ${escData.action}. ${escData.reasoning}` } : s));
      await db.entities.AgentAudit.create({ session_id: sessionId, agent_name: "Escalation Agent", action: "escalation_decision", input_summary: `Risk: ${riskData.risk_score}`, output_summary: `Action: ${escData.action}` });

      const updatedStatus = escData.action === "file_sar" ? "escalated" : "reviewed";
      await db.entities.FraudAlert.update(alert.id, {
        status: updatedStatus,
        triage_data: JSON.stringify(triageData),
        entity_data: JSON.stringify(entityData),
        risk_score: riskData.risk_score,
        risk_level: riskData.risk_level,
        escalation_action: escData.action,
        escalation_reasoning: escData.reasoning,
      });

      setAlert(prev => ({
        ...prev,
        status: updatedStatus,
        triage_data: JSON.stringify(triageData),
        entity_data: JSON.stringify(entityData),
        risk_score: riskData.risk_score,
        risk_level: riskData.risk_level,
        escalation_action: escData.action,
        escalation_reasoning: escData.reasoning,
      }));
    } catch (err) {
      console.error("FraudSquad failed:", err);
      setSteps(prev => prev.map((s) => s.status === "running" ? { ...s, status: "failed", output: "Failed to complete step." } : s));
    } finally {
      setRunning(false);
    }
  };

  const createCase = async () => {
    const caseNum = `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
    await db.entities.FraudCase.create({
      case_number: caseNum,
      alert_id: alert.id,
      risk_score: alert.risk_score,
      status: "open",
      sar_filed: false,
    });
    await db.entities.FraudAlert.update(alert.id, { case_id: caseNum });
    setAlert(prev => ({ ...prev, case_id: caseNum }));
  };

  if (loading) {
    return (
      <div>
        <TopBar title="Alert Investigation" />
        <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-purple-600" size={32} /></div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div>
        <TopBar title="Alert Investigation" />
        <div className="p-6 text-center text-muted-foreground">Alert not found</div>
      </div>
    );
  }

  const triageData = alert.triage_data ? JSON.parse(alert.triage_data) : null;
  const entityData = alert.entity_data ? JSON.parse(alert.entity_data) : null;
  const riskColor = alert.risk_score >= 70 ? "text-red-500" : alert.risk_score >= 40 ? "text-amber-500" : "text-emerald-600";

  return (
    <div>
      <TopBar title="Alert Investigation" />
      <div className="p-6 max-w-7xl mx-auto">
        <Link to="/fraud/alerts" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={14} /> Back to alerts
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-semibold text-foreground">FraudSquad Trace</h2>
                {!alert.triage_data && (
                  <GradientButton onClick={runFraudSquad} disabled={running}>
                    {running ? <Loader2 size={14} className="animate-spin mr-1" /> : <ShieldAlert size={14} className="mr-1" />}
                    Run FraudSquad
                  </GradientButton>
                )}
              </div>
              <AgentTrace steps={steps} />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Raw Alert</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{alert.raw_text}</p>
            </div>

            {triageData && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Extracted Fields</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Amount:</span> <span className="font-medium text-foreground">${triageData.amount?.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Sender:</span> <span className="font-medium text-foreground">{triageData.sender}</span></div>
                  <div><span className="text-muted-foreground">Receiver:</span> <span className="font-medium text-foreground">{triageData.receiver}</span></div>
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium text-foreground">{triageData.transaction_type}</span></div>
                </div>
                {triageData.key_flags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {triageData.key_flags.map((flag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">{flag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {entityData && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Entity Report</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{entityData.company_type}</span></div>
                  <div><span className="text-muted-foreground">Registration:</span> <span className="font-medium">{entityData.registration_status}</span></div>
                  <div><span className="text-muted-foreground">Revenue:</span> <span className="font-medium">{entityData.estimated_revenue}</span></div>
                  <div><span className="text-muted-foreground">Offshore Risk:</span> <span className={`font-medium ${entityData.offshore_risk ? "text-red-500" : "text-emerald-600"}`}>{entityData.offshore_risk ? "Yes" : "No"}</span></div>
                </div>
                {entityData.red_flags?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs text-muted-foreground">Red Flags:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entityData.red_flags.map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                          <AlertTriangle size={10} />{f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {alert.risk_score !== undefined && alert.risk_score !== null && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Risk Assessment</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className={`text-4xl font-heading font-bold ${riskColor}`}>{alert.risk_score}</div>
                  <div>
                    <div className={`text-sm font-semibold capitalize ${riskColor}`}>{alert.risk_level} Risk</div>
                    <div className="text-xs text-muted-foreground">out of 100</div>
                  </div>
                </div>
                <Progress value={alert.risk_score} className="h-2.5 mb-3" />
              </div>
            )}

            {alert.escalation_action && (
              <div className={`bg-card border border-border rounded-xl p-5 ${alert.escalation_action === "file_sar" ? "border-red-300" : alert.escalation_action === "manual_review" ? "border-amber-300" : "border-emerald-300"}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Escalation Decision</h3>
                    <p className="text-xs text-muted-foreground">Recommended next step for this alert</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${alert.escalation_action === "file_sar" ? "bg-red-100 text-red-700" : alert.escalation_action === "manual_review" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {alert.escalation_action === "file_sar" ? "File SAR" : alert.escalation_action === "manual_review" ? "Manual Review" : "Auto-Approved"}
                  </span>
                </div>
                <p className="text-sm leading-6 text-foreground">{alert.escalation_reasoning}</p>
                {alert.escalation_action === "file_sar" && !alert.case_id && (
                  <div className="mt-4">
                    <GradientButton onClick={createCase}>Create Case</GradientButton>
                  </div>
                )}
                {alert.case_id && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Case: <Link to="/fraud/cases" className="text-purple-600 hover:underline">{alert.case_id}</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}