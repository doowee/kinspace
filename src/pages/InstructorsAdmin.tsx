import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { studioColorClass } from "@/lib/studio-colors";
import { toast } from "sonner";
import { GraduationCap, Search, Pencil, Plus, MapPin, Award, X, Home, Loader2, UserX, AlertTriangle, Eye, EyeOff } from "lucide-react";

const COMMON_CLASS_TYPES = ["reformer", "mat", "jumpboard", "hiit", "barre", "tower", "cadillac", "chair", "prenatal", "sculpt"];

interface StudioOption {
  id: string;
  name: string;
  location: string | null;
}

interface InstructorRow {
  id: string;
  name: string;
  bio: string | null;
  user_id: string | null;
  studio_id: string | null;
  home_studio_id: string | null;
  authorized_studios: string[];
  certified_class_types: string[];
  linked_email?: string | null;
  is_active: boolean;
}

export default function InstructorsAdmin() {
  const { activeStudio, memberships } = useStudio();
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  // Org studios
  const [orgStudios, setOrgStudios] = useState<StudioOption[]>([]);
  const studioMap = useMemo(() => {
    const m: Record<string, StudioOption> = {};
    orgStudios.forEach((s) => { m[s.id] = s; });
    return m;
  }, [orgStudios]);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstructorRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHomeStudio, setEditHomeStudio] = useState<string>("none");
  const [editAuthorized, setEditAuthorized] = useState<string[]>([]);
  const [editCerts, setEditCerts] = useState<string[]>([]);
  const [customType, setCustomType] = useState("");
  const [saving, setSaving] = useState(false);

  // Add/Provision state
  const [addOpen, setAddOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAuthorized, setNewAuthorized] = useState<string[]>([]);
  const [newCerts, setNewCerts] = useState<string[]>([]);
  const [newCustomType, setNewCustomType] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  // Offboard state
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<InstructorRow | null>(null);
  const [offboardLoading, setOffboardLoading] = useState(false);
  const [upcomingClassCount, setUpcomingClassCount] = useState(0);

  // Fetch org studios
  useEffect(() => {
    const fetch = async () => {
      const studioIds = memberships.map((m) => m.studio_id);
      if (studioIds.length === 0) return;
      const { data } = await supabase.from("studios").select("id, name, location").in("id", studioIds);
      setOrgStudios((data ?? []) as StudioOption[]);
    };
    fetch();
  }, [memberships]);

  const fetchInstructors = async () => {
    if (!activeStudio) { setLoading(false); return; }
    setLoading(true);

    const { data: studioRow } = await supabase
      .from("studios").select("organization_id").eq("id", activeStudio.id).single();
    const orgId = studioRow?.organization_id;

    let studioIds = [activeStudio.id];
    if (orgId) {
      const { data: orgStudios } = await supabase.from("studios").select("id").eq("organization_id", orgId);
      if (orgStudios?.length) studioIds = orgStudios.map((s) => s.id);
    }

    const { data } = await supabase
      .from("instructors")
      .select("id, name, bio, user_id, studio_id, home_studio_id, authorized_studios, certified_class_types, is_active")
      .in("studio_id", studioIds)
      .order("name");

    const items: InstructorRow[] = ((data ?? []) as any[]).map((i) => ({
      ...i,
      authorized_studios: i.authorized_studios ?? [],
      certified_class_types: i.certified_class_types ?? [],
      is_active: i.is_active ?? true,
    }));

    const userIds = items.filter((i) => i.user_id).map((i) => i.user_id!);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
      const emailMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email; });
      items.forEach((i) => { if (i.user_id) i.linked_email = emailMap[i.user_id] || null; });
    }

    setInstructors(items);
    setLoading(false);
  };

  useEffect(() => { fetchInstructors(); }, [activeStudio?.id]);

  const filtered = useMemo(() => {
    const byStatus = instructors.filter((i) =>
      activeTab === "active" ? i.is_active : !i.is_active
    );
    if (!search.trim()) return byStatus;
    const q = search.toLowerCase();
    return byStatus.filter((i) =>
      i.name.toLowerCase().includes(q) || i.linked_email?.toLowerCase().includes(q) || i.bio?.toLowerCase().includes(q)
    );
  }, [instructors, search, activeTab]);

  const activeCount = instructors.filter((i) => i.is_active).length;
  const deactivatedCount = instructors.filter((i) => !i.is_active).length;

  // Edit handlers
  const openEdit = (inst: InstructorRow) => {
    setEditTarget(inst);
    setEditName(inst.name);
    setEditBio(inst.bio ?? "");
    setEditHomeStudio(inst.home_studio_id ?? "none");
    setEditAuthorized(inst.authorized_studios);
    setEditCerts(inst.certified_class_types);
    setCustomType("");
    setEditOpen(true);
  };

  const toggleAuthorized = (id: string) => {
    setEditAuthorized((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleCert = (type: string) => {
    setEditCerts((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const addCustom = () => {
    const t = customType.trim().toLowerCase();
    if (t && !editCerts.includes(t)) setEditCerts((prev) => [...prev, t]);
    setCustomType("");
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    const { error } = await supabase.from("instructors").update({
      name: editName.trim(),
      bio: editBio.trim() || null,
      home_studio_id: editHomeStudio === "none" ? null : editHomeStudio,
      authorized_studios: editAuthorized,
      certified_class_types: editCerts,
    } as any).eq("id", editTarget.id);

    if (error) toast.error("Failed to update");
    else { toast.success("Instructor updated"); setEditOpen(false); fetchInstructors(); }
    setSaving(false);
  };

  // Provision handler
  const resetAddForm = () => {
    setNewFirstName(""); setNewLastName(""); setNewEmail("");
    setNewAuthorized([]); setNewCerts([]); setNewCustomType("");
  };

  const handleProvision = async () => {
    if (!activeStudio || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;
    setProvisioning(true);
    const { data, error } = await supabase.functions.invoke("provision-instructor", {
      body: {
        first_name: newFirstName.trim(),
        last_name: newLastName.trim(),
        email: newEmail.trim(),
        studio_id: activeStudio.id,
        authorized_studios: newAuthorized,
        certified_class_types: newCerts,
      },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to provision instructor");
    } else {
      toast.success(`Instructor provisioned successfully. An invite email has been sent to ${newEmail.trim()}.`);
      resetAddForm();
      setAddOpen(false);
      fetchInstructors();
    }
    setProvisioning(false);
  };

  const toggleNewAuthorized = (id: string) => {
    setNewAuthorized((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleNewCert = (type: string) => {
    setNewCerts((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);
  };

  const addNewCustom = () => {
    const t = newCustomType.trim().toLowerCase();
    if (t && !newCerts.includes(t)) setNewCerts((prev) => [...prev, t]);
    setNewCustomType("");
  };

  // Offboard handler
  const openOffboard = async (inst: InstructorRow) => {
    setOffboardTarget(inst);
    setOffboardLoading(false);

    // Query upcoming class count
    const { count } = await supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", inst.id)
      .gt("start_time", new Date().toISOString());

    setUpcomingClassCount(count ?? 0);
    setOffboardOpen(true);
  };

  const handleOffboard = async () => {
    if (!offboardTarget || !activeStudio) return;
    setOffboardLoading(true);

    const { data, error } = await supabase.functions.invoke("offboard-instructor", {
      body: {
        instructor_id: offboardTarget.id,
        studio_id: activeStudio.id,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to offboard instructor");
    } else {
      toast.success(`${offboardTarget.name} has been offboarded. ${data.orphaned_classes} upcoming class(es) are now unassigned.`);
      setOffboardOpen(false);
      setOffboardTarget(null);
      fetchInstructors();
    }
    setOffboardLoading(false);
  };

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Instructors</h2>
          <p className="mt-1 text-muted-foreground">All instructors across your organization</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
            <GraduationCap className="h-4 w-4" />{activeCount} active
          </Badge>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="deactivated" className="gap-1.5">
            <EyeOff className="h-3.5 w-3.5" />Deactivated ({deactivatedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Loading instructors…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? `No instructors matching "${search}"` : activeTab === "active" ? "No active instructors." : "No deactivated instructors."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Home Studio</TableHead>
                        <TableHead>Certifications</TableHead>
                        <TableHead>Locations</TableHead>
                        <TableHead>Email</TableHead>
                        {activeTab === "active" && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((inst) => (
                        <TableRow key={inst.id} className={!inst.is_active ? "opacity-60" : ""}>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{inst.name}</span>
                                {!inst.is_active && (
                                  <Badge variant="secondary" className="text-[10px]">Deactivated</Badge>
                                )}
                              </div>
                              {inst.bio && <p className="text-xs text-muted-foreground line-clamp-1">{inst.bio}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {inst.home_studio_id && studioMap[inst.home_studio_id] ? (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Home className="h-2.5 w-2.5" />
                                {studioMap[inst.home_studio_id].name}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {inst.certified_class_types.length > 0 ? (
                                inst.certified_class_types.slice(0, 3).map((t) => (
                                  <Badge key={t} variant="secondary" className="text-[10px] capitalize">{t}</Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              {inst.certified_class_types.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">+{inst.certified_class_types.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {inst.authorized_studios.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <MapPin className="h-2.5 w-2.5" />
                                {inst.authorized_studios.length}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {inst.linked_email ? (
                              <span className="text-[10px] text-muted-foreground">{inst.linked_email}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {activeTab === "active" && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(inst)}>
                                  <Pencil className="h-3 w-3 mr-1" />Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                  onClick={() => openOffboard(inst)}
                                >
                                  <UserX className="h-3 w-3" />Offboard
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit {editTarget?.name}</DialogTitle>
            <DialogDescription>Update profile, home studio, authorized locations, and certifications.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><Label>Bio</Label><textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" /></div>
            </div>

            {/* Home Studio */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><Home className="h-3.5 w-3.5 text-primary" />Home Studio</Label>
              <Select value={editHomeStudio} onValueChange={setEditHomeStudio}>
                <SelectTrigger><SelectValue placeholder="Select home studio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {orgStudios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.location ? ` · ${s.location}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Authorized Locations */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><MapPin className="h-3.5 w-3.5 text-primary" />Authorized Locations</Label>
              <p className="text-xs text-muted-foreground mb-2">Studios this instructor can float to for SmartCover.</p>
              <div className="space-y-2 rounded-md border border-input p-3 max-h-40 overflow-y-auto">
                {orgStudios.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={editAuthorized.includes(s.id)} onCheckedChange={() => toggleAuthorized(s.id)} />
                    <span className="font-medium">{s.name}</span>
                    {s.location && <span className="text-xs text-muted-foreground">· {s.location}</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><Award className="h-3.5 w-3.5 text-primary" />Certifications / Class Types</Label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_CLASS_TYPES.map((type) => {
                  const sel = editCerts.includes(type);
                  return (
                    <Badge key={type} variant={sel ? "default" : "outline"} className={`cursor-pointer text-xs capitalize transition-all ${sel ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => toggleCert(type)}>
                      {type}{sel && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editCerts.filter((t) => !COMMON_CLASS_TYPES.includes(t)).map((type) => (
                  <Badge key={type} className="cursor-pointer text-xs capitalize bg-primary text-primary-foreground" onClick={() => toggleCert(type)}>
                    {type}<X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom type…" value={customType} onChange={(e) => setCustomType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())} className="flex-1" />
                <Button variant="outline" size="sm" onClick={addCustom} disabled={!customType.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !editName.trim()}>{saving ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Provision Instructor Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Provision New Instructor</DialogTitle>
            <DialogDescription>Create their account, set locations & certifications. An invite email will be sent automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name</Label><Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Sarah" /></div>
              <div><Label>Last Name</Label><Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Johnson" /></div>
            </div>
            <div><Label>Email Address</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="sarah@example.com" /></div>

            {/* Authorized Locations */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><MapPin className="h-3.5 w-3.5 text-primary" />Authorized Locations</Label>
              <div className="space-y-2 rounded-md border border-input p-3 max-h-40 overflow-y-auto">
                {orgStudios.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={newAuthorized.includes(s.id)} onCheckedChange={() => toggleNewAuthorized(s.id)} />
                    <span className="font-medium">{s.name}</span>
                    {s.location && <span className="text-xs text-muted-foreground">· {s.location}</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div>
              <Label className="flex items-center gap-1.5 mb-2"><Award className="h-3.5 w-3.5 text-primary" />Certifications / Class Types</Label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {COMMON_CLASS_TYPES.map((type) => {
                  const sel = newCerts.includes(type);
                  return (
                    <Badge key={type} variant={sel ? "default" : "outline"} className={`cursor-pointer text-xs capitalize transition-all ${sel ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => toggleNewCert(type)}>
                      {type}{sel && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {newCerts.filter((t) => !COMMON_CLASS_TYPES.includes(t)).map((type) => (
                  <Badge key={type} className="cursor-pointer text-xs capitalize bg-primary text-primary-foreground" onClick={() => toggleNewCert(type)}>
                    {type}<X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Add custom type…" value={newCustomType} onChange={(e) => setNewCustomType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNewCustom())} className="flex-1" />
                <Button variant="outline" size="sm" onClick={addNewCustom} disabled={!newCustomType.trim()}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleProvision} disabled={provisioning || !newFirstName.trim() || !newLastName.trim() || !newEmail.trim()}>
              {provisioning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Provisioning…</> : "Save Instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Offboard Confirmation Dialog ── */}
      <Dialog open={offboardOpen} onOpenChange={setOffboardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="font-display text-destructive">Offboard {offboardTarget?.name}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              This will revoke their login access and unassign them from <strong>{upcomingClassCount}</strong> upcoming class{upcomingClassCount !== 1 ? "es" : ""}. Past classes will remain intact for payroll records.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm space-y-1.5">
            <p className="font-medium text-destructive">This action will:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
              <li>Suspend their login credentials</li>
              <li>Mark their profile as deactivated</li>
              <li>Set {upcomingClassCount} upcoming class{upcomingClassCount !== 1 ? "es" : ""} to "Staff Needed"</li>
              <li>Preserve all past class & payroll history</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOffboardOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleOffboard} disabled={offboardLoading} className="gap-1.5">
              {offboardLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : <><UserX className="h-4 w-4" />Confirm Offboard</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
