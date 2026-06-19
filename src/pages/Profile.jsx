import React from "react";
import TopBar from "@/components/layout/TopBar";
import { useAuth } from "@/lib/AuthContext";

export default function Profile() {
  const { appUser } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="Profile" />
      <main className="p-6 max-w-4xl mx-auto">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-foreground mb-3">Profile</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Review your account details and update your profile information.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm text-muted-foreground mb-2">Name</p>
              <div className="text-base font-medium text-foreground">{appUser?.full_name ?? "Not set"}</div>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5">
              <p className="text-sm text-muted-foreground mb-2">Email</p>
              <div className="text-base font-medium text-foreground">{appUser?.email ?? "Not set"}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="text-sm text-muted-foreground mb-2">Account ID</p>
            <div className="text-base font-medium text-foreground">{appUser?.id ?? "Unknown"}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
