const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { ClipboardList, Search } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import moment from "moment";

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    db.entities.AgentAudit.list("-created_date", 100).then(setLogs);
  }, []);

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.agent_name?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.session_id?.toLowerCase().includes(q) ||
      log.input_summary?.toLowerCase().includes(q) ||
      log.output_summary?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <TopBar title="Audit Log" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-sky-600" />
            <span className="text-sm text-muted-foreground">{logs.length} entries</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by agent, action, session..."
              className="pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Agent</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Input</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Output</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Session</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                    {moment(log.created_date).format("MMM D, HH:mm:ss")}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
                      {log.agent_name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground text-xs">{log.action}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px] truncate">{log.input_summary}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px] truncate">{log.output_summary}</td>
                  <td className="py-3 px-4 text-xs font-mono text-muted-foreground">{log.session_id?.slice(0, 12)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No audit entries {search ? "matching your search" : "yet"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}