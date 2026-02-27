import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Plus, Trash2, Pencil, X, MapPin, Award, Loader2 } from "lucide-react";

const COMMON_CLASS_TYPES = ["reformer", "mat", "jumpboard", "hiit", "barre", "tower", "cadillac", "chair", "prenatal", "sculpt"];

interface StudioOption {
  id: string;
  name: string;
  location: string | null;
}

interface Instructor {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  user_id: string | null;
  display_order: number;
  studio_id: string | null;
  linked_email?: string | null;
  authorized_studios: string[];
  certified_class_types: string[];
}

export default function InstructorsTab() {
  const { activeStudio, memberships } = useStudio();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Provision modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAuthorizedStudios, setNewAuthorizedStudios] = useState<string[]>([]);
  const [newCertifiedTypes, setNewCertifiedTypes] = useState<string[]>([]);
  const [newCustomType, setNewCustomType] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Instructor | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAuthorizedStudios, setEditAuthorizedStudios] = useState<string[]>([]);
  const [editCertifiedTypes, setEditCertifiedTypes] = useState<string[]>([]);
  const [customType, setCustomType] = useState("");
  const [saving, setSaving] = useState(false);

  // Org studios for multi-select
  const [orgStudios, setOrgStudios] = useState<StudioOption[]>([]);

  const fetchInstructors = async () => {
    if (!activeStudio) return;
    setLoading(true);

    const { data } = await supabase
      .from("instructors")
      .select("id, name, bio, photo_url, user_id, display_order, studio_id, authorized_studios, certified_class_types")
      .eq("studio_id", activeStudio.id)
      .order("display_order");

    const items: Instructor[] = ((data ?? []) as any[]).map((i) => ({
      ...i,
      authorized_studios: i.authorized_studios ?? [],
      certified_class_types: i.certified_class_types ?? [],
    }));

    const userIds = items.filter((i) => i.user_id).map((i) => i.user_id!);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, email").in("id", userIds);
      const emailMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email; });
      items.forEach((i) => { if (i.user_id) i.linked_email = emailMap[i.user_id] || null; });
    }

    setInstructors(items);
    setLoading(false);
  };

  // Fetch all studios in the org for multi-select
  useEffect(() => {
    const fetchOrgStudios = async () => {
      const studioIds = memberships.map((m) => m.studio_id);
      if (studioIds.length === 0) return;
      const { data } = await supabase
        .from("studios")
        .select("id, name, location")
        .in("id", studioIds);
      setOrgStudios((data ?? []) as StudioOption[]);
    };
    fetchOrgStudios();
  }, [memberships]);

  useEffect(() => { fetchInstructors(); }, [activeStudio?.id]);

  // ── Provision Instructor (new flow) ──
  const resetAddForm = () => {
    setNewFirstName("");
    setNewLastName("");
    setNewEmail("");
    setNewAuthorizedStudios([]);
    setNewCertifiedTypes([]);
    setNewCustomType("");
  };

  const handleProvisionInstructor = async () => {
    if (!activeStudio || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    setProvisioning(true);

    const { data, error } = await supabase.functions.invoke("provision-instructor", {
      body: {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        studio_id: activeStudio.id,
        authorized_studios: newAuthorizedStudios,
        certified_class_types: newCertifiedTypes,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to provision instructor");
    } else {
      toast.success(`Instructor provisioned successfully. An invite email has been sent to ${newEmail.trim()}.`);
      resetAddForm();
      setShowAdd(false);
      fetchInstructors();
    }
    setProvisioning(false);
  };

  const toggleNewAuthorizedStudio = (studioId: string) => {
    setNewAuthorizedStudios((prev) =>
      prev.includes(studioId) ? prev.filter((id) => id !== studioId) : [...prev, studioId]
    );
  };

  const toggleNewCertifiedType = (type: string) => {
    setNewCertifiedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const addNewCustomType = () => {
    const t = newCustomType.trim().toLowerCase();
    if (t && !newCertifiedTypes.includes(t)) {
      setNewCertifiedTypes((prev) => [...prev, t]);
    }
    setNewCustomType("");
  };

  // ── Delete ──
  const handleDeleteInstructor = async (inst: Instructor) => {
    const { error } = await supabase.from("instructors").delete().eq("id", inst.id);
    if (error) toast.error("Failed to delete instructor");
    else { toast.success("Instructor removed"); fetchInstructors(); }
  };

  // ── Edit modal handlers ──
  const openEditDialog = (inst: Instructor) => {
    setEditTarget(inst);
    setEditName(inst.name);
    setEditBio(inst.bio ?? "");
    setEditAuthorizedStudios(inst.authorized_studios);
    setEditCertifiedTypes(inst.certified_class_types);
    setCustomType("");
    setEditDialogOpen(true);
  };

  const toggleAuthorizedStudio = (studioId: string) => {
    setEditAuthorizedStudios((prev) =>
      prev.includes(studioId) ? prev.filter((id) => id !== studioId) : [...prev, studioId]
    );
  };

  const toggleCertifiedType = (type: string) => {
    setEditCertifiedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const addCustomType = () => {
    const t = customType.trim().toLowerCase();
    if (t && !editCertifiedTypes.includes(t)) {
      setEditCertifiedTypes((prev) => [...prev, t]);
    }
    setCustomType("");
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase.from("instructors").update({
      name: editName.trim(),
      bio: editBio.trim() || null,
      authorized_studios: editAuthorizedStudios,
      certified_class_types: editCertifiedTypes,
    } as any).eq("id", editTarget.id);

    if (error) toast.error("Failed to update instructor");
    else { toast.success("Instructor updated"); setEditDialogOpen(false); fetchInstructors(); }
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse text-muted-foreground py-8 text-center">Loading instructors...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Instructors</CardTitle>
            <CardDescription>Manage your studio's instructors.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { resetAddForm(); setShowAdd(true); }}><Plus className="h-4 w-4 mr-1" />Add Instructor</Button>
        </CardHeader>
        <CardContent>
          {instructors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No instructors yet.</p>
          ) : (
            <div className="divide-y">
              {instructors.map((inst) => (
                <div key={inst.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-sm">{inst.name}</p>
                    {inst.bio && <p className="text-xs text-muted-foreground line-clamp-1">{inst.bio}</p>}
                    {inst.linked_email && (
                      <span className="text-[10px] text-muted-foreground">{inst.linked_email}</span>
                    )}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {inst.authorized_studios.length > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {inst.authorized_studios.length} location{inst.authorized_studios.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      {inst.certified_class_types.length > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <Award className="h-2.5 w-2.5" />
                          {inst.certified_class_types.length} cert{inst.certified_class_types.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => openEditDialog(inst)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteInstructor(inst)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Provision Instructor Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Provision New Instructor</DialogTitle>
            <DialogDescription>Create their account, set locations & certifications. An invite email will be sent automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="new-first-name">First Name</Label>
                <Input id="new-first-name" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Sarah" />
              </div>
              <div>
                <Label htmlFor="new-last-name">Last Name</Label>
                <Input id="new-last-name" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Johnson" />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="new-email">Email Address</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="sarah@example.com" />
            </div>

            {/* Authorized Locations */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Authorized Locations
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select studios this instructor can float to for SmartCover requests.
              </p>
              <div className="space-y-2 rounded-md border border-input p-3 max-h-40 overflow-y-auto">
                {orgStudios.map((studio) => (
                  <label key={studio.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={newAuthorizedStudios.includes(studio.id)}
                      onCheckedChange={() => toggleNewAuthorizedStudio(studio.id)}
                    />
                    <span className="font-medium">{studio.name}</span>
                    {studio.location && <span className="text-xs text-muted-foreground">· {studio.location}</span>}
                  </label>
                ))}
                {orgStudios.length === 0 && (
                  <p className="text-xs text-muted-foreground">No studios found in your organization.</p>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <Award className="h-3.5 w-3.5 text-primary" />
                Certifications / Class Types
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the class types this instructor is certified to teach.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_CLASS_TYPES.map((type) => {
                  const isSelected = newCertifiedTypes.includes(type);
                  return (
                    <Badge
                      key={type}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer text-xs capitalize transition-all ${
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleNewCertifiedType(type)}
                    >
                      {type}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {newCertifiedTypes
                  .filter((t) => !COMMON_CLASS_TYPES.includes(t))
                  .map((type) => (
                    <Badge key={type} className="cursor-pointer text-xs capitalize bg-primary text-primary-foreground" onClick={() => toggleNewCertifiedType(type)}>
                      {type}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom type…"
                  value={newCustomType}
                  onChange={(e) => setNewCustomType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewCustomType())}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addNewCustomType} disabled={!newCustomType.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={handleProvisionInstructor}
              disabled={provisioning || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()}
            >
              {provisioning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Provisioning…</>
              ) : (
                "Save Instructor"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Instructor Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit {editTarget?.name}</DialogTitle>
            <DialogDescription>Update profile, authorized locations, and certifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-bio">Bio</Label>
                <textarea id="edit-bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={2}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
            </div>

            {/* Authorized Locations */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Authorized Locations
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select studios this instructor can float to for SmartCover requests.
              </p>
              <div className="space-y-2 rounded-md border border-input p-3 max-h-40 overflow-y-auto">
                {orgStudios.map((studio) => (
                  <label key={studio.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={editAuthorizedStudios.includes(studio.id)}
                      onCheckedChange={() => toggleAuthorizedStudio(studio.id)}
                    />
                    <span className="font-medium">{studio.name}</span>
                    {studio.location && <span className="text-xs text-muted-foreground">· {studio.location}</span>}
                  </label>
                ))}
                {orgStudios.length === 0 && (
                  <p className="text-xs text-muted-foreground">No studios found in your organization.</p>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2">
                <Award className="h-3.5 w-3.5 text-primary" />
                Certifications / Class Types
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the class types this instructor is certified to teach.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_CLASS_TYPES.map((type) => {
                  const isSelected = editCertifiedTypes.includes(type);
                  return (
                    <Badge
                      key={type}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer text-xs capitalize transition-all ${
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleCertifiedType(type)}
                    >
                      {type}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editCertifiedTypes
                  .filter((t) => !COMMON_CLASS_TYPES.includes(t))
                  .map((type) => (
                    <Badge key={type} className="cursor-pointer text-xs capitalize bg-primary text-primary-foreground" onClick={() => toggleCertifiedType(type)}>
                      {type}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom type…"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomType())}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={addCustomType} disabled={!customType.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
