import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react";
import TopBar from "@/components/layout/TopBar";
import { db as firestore } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generateInviteCode } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

export default function AdminSettings() {
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    const loadBusiness = async () => {
      if (!activeBusiness) {
        navigate("/select-business");
        return;
      }

      try {
        const docRef = doc(firestore, "businesses", activeBusiness);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBusiness({ id: activeBusiness, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Failed to load business:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [activeBusiness, navigate]);

  const copyToClipboard = () => {
    if (business?.inviteCode) {
      navigator.clipboard.writeText(business.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateNewCode = async () => {
    setGeneratingCode(true);
    try {
      const newCode = generateInviteCode();
      const docRef = doc(firestore, "businesses", activeBusiness);
      await updateDoc(docRef, { inviteCode: newCode });
      setBusiness({ ...business, inviteCode: newCode });
      toast({
        title: "Success",
        description: "New invite code generated. Old code is now invalid.",
      });
    } catch (err) {
      console.error("Failed to generate new code:", err);
      toast({
        title: "Error",
        description: "Failed to generate new invite code.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

        {/* Worker Invite Code Section */}
        <div className="bg-white border border-[#E5E5E3] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Worker Invite Code</h3>
          <p className="text-sm text-muted-foreground mb-4">Share this code with your workers</p>

          {business?.inviteCode && (
            <>
              <div className="bg-white border border-[#E5E5E3] rounded-xl p-4 mb-4 text-center">
                <p className="text-2xl font-bold font-mono text-[#7F77DD] tracking-widest">
                  {business.inviteCode}
                </p>
              </div>

              <Button
                onClick={copyToClipboard}
                className="w-full h-10 mb-3 font-medium"
                variant="outline"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy code
                  </>
                )}
              </Button>

              <Button
                onClick={handleGenerateNewCode}
                className="w-full h-10"
                variant="outline"
                disabled={generatingCode}
              >
                {generatingCode ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate new code
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
