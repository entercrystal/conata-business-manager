const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Users, Loader2, Copy, Check, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import TopBar from "@/components/layout/TopBar";
import GradientButton from "@/components/ui/GradientButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";
import { db as firestore } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState("");
  const [actionLoadingMember, setActionLoadingMember] = useState(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const { selectedBusiness, selectBusiness } = useBusiness();
  const { appUser } = useAuth();

  const inviteCode = selectedBusiness?.inviteCode || "";
  const teamSize = selectedBusiness?.members?.length ?? workers.length;
  const isOwner = selectedBusiness?.owner === appUser?.id;

  useEffect(() => {
    db.entities.Worker.list().then(setWorkers);
  }, []);

  useEffect(() => {
    if (manageDialogOpen && selectedBusiness?.id) {
      loadTeamMembers();
    }
  }, [manageDialogOpen, selectedBusiness?.id]);

  const askAI = async () => {
    setLoadingAI(true);
    const summary = workers.map(w => `${w.name} (${w.role}): Productivity ${w.productivity_score}%, Satisfaction ${w.satisfaction_score}%, Rate $${w.hourly_rate}/hr`).join(". ");
    const res = await db.integrations.Core.InvokeLLM({
      prompt: `You are a team management advisor. Analyze this team data and provide 3 actionable suggestions to improve productivity and satisfaction. Be specific.\n\nTeam: ${summary}`,
      model: "claude_sonnet_4_6",
    });
    setAiInsight(typeof res === "string" ? res : JSON.stringify(res));
    setLoadingAI(false);
  };

  const avgProductivity = workers.length ? Math.round(workers.reduce((s, w) => s + (w.productivity_score || 0), 0) / workers.length) : 0;
  const avgSatisfaction = workers.length ? Math.round(workers.reduce((s, w) => s + (w.satisfaction_score || 0), 0) / workers.length) : 0;
  const getTrendData = (history) => (history || []).map((value, index) => ({ name: `W${index + 1}`, value }));

  const loadTeamMembers = async () => {
    if (!selectedBusiness?.id) {
      setManageError('No business selected.');
      return;
    }

    setManageLoading(true);
    setManageError('');

    try {
      const membershipQuery = query(
        collection(firestore, 'memberships'),
        where('businessId', '==', selectedBusiness.id)
      );
      const membershipSnaps = await getDocs(membershipQuery);
      const membershipData = membershipSnaps.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      const team = await Promise.all(
        membershipData.map(async (member) => {
          const userRef = doc(firestore, 'users', member.userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : {};
          return {
            ...member,
            name: userData.full_name || userData.email || member.userId,
            email: userData.email || '',
            isOwner: member.userId === selectedBusiness.owner,
            role: member.role || 'worker',
          };
        })
      );
      setTeamMembers(team);
    } catch (err) {
      console.error('Failed to load team members:', err);
      setManageError('Unable to load team members right now.');
    } finally {
      setManageLoading(false);
    }
  };

  const updateMemberRole = async (memberId, newRole) => {
    setActionLoadingMember(memberId);
    try {
      const membershipRef = doc(firestore, 'memberships', memberId);
      await updateDoc(membershipRef, { role: newRole });
      setTeamMembers((prev) => prev.map((member) => member.id === memberId ? { ...member, role: newRole } : member));
    } catch (err) {
      console.error('Failed to update team member role:', err);
      setManageError('Unable to update role.');
    } finally {
      setActionLoadingMember(null);
    }
  };

  const kickTeamMember = async (member) => {
    if (!selectedBusiness?.id || member.isOwner) return;
    setActionLoadingMember(member.id);
    try {
      const businessRef = doc(firestore, 'businesses', selectedBusiness.id);
      await updateDoc(businessRef, { members: arrayRemove(member.userId) });

      const userRef = doc(firestore, 'users', member.userId);
      await updateDoc(userRef, { businesses: arrayRemove(selectedBusiness.id) });

      const membershipRef = doc(firestore, 'memberships', member.id);
      await deleteDoc(membershipRef);

      setTeamMembers((prev) => prev.filter((item) => item.id !== member.id));
      if (selectedBusiness?.members) {
        selectBusiness({ ...selectedBusiness, members: selectedBusiness.members.filter((id) => id !== member.userId) });
      }
    } catch (err) {
      console.error('Failed to remove team member:', err);
      setManageError('Unable to remove team member.');
    } finally {
      setActionLoadingMember(null);
    }
  };

  return (
    <div>
      <TopBar title="Workers" />
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {inviteCode ? (
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Worker invite code</p>
              <p className="text-3xl font-bold font-mono tracking-[0.22em] text-[#7F77DD]">{inviteCode}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(inviteCode);
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2000);
              }}
            >
              {copiedInvite ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy code
                </>
              )}
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1">Team Size</div>
            <div className="text-2xl font-heading font-bold text-foreground">{teamSize}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1">Avg Productivity</div>
            <div className="text-2xl font-heading font-bold text-foreground">{avgProductivity}%</div>
            <Progress value={avgProductivity} className="mt-2 h-2" />
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-sm text-muted-foreground mb-1">Avg Satisfaction</div>
            <div className="text-2xl font-heading font-bold text-foreground">{avgSatisfaction}%</div>
            <Progress value={avgSatisfaction} className="mt-2 h-2" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <GradientButton onClick={askAI} disabled={loadingAI}>
            {loadingAI ? <Loader2 size={14} className="animate-spin mr-1" /> : <Users size={14} className="mr-1" />}
            Ask AI about team
          </GradientButton>
          {isOwner && (
            <Button type="button" variant="secondary" onClick={() => setManageDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              Manage workers
            </Button>
          )}
        </div>

        <Dialog open={manageDialogOpen} onOpenChange={(open) => setManageDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage workers</DialogTitle>
              <DialogDescription>
                View all team members and adjust roles or remove them from the business.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {manageLoading ? (
                <div>Loading team members...</div>
              ) : manageError ? (
                <div className="text-sm text-destructive">{manageError}</div>
              ) : teamMembers.length ? (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="font-medium text-foreground">{member.name}</div>
                          <div className="text-sm text-muted-foreground">{member.email || member.userId}</div>
                          <div className="text-xs text-muted-foreground">Role: {member.role}</div>
                          {member.isOwner && <div className="text-xs text-emerald-700">Business owner</div>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!member.isOwner && (
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.id, e.target.value)}
                              disabled={actionLoadingMember === member.id}
                              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                            >
                              <option value="worker">Worker</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                          {!member.isOwner && (
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => kickTeamMember(member)}
                              disabled={actionLoadingMember === member.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {actionLoadingMember === member.id ? 'Removing...' : 'Kick'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                  No team members found for this business yet.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {aiInsight && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-purple-800 mb-2">AI Team Insights</h3>
            <div className="prose prose-sm max-w-none text-purple-900">
              <ReactMarkdown>{aiInsight}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workers.map((w) => (
            <div key={w.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{w.name?.split(" ").map(n => n[0]).join("")}</span>
                </div>
                <div>
                  <div className="font-heading font-semibold text-foreground text-sm">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.role}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Productivity</span>
                    <span className="font-medium text-foreground">{w.productivity_score}%</span>
                  </div>
                  <Progress value={w.productivity_score} className="h-1.5" />
                </div>
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground mb-2">4-week trend</div>
                  <div className="h-14">
                    {w.productivity_history?.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getTrendData(w.productivity_history)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <XAxis dataKey="name" hide />
                          <YAxis hide domain={[dataMin => dataMin - 5, dataMax => dataMax + 5]} />
                          <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full rounded-lg bg-muted flex items-center justify-center text-[11px] text-muted-foreground">No trend data</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Satisfaction</span>
                    <span className="font-medium text-foreground">{w.satisfaction_score}%</span>
                  </div>
                  <Progress value={w.satisfaction_score} className="h-1.5" />
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border">
                  ${w.hourly_rate}/hr
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}