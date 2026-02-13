import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Link2, Unlink, Plus, Save, Trash2 } from "lucide-react";

interface Instructor {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  user_id: string | null;
  display_order: number;
  studio_id: string;
  linked_email?: string | null;
}

export default function InstructorsTab() {
  const { activeStudio } = useStudio();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  // Add instructor form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBio, setNewBio] = useState("");
  const [addingInstructor, setAddingInstructor] = useState(false);

  // Link dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState<Instructor | null>(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  const fetchInstructors = async () => {
    if (!activeStudio) return;
    setLoading(true);

    const { data } = await supabase
      .from("instructors")
      .select("id, name, bio, photo_url, user_id, display_order, studio_id")
      .eq("studio_id", activeStudio.id)
      .order("display_order");

    const items: Instructor[] = (data ?? []) as any[];

    // Fetch linked emails for those with user_id
    const userIds = items.filter((i) => i.user_id).map((i) => i.user_id!);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", userIds);

      const emailMap: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email; });
      items.forEach((i) => {
        if (i.user_id) i.linked_email = emailMap[i.user_id] || null;
      });
    }

    setInstructors(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstructors();
  }, [activeStudio?.id]);

  const handleAddInstructor = async () => {
    if (!activeStudio || !newName.trim()) return;
    setAddingInstructor(true);

    const { error } = await supabase.from("instructors").insert({
      name: newName.trim(),
      bio: newBio.trim() || null,
      studio_id: activeStudio.id,
      display_order: instructors.length,
    });

    if (error) {
      toast.error("Failed to add instructor");
    } else {
      toast.success("Instructor added!");
      setNewName("");
      setNewBio("");
      setShowAdd(false);
      fetchInstructors();
    }
    setAddingInstructor(false);
  };

  const handleDeleteInstructor = async (inst: Instructor) => {
    if (!activeStudio) return;
    const { error } = await supabase
      .from("instructors")
      .delete()
      .eq("id", inst.id);

    if (error) {
      toast.error("Failed to delete instructor");
    } else {
      toast.success("Instructor removed");
      fetchInstructors();
    }
  };

  const openLinkDialog = (inst: Instructor) => {
    setLinkTarget(inst);
    setLinkEmail("");
    setLinkError("");
    setLinkDialogOpen(true);
  };

  const handleLink = async () => {
    if (!linkTarget || !linkEmail.trim()) return;
    setLinking(true);
    setLinkError("");

    // Look up the user by email using security definer function
    const { data: userId, error: lookupError } = await supabase
      .rpc("lookup_user_id_by_email", { _email: linkEmail.trim().toLowerCase() });

    if (lookupError || !userId) {
      setLinkError("No user found with that email. They must have an account first.");
      setLinking(false);
      return;
    }

    // Ensure they have a studio_member record with instructor role
    const { data: existingMember } = await supabase
      .from("studio_members")
      .select("id, role")
      .eq("user_id", userId)
      .eq("studio_id", linkTarget.studio_id ?? "")
      .limit(1);

    if (!existingMember || existingMember.length === 0) {
      // Add them as instructor member
      await supabase.from("studio_members").insert({
        user_id: userId,
        studio_id: linkTarget.studio_id ?? (activeStudio?.id ?? ""),
        role: "instructor",
      } as any);
    } else if (existingMember[0].role === "student") {
      // Upgrade role to instructor
      await supabase
        .from("studio_members")
        .update({ role: "instructor" } as any)
        .eq("id", existingMember[0].id);
    }

    // Link user_id to instructor record
    const { error: updateError } = await supabase
      .from("instructors")
      .update({ user_id: userId } as any)
      .eq("id", linkTarget.id);

    if (updateError) {
      setLinkError("Failed to link user: " + updateError.message);
    } else {
      toast.success(`Linked ${linkEmail} to ${linkTarget.name}`);
      setLinkDialogOpen(false);
      fetchInstructors();
    }
    setLinking(false);
  };

  const handleUnlink = async (inst: Instructor) => {
    const { error } = await supabase
      .from("instructors")
      .update({ user_id: null } as any)
      .eq("id", inst.id);

    if (error) {
      toast.error("Failed to unlink user");
    } else {
      toast.success("User unlinked from instructor profile");
      fetchInstructors();
    }
  };

  if (loading) {
    return <div className="animate-pulse text-muted-foreground py-8 text-center">Loading instructors...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Instructors
            </CardTitle>
            <CardDescription>
              Manage your studio's instructors and link them to user accounts for portal access.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Instructor
          </Button>
        </CardHeader>
        <CardContent>
          {instructors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No instructors yet. Add one to get started.
            </p>
          ) : (
            <div className="divide-y">
              {instructors.map((inst) => (
                <div key={inst.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-sm">{inst.name}</p>
                    {inst.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{inst.bio}</p>
                    )}
                    {inst.user_id ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                          <Link2 className="h-3 w-3 mr-0.5" />
                          Linked
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{inst.linked_email}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        No account linked
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    {inst.user_id ? (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleUnlink(inst)}>
                        <Unlink className="h-3.5 w-3.5 mr-1" />
                        Unlink
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => openLinkDialog(inst)}>
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        Link User
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteInstructor(inst)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Instructor Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add Instructor</DialogTitle>
            <DialogDescription>
              Create an instructor profile. You can link it to a user account later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inst-name">Name</Label>
              <Input id="inst-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sarah Johnson" />
            </div>
            <div>
              <Label htmlFor="inst-bio">Bio (optional)</Label>
              <textarea
                id="inst-bio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Brief bio…"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddInstructor} disabled={addingInstructor || !newName.trim()}>
              {addingInstructor ? "Adding…" : "Add Instructor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link User Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Link User to {linkTarget?.name}</DialogTitle>
            <DialogDescription>
              Enter the email address of an existing user to give them instructor portal access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-email">User Email</Label>
              <Input
                id="link-email"
                type="email"
                value={linkEmail}
                onChange={(e) => { setLinkEmail(e.target.value); setLinkError(""); }}
                placeholder="instructor@example.com"
              />
              {linkError && (
                <p className="text-xs text-destructive mt-1">{linkError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLink} disabled={linking || !linkEmail.trim()}>
              {linking ? "Linking…" : "Link User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
