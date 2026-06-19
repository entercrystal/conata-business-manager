import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generateInviteCode } from "@/lib/utils";
import { Building2, UserCheck, Loader2, ArrowRight, ArrowLeft, Copy, Check } from "lucide-react";
import { db as firestore } from "@/lib/firebase";
import { addDoc, collection, updateDoc, doc, query, where, getDocs, arrayUnion } from "firebase/firestore";
import { toast } from "@/components/ui/use-toast";
import { retryFirestoreOperation } from "@/lib/firestore-utils";

export default function Setup() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { setActiveBusiness, joinBusiness } = useBusiness();
  
  // Role selection
  const [role, setRole] = useState(null); // "owner" or "worker"
  
  // Owner flow - business setup
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [businessSize, setBusinessSize] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  
  // Worker flow - join business
  const [inviteInput, setInviteInput] = useState("");
  const [joinJobTitle, setJoinJobTitle] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Check Firestore availability on mount
  useEffect(() => {
    console.log('[Setup] Component mounted', { 
      hasFirestore: !!firestore, 
      hasAppUser: !!appUser,
      appUserUid: appUser?.uid 
    });
    
    if (!firestore) {
      console.warn('[Setup] Firestore is not initialized');
      setError("Firestore database is not available. Please refresh the page and try again.");
    }
  }, []);

  useEffect(() => {
    // If user already has businesses, redirect to select-business
    if (appUser && appUser.businesses && appUser.businesses.length > 0) {
      navigate("/select-business");
    }
  }, [appUser, navigate]);

  // Role selection screen
  if (!role) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="mb-12 text-center">
            <h1 className="text-2xl font-bold text-[#7F77DD] mb-2">CoreFlow</h1>
            <h2 className="text-2xl font-bold text-foreground">Welcome to CoreFlow</h2>
            <p className="text-muted-foreground mt-2">Let's get your workspace set up.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setRole("owner")}
              className={cn(
                "p-6 rounded-lg border-2 transition-all text-left",
                "border-[#E5E5E3] bg-white hover:border-[#7F77DD] hover:bg-[#EEEDFE]"
              )}
            >
              <Building2 className="w-9 h-9 text-[#7F77DD] mb-3" />
              <h3 className="font-semibold text-foreground mb-1">I'm a business owner</h3>
              <p className="text-sm text-muted-foreground">Create your business workspace</p>
            </button>
            
            <button
              onClick={() => setRole("worker")}
              className={cn(
                "p-6 rounded-lg border-2 transition-all text-left",
                "border-[#E5E5E3] bg-white hover:border-[#7F77DD] hover:bg-[#EEEDFE]"
              )}
            >
              <UserCheck className="w-9 h-9 text-[#7F77DD] mb-3" />
              <h3 className="font-semibold text-foreground mb-1">I'm an employee</h3>
              <p className="text-sm text-muted-foreground">Join your company with an invite code</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Worker flow - join business
  if (role === "worker") {
    const handleJoinBusiness = async (e) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      // Check if Firestore is available
      if (!firestore) {
        setError("Database connection is not available. Please refresh the page and try again.");
        setLoading(false);
        return;
      }

      try {
        // Query for business with matching invite code
        const q = query(
          collection(firestore, "businesses"),
          where("inviteCode", "==", inviteInput.toUpperCase())
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Invalid invite code. Please ask your admin to double-check.");
          setLoading(false);
          return;
        }

        const joinedBusiness = await joinBusiness(inviteInput, joinJobTitle);

        toast({
          title: "Success",
          description: "You've joined the business!",
        });

        navigate("/worker/dashboard");
      } catch (err) {
        console.error('Join error:', err);
        let errorMsg = 'Failed to join business. Please try again.';
        if (err.code === 'unavailable') {
          errorMsg = 'Connection lost. Please check your internet connection and try again.';
        } else if (err.code === 'permission-denied') {
          errorMsg = 'You do not have permission to join this business.';
        } else if (err.message?.includes('offline')) {
          errorMsg = 'You appear to be offline. Please check your internet connection and try again.';
        } else if (err.message) {
          errorMsg = err.message;
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-lg border border-[#E5E5E3] p-9">
            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#7F77DD] mb-4">CoreFlow</h1>
              <h2 className="text-xl font-bold text-foreground">Join your business</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the invite code your admin shared with you.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleJoinBusiness} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="joinJobTitle">Your job title</Label>
                <Input
                  id="joinJobTitle"
                  type="text"
                  placeholder="e.g. Sales Rep, Designer"
                  value={joinJobTitle}
                  onChange={(e) => setJoinJobTitle(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inviteInput">Invite code</Label>
                <Input
                  id="inviteInput"
                  type="text"
                  maxLength="6"
                  placeholder="XXXXXX"
                  value={inviteInput.toUpperCase()}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                  disabled={loading}
                  required
                  className="text-center text-xl font-mono tracking-widest"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 font-medium bg-[#7F77DD] hover:bg-[#7F77DD]/90"
                disabled={loading || !inviteInput || !joinJobTitle}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join business"
                )}
              </Button>
            </form>

            <button
              onClick={() => setRole(null)}
              className="w-full mt-4 text-sm text-[#7F77DD] hover:underline flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Owner flow - business setup
  const handleNextStep = () => {
    if (step === 1) {
      if (!businessName || !industry || !businessSize) {
        setError("Please fill in all fields");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!jobTitle) {
        setError("Please enter your job title");
        return;
      }
      setError("");
      // Generate invite code before moving to review
      const code = generateInviteCode();
      setInviteCode(code);
      setStep(3);
    }
  };

  const handleBackStep = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchBusiness = async () => {
    setError("");
    setLoading(true);

    // Check if browser is online
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;
    
    console.log('[handleLaunchBusiness] Starting business launch...', {
      businessName,
      industry,
      businessSize,
      jobTitle,
      inviteCode,
      hasFirestore: !!firestore,
      hasAppUser: !!appUser,
      appUserUid: appUser?.uid,
      browserOnline: isOnline,
    });

    // Check if browser is online first
    if (!isOnline) {
      const errorMsg = "You appear to be offline. Please check your internet connection and try again.";
      console.error('[handleLaunchBusiness]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    // Check prerequisites
    if (!firestore) {
      const errorMsg = "Firestore is not initialized. Please refresh the page and try again.";
      console.error('[handleLaunchBusiness]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    if (!appUser?.uid) {
      const errorMsg = "User is not authenticated. Please log in again.";
      console.error('[handleLaunchBusiness]', errorMsg);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    // Set a timeout to prevent infinite hanging
    const launchTimeout = setTimeout(() => {
      console.warn('[handleLaunchBusiness] Timeout: business launch taking too long (> 10 seconds)');
      setError("Business creation is taking too long. Please try refreshing the page and try again.");
      setLoading(false);
    }, 10000);

    try {
      console.log('[handleLaunchBusiness] Creating business document...');
      // Create business document with retry
      const businessRef = await retryFirestoreOperation(
        () => addDoc(collection(firestore, "businesses"), {
          name: businessName,
          industry: industry,
          size: businessSize,
          ownerId: appUser.uid,
          inviteCode: inviteCode,
          createdAt: new Date().toISOString(),
        }),
        3,
        500
      );
      console.log('[handleLaunchBusiness] Business created with ID:', businessRef.id);

      console.log('[handleLaunchBusiness] Updating business with ID field...');
      // Update business with its own ID with retry
      await retryFirestoreOperation(
        () => updateDoc(businessRef, { id: businessRef.id }),
        3,
        500
      );
      console.log('[handleLaunchBusiness] Business ID updated');

      console.log('[handleLaunchBusiness] Creating membership for owner...');
      // Create membership for owner with retry
      await retryFirestoreOperation(
        () => addDoc(collection(firestore, "memberships"), {
          userId: appUser.uid,
          businessId: businessRef.id,
          role: "admin",
          jobTitle: jobTitle,
          phone: phoneNumber || "",
          hourlyRate: 0,
          salary: 0,
          createdAt: new Date().toISOString(),
        }),
        3,
        500
      );
      console.log('[handleLaunchBusiness] Membership created');

      console.log('[handleLaunchBusiness] Updating user businesses array...');
      // Update user's businesses array with retry
      const userRef = doc(firestore, "users", appUser.uid);

      await retryFirestoreOperation(
        () => updateDoc(userRef, {
          businesses: arrayUnion(businessRef.id),
        }),
        3,
        500
      );
      console.log('[handleLaunchBusiness] User businesses array updated');
      // Set active business
      console.log('[handleLaunchBusiness] Setting active business...');
      setActiveBusiness(businessRef.id);
      console.log('[handleLaunchBusiness] Active business set');

      clearTimeout(launchTimeout);

      console.log('[handleLaunchBusiness] Business launch completed successfully!');
      toast({
        title: "Success",
        description: "Your business workspace has been created!",
      });

      navigate("/admin/dashboard");
    } catch (err) {
      clearTimeout(launchTimeout);
      console.error('[handleLaunchBusiness] Error during business launch:', {
        message: err.message,
        code: err.code,
        details: err,
      });
      
      // Provide specific error messages
      let errorMsg = "Failed to create business. Please try again.";
      if (err.code === 'unavailable') {
        errorMsg = "Connection lost. Please check your internet connection and try again.";
      } else if (err.code === 'permission-denied') {
        errorMsg = "You don't have permission to create a business. Please check your account settings.";
      } else if (err.message?.includes('offline')) {
        errorMsg = "You appear to be offline. Please check your internet connection and try again.";
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setLoading(false);
    }
  };

  // Step 1: About your business
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#E5E5E3] p-9">
            {/* Step indicator */}
            <div className="mb-8 flex justify-center items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-bold">1</div>
              <div className="w-12 h-0.5 bg-[#E5E5E3]"></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#E5E5E3] text-[#73726C] flex items-center justify-center text-sm font-bold">2</div>
              <div className="w-12 h-0.5 bg-[#E5E5E3]"></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#E5E5E3] text-[#73726C] flex items-center justify-center text-sm font-bold">3</div>
            </div>

            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#7F77DD] mb-6">CoreFlow</h1>
              <h2 className="text-lg font-bold text-foreground">Tell us about your business</h2>
              <p className="text-sm text-muted-foreground mt-2">This helps CoreFlow personalize your experience.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Acme Agency"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                  required
                >
                  <option value="">Select an industry</option>
                  <option value="Retail">Retail</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Technology">Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Construction">Construction</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Finance">Finance</option>
                  <option value="Education">Education</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-3">
                <Label>Business size</Label>
                <div className="grid grid-cols-1 gap-2">
                  {["1–10 employees", "11–50 employees", "51–200 employees"].map((size) => (
                    <button
                      key={size}
                      onClick={() => setBusinessSize(size)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-sm font-medium transition-all text-left",
                        businessSize === size
                          ? "bg-[#EEEDFE] border-[#7F77DD] text-[#7F77DD]"
                          : "bg-white border-[#E5E5E3] text-[#73726C] hover:border-[#7F77DD]"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleNextStep}
              className="w-full h-12 font-medium bg-[#7F77DD] hover:bg-[#7F77DD]/90"
              disabled={!businessName || !industry || !businessSize}
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Your role
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#E5E5E3] p-9">
            {/* Step indicator */}
            <div className="mb-8 flex justify-center items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="w-12 h-0.5 bg-[#7F77DD]"></div>
              <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-bold">2</div>
              <div className="w-12 h-0.5 bg-[#E5E5E3]"></div>
              <div className="w-8 h-8 rounded-full border-2 border-[#E5E5E3] text-[#73726C] flex items-center justify-center text-sm font-bold">3</div>
            </div>

            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#7F77DD] mb-6">CoreFlow</h1>
              <h2 className="text-lg font-bold text-foreground">Set up your admin profile</h2>
              <p className="text-sm text-muted-foreground mt-2">This is how you'll appear in CoreFlow.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Your job title</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="e.g. CEO, Owner, Manager"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Your phone number (optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackStep}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleNextStep}
                className="flex-1 h-12 font-medium bg-[#7F77DD] hover:bg-[#7F77DD]/90"
                disabled={!jobTitle}
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Review & launch
  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-xl border border-[#E5E5E3] p-9">
            {/* Step indicator */}
            <div className="mb-8 flex justify-center items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="w-12 h-0.5 bg-[#7F77DD]"></div>
              <div className="w-8 h-8 rounded-full bg-[#1D9E75] text-white flex items-center justify-center text-sm font-bold">✓</div>
              <div className="w-12 h-0.5 bg-[#7F77DD]"></div>
              <div className="w-8 h-8 rounded-full bg-[#7F77DD] text-white flex items-center justify-center text-sm font-bold">3</div>
            </div>

            <div className="mb-8">
              <h1 className="text-xl font-bold text-[#7F77DD] mb-6">CoreFlow</h1>
              <h2 className="text-lg font-bold text-foreground">You're all set!</h2>
              <p className="text-sm text-muted-foreground mt-2">Here's a summary before we launch your workspace.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Summary card */}
            <div className="bg-[#F8F8F6] border border-[#E5E5E3] rounded-xl p-4 mb-6 space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Business name</p>
                <p className="font-semibold text-foreground">{businessName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Industry</p>
                <p className="font-semibold text-foreground">{industry}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Business size</p>
                <p className="font-semibold text-foreground">{businessSize}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Your job title</p>
                <p className="font-semibold text-foreground">{jobTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Your email</p>
                <p className="font-semibold text-foreground">{appUser?.email}</p>
              </div>
            </div>

            {/* Invite code section */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Your worker invite code</p>
              <div className="bg-white border border-[#E5E5E3] rounded-xl p-4 mb-3 text-center">
                <p className="text-2xl font-bold font-mono text-[#7F77DD] tracking-widest">{inviteCode}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Share this code with your workers so they can join your business when they sign up.
              </p>
              <Button
                variant="outline"
                onClick={copyToClipboard}
                className="w-full h-10 text-sm"
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
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleBackStep}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleLaunchBusiness}
                className="flex-1 h-12 font-medium bg-[#7F77DD] hover:bg-[#7F77DD]/90"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    🚀 Launch
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
