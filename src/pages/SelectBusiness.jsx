import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '@/components/layout/TopBar';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { db as firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ChevronRight, Trash2, Copy, Check } from 'lucide-react';

export default function SelectBusiness() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { businesses, selectedBusiness, selectBusiness, loading, createBusiness, joinBusiness, leaveBusiness, deleteBusiness, updateBusiness } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) {
      setError('Business name is required');
      return;
    }

    try {
      setIsCreating(true);
      const createdBusiness = await createBusiness(formData.name, formData.description);
      setFormData({ name: '', description: '' });
      setCreatedInviteCode(createdBusiness?.inviteCode || '');
      setIsOpen(false);
      setInviteDialogOpen(true);
    } catch (err) {
      setError(err.message || 'Failed to create business');
      console.error('Create business error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewJoin = async (e) => {
    e?.preventDefault?.();
    setJoinError('');
    setJoinPreview(null);

    const code = joinInviteCode.trim().toUpperCase();
    if (!code) {
      setJoinError('Please enter an invite code.');
      return;
    }

    if (!firestore) {
      setJoinError('Database is not available. Please refresh and try again.');
      return;
    }

    setJoinLoading(true);
    try {
      const businessQuery = query(collection(firestore, 'businesses'), where('inviteCode', '==', code));
      const snaps = await getDocs(businessQuery);
      if (snaps.empty) {
        setJoinError('No business was found for that code. Please verify it.');
        return;
      }
      const businessDoc = snaps.docs[0];
      setJoinPreview({ id: businessDoc.id, ...businessDoc.data() });
    } catch (err) {
      console.error('Join preview error:', err);
      setJoinError(err.message || 'Unable to find business.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    setJoinError('');
    if (!joinPreview) {
      setJoinError('Please preview the business before joining.');
      return;
    }
    setJoinLoading(true);
    try {
      await joinBusiness(joinInviteCode);
      setJoinDialogOpen(false);
      setJoinInviteCode('');
      setJoinPreview(null);
      navigate('/');
    } catch (err) {
      console.error('Join business error:', err);
      setJoinError(err.message || 'Failed to join business.');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Select Business" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-semibold">Choose a business</h2>
          <div className="flex flex-wrap gap-2">
            <Dialog open={joinDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setJoinInviteCode('');
                setJoinPreview(null);
                setJoinError('');
              }
              setJoinDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button variant="outline">Join Business</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Business</DialogTitle>
                  <DialogDescription>
                    Enter an invite code to preview the business before joining.
                  </DialogDescription>
                </DialogHeader>
                {!joinPreview ? (
                  <form onSubmit={handlePreviewJoin} className="space-y-4">
                    <div>
                      <Label htmlFor="inviteCode">Invite Code</Label>
                      <Input
                        id="inviteCode"
                        value={joinInviteCode}
                        onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                        placeholder="Enter code from your admin"
                        maxLength={6}
                      />
                    </div>
                    {joinError && <div className="text-sm text-destructive">{joinError}</div>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setJoinDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={joinLoading || !joinInviteCode.trim()}>
                        {joinLoading ? 'Looking...' : 'Preview'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="text-sm text-muted-foreground mb-2">Business found</p>
                      <div className="font-semibold text-lg">{joinPreview.name}</div>
                      <p className="text-sm text-muted-foreground mb-2">{joinPreview.description || 'No description provided.'}</p>
                      <p className="text-sm text-muted-foreground">Invite code: <span className="font-mono">{joinInviteCode.trim().toUpperCase()}</span></p>
                    </div>
                    {joinError && <div className="text-sm text-destructive">{joinError}</div>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setJoinPreview(null)}>
                        Back
                      </Button>
                      <Button type="button" onClick={handleConfirmJoin} disabled={joinLoading}>
                        {joinLoading ? 'Joining...' : 'Join'}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>+ Create Business</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Business</DialogTitle>
                  <DialogDescription>
                    Enter your business details to get started.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBusiness} className="space-y-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      placeholder="e.g. My Company"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessDescription">Description</Label>
                    <Textarea
                      id="businessDescription"
                      placeholder="Brief description of your business (optional)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={isCreating}
                      rows={3}
                    />
                  </div>
                  {error && <div className="text-sm text-destructive">{error}</div>}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : businesses.length ? (
          <ul className="space-y-2">
            {businesses.map((b) => (
              <li key={b.id} className={`p-3 border rounded-lg ${selectedBusiness?.id === b.id ? 'bg-muted/30' : ''}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{b.name || b.id}</div>
                    <div className="text-sm text-muted-foreground">{b.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.owner === appUser?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateToEdit(b);
                          setEditFormData({ name: b.name || '', description: b.description || '' });
                          setEditError('');
                          setEditDialogOpen(true);
                        }}
                        className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    {b.owner === appUser?.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateToDelete(b);
                          setDeleteConfirmationName('');
                          setDeleteDialogOpen(true);
                        }}
                        className="inline-flex h-9 items-center rounded-full border border-destructive bg-destructive px-3 text-sm text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await leaveBusiness(b.id);
                            if (selectedBusiness?.id === b.id) {
                              navigate('/select-business');
                            }
                          } catch (err) {
                            console.error('Leave business failed:', err);
                            alert(err.message || 'Unable to leave business.');
                          }
                        }}
                        className="inline-flex h-9 items-center rounded-full border border-destructive bg-destructive px-3 text-sm text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
                      >
                        Leave
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        selectBusiness(b);
                        navigate('/');
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted transition-colors"
                      title="Select business"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <div className="text-muted-foreground mb-4">No businesses found.</div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>Create Your First Business</Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
        <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCreatedInviteCode('');
            setInviteCopied(false);
          }
          setInviteDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite code created</DialogTitle>
              <DialogDescription>
                Share this code with your workers so they can join your business.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Worker Invite Code</p>
                <p className="text-2xl font-bold font-mono text-[#7F77DD] tracking-widest">{createdInviteCode}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(createdInviteCode);
                    setInviteCopied(true);
                    setTimeout(() => setInviteCopied(false), 2000);
                  }}
                >
                  {inviteCopied ? (
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
                <Button type="button" onClick={() => setInviteDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCandidateToDelete(null);
            setDeleteConfirmationName('');
          }
          setDeleteDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete business</DialogTitle>
              <DialogDescription>
                This action cannot be undone. Please type the business name below to confirm deletion.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground mb-2">Business to delete</p>
                <div className="font-medium text-foreground">{candidateToDelete?.name || candidateToDelete?.id}</div>
              </div>
              <div>
                <Label htmlFor="confirmBusinessName">Type the business name to confirm</Label>
                <Input
                  id="confirmBusinessName"
                  placeholder={candidateToDelete?.name || 'Business name'}
                  value={deleteConfirmationName}
                  onChange={(e) => setDeleteConfirmationName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteConfirmationName !== (candidateToDelete?.name || candidateToDelete?.id)}
                  variant="destructive"
                  onClick={async () => {
                    if (!candidateToDelete) return;
                    try {
                      await deleteBusiness(candidateToDelete.id);
                      setDeleteDialogOpen(false);
                      if (selectedBusiness?.id === candidateToDelete.id) {
                        navigate('/select-business');
                      }
                    } catch (err) {
                      console.error('Delete business failed:', err);
                      alert(err.message || 'Unable to delete business.');
                    } finally {
                      setCandidateToDelete(null);
                      setDeleteConfirmationName('');
                    }
                  }}
                >
                  Delete business
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setCandidateToEdit(null);
            setEditFormData({ name: '', description: '' });
            setEditError('');
          }
          setEditDialogOpen(open);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit business</DialogTitle>
              <DialogDescription>
                Update the business name or description. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!candidateToEdit) return;
                if (!editFormData.name.trim()) {
                  setEditError('Business name cannot be empty');
                  return;
                }
                if (editFormData.name === (candidateToEdit.name || '') && editFormData.description === (candidateToEdit.description || '')) {
                  setEditDialogOpen(false);
                  return;
                }
                setIsSavingEdit(true);
                try {
                  await updateBusiness(candidateToEdit.id, {
                    name: editFormData.name,
                    description: editFormData.description,
                  });
                  setEditDialogOpen(false);
                } catch (err) {
                  console.error('Edit business failed:', err);
                  setEditError(err.message || 'Unable to save business updates.');
                } finally {
                  setIsSavingEdit(false);
                }
              }}
            >
              <div>
                <Label htmlFor="editBusinessName">Business Name</Label>
                <Input
                  id="editBusinessName"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editBusinessDescription">Description</Label>
                <Textarea
                  id="editBusinessDescription"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              {editError && <div className="text-sm text-destructive">{editError}</div>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
