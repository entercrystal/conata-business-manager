import React, { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import { useTheme } from "next-themes";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { selectedBusiness } = useBusiness();
  const [copied, setCopied] = useState(false);

  const inviteCode = selectedBusiness?.inviteCode || "";

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Settings" />
      <main className="p-6 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-4">App Settings</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Update your account preferences, toggle themes, and manage your profile settings.
            </p>
          </div>

          {inviteCode ? (
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Worker Invite Code</h2>
                  <p className="text-sm text-muted-foreground">
                    Share this code with your workers so they can join your business.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-3xl border border-border bg-muted/10 p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-2">
                  Your business invite code
                </p>
                <p className="text-3xl font-bold font-mono text-[#7F77DD] tracking-[0.2em]">
                  {inviteCode}
                </p>
              </div>
            </div>
          ) : null}

          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="text-xl font-semibold text-foreground mb-2">Account</h2>
              <p className="text-sm text-muted-foreground mb-4">
                View your user profile and manage login preferences.
              </p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                onClick={() => window.location.assign("/profile")}
              >
                Manage profile
              </button>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5">
              <h2 className="text-xl font-semibold text-foreground mb-2">Appearance</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Switch between light and dark themes and personalize your experience.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  className={`w-full rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors ${theme === "light" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                  onClick={() => setTheme("light")}
                >
                  Light mode
                </button>
                <button
                  type="button"
                  className={`w-full rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors ${theme === "dark" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                  onClick={() => setTheme("dark")}
                >
                  Dark mode
                </button>
                <button
                  type="button"
                  className={`w-full rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors ${theme === "system" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                  onClick={() => setTheme("system")}
                >
                  System theme
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
