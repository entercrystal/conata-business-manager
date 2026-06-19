const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (selected) {
      loadMessages(selected.id);
    }
  }, [selected]);

  const loadSubmissions = async () => {
    const data = await db.entities.Submission.list("-created_date", 50);
    setSubmissions(data);
  };

  const loadMessages = async (submissionId) => {
    const data = await db.entities.Message.filter({ submission_id: submissionId }, "created_date", 100);
    setMessages(data);
  };

  const openSubmission = (submission) => {
    setSelected(submission);
    setShowDialog(true);
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setLoading(true);
    await db.entities.Message.create({
      submission_id: selected.id,
      worker_id: selected.worker_id,
      sender: "admin",
      recipient: "worker",
      content: reply.trim(),
      created_date: new Date().toISOString()
    });
    await db.entities.Submission.update(selected.id, { status: "responded" });
    const updatedSubmission = { ...selected, status: "responded" };
    setSelected(updatedSubmission);
    setReply("");
    loadMessages(selected.id);
    loadSubmissions();
    setLoading(false);
  };

  return (
    <div>
      <TopBar title="Inbox" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-foreground">Submission inbox</h2>
            <p className="text-sm text-muted-foreground">Respond to worker submissions directly and keep the communication loop closed.</p>
          </div>
          <Link to="/messages" className="text-sm text-cyan-600 hover:text-cyan-800 transition-colors">Open Messages tab</Link>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Worker</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Submission</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-foreground">{submission.worker_name}</td>
                  <td className="py-3 px-4 text-muted-foreground max-w-lg truncate">{submission.title}</td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{moment(submission.created_date).format("MMM D, HH:mm")}</td>
                  <td className="py-3 px-4 capitalize">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${submission.status === "responded" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {submission.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <GradientButton size="sm" onClick={() => openSubmission(submission)}>Reply</GradientButton>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No submissions available.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selected?.title || "Submission details"}</DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">From {selected.worker_name} • {moment(selected.created_date).format("MMM D, YYYY h:mm A")}</div>
                <div className="bg-muted border border-border rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">{selected.text}</div>
                <div className="space-y-3">
                  <div className="text-sm font-medium text-foreground">Conversation</div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                    {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet for this submission.</div>}
                    {messages.map((msg) => (
                      <div key={msg.id} className={`rounded-2xl px-4 py-3 ${msg.sender === "admin" ? "bg-cyan-50 text-cyan-900 self-end" : "bg-muted text-foreground"}`}>
                        <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-1">{msg.sender === "admin" ? "Admin reply" : "Worker message"}</div>
                        <p className="text-sm leading-6">{msg.content}</p>
                        <div className="mt-2 text-[11px] text-muted-foreground">{moment(msg.created_date).format("MMM D, h:mm A")}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Reply to worker</label>
                  <textarea
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    placeholder="Type your response here..."
                  />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Replies will appear in the worker's Messages tab.</span>
                    <GradientButton onClick={sendReply} disabled={loading || !reply.trim()}>
                      {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Send size={14} className="mr-1" />}
                      Send reply
                    </GradientButton>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">Submission status: {selected.status}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
