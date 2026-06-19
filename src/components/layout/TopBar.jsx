import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Home, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function TopBar({ title }) {
  const navigate = useNavigate();
  const { appUser, logout } = useAuth();

  const initials = appUser?.full_name
    ? appUser.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : appUser?.email
    ? appUser.email.split("@")[0].slice(0, 2).toUpperCase()
    : "AC";

  const displayName = appUser?.full_name || appUser?.email || "User";

  const notifications = useMemo(
    () => [
      { id: "1", title: "System update", message: "Your app settings were saved.", read: true },
      { id: "2", title: "New alert", message: "A new fraud alert requires your attention.", read: false },
    ],
    []
  );

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-heading font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/select-business")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          title="Go to home"
        >
          <Home size={16} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors relative">
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[9px] flex items-center justify-center font-bold px-1.5">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-72">
            <div className="px-3 py-3">
              <div className="text-sm font-semibold text-foreground">Notifications</div>
              <div className="text-xs text-muted-foreground">Recent alerts and messages</div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No notifications at this moment.
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-9 h-9 rounded-full border border-border bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/90 transition-colors">
              <Avatar className="h-9 w-9 rounded-full bg-slate-700 text-white">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-56">
            <div className="px-3 py-3">
              <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{appUser?.email ?? "No email"}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}> 
              <SettingsIcon className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}