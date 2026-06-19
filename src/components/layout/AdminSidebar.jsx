const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  ShieldAlert,
  FolderOpen,
  MessageSquare,
  ClipboardList,
  Sparkles,
  Package,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useBusiness } from "@/contexts/BusinessContext";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Perspectives", path: "/perspectives", icon: Sparkles },
  { label: "Finances", path: "/finances", icon: DollarSign },
  { label: "Workers", path: "/workers", icon: Users },
  { type: "divider", label: "FraudSquad" },
  { label: "Fraud Alerts", path: "/fraud/alerts", icon: ShieldAlert },
  { label: "Fraud Cases", path: "/fraud/cases", icon: FolderOpen },
  { type: "divider", label: "Tools" },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Inbox", path: "/submissions", icon: MessageSquare },
  { label: "Messages", path: "/messages", icon: ClipboardList },
  { label: "AI Assistant", path: "/assistant", icon: Sparkles },
  { label: "Audit Log", path: "/audit", icon: ClipboardList },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { selectedBusiness } = useBusiness();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const businessTitle = selectedBusiness?.name || selectedBusiness?.businessName || "Business";

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border z-40 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">{businessTitle?.slice(0, 2).toUpperCase()}</span>
            </div>
            <span className="font-heading font-semibold text-foreground">{businessTitle}</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-sm">{businessTitle?.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navItems.map((item, i) =>
          item.type === "divider" ? (
            <div key={i} className="mt-4 mb-2 px-3">
              {!collapsed && (
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {item.label}
                </span>
              )}
              {collapsed && <div className="border-t border-border" />}
            </div>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-cyan-600/10 to-sky-600/10 text-cyan-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <button
          onClick={() => db.auth.logout("/")}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}