const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import moment from "moment";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;
    const data = await db.entities.Message.list("-created_date", 100);
    const filtered = data.filter((msg) => msg.worker_id && msg.sender !== "admin");
    setMessages(filtered);
  };

  return (
    <div>
      <TopBar title="Messages" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-foreground">Worker Messages</h2>
            <p className="text-sm text-muted-foreground">Workers can see admin replies here once a submission has been responded to.</p>
          </div>
          <Link to="/workers" className="text-sm text-cyan-600 hover:text-cyan-800 transition-colors">Back to workers</Link>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Worker</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Message</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {messages.length ? messages.map((msg) => (
                <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-foreground">{msg.worker_id}</td>
                  <td className="py-3 px-4 text-muted-foreground capitalize">{msg.sender === "admin" ? "Admin reply" : "Worker note"}</td>
                  <td className="py-3 px-4 text-foreground max-w-xl truncate">{msg.content}</td>
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{moment(msg.created_date).format("MMM D, HH:mm")}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No messages yet. Replies will appear here once an admin responds.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-sm text-muted-foreground">Note: This view uses demo inbox state. In a real app, messages would sync per worker account.</div>
      </div>
    </div>
  );
}
