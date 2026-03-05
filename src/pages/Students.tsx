import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { studioColorClass } from "@/lib/studio-colors";
import { useViewAsRole } from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Users, Search, MessageCircle, Lock, Home, AlertTriangle, Award, Star } from "lucide-react";
import DirectMessageDrawer from "@/components/communication/DirectMessageDrawer";
import { toast } from "sonner";
import { format } from "date-fns";

const EMAIL_VISIBLE_ROLES = ["owner"];
const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  return `${local.charAt(0)}***@${domain}`;
};

interface StudentRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  membership_tier: string | null;
  total_bookings: number;
  last_booking_at: string | null;
  home_studio_id: string | null;
  home_studio_name: string | null;
  injury_notes: string | null;
  staff_notes: string | null;
  created_at: string;
}

interface EditData {
  first_name: string;
  last_name: string;
  phone: string;
  injury_notes: string;
  staff_notes: string;
}

export default function Students() {
  const { activeStudio, activeRole } = useStudio();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [editData, setEditData] = useState<EditData>({ first_name: "", last_name: "", phone: "", injury_notes: "", staff_notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!activeStudio) { setLoading(false); return; }
      setLoading(true);

      const { data: studioRow } = await supabase
        .from("studios")
        .select("organization_id")
        .eq("id", activeStudio.id)
        .single();

      const orgId = studioRow?.organization_id;
      let studioIds: string[] = [activeStudio.id];

      if (orgId) {
        const { data: orgStudios } = await supabase
          .from("studios")
          .select("id")
          .eq("organization_id", orgId);
        if (orgStudios && orgStudios.length > 0) {
          studioIds = orgStudios.map((s) => s.id);
        }
      }

      const { data: members } = await supabase
        .from("studio_members")
        .select("user_id")
        .in("studio_id", studioIds)
        .eq("role", "student");

      if (!members || members.length === 0) { setStudents([]); setLoading(false); return; }

      const userIds = [...new Set(members.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, membership_tier, home_studio_id, phone, injury_notes, staff_notes, created_at")
        .in("id", userIds);

      const homeStudioIds = [...new Set((profiles ?? []).map((p: any) => p.home_studio_id).filter(Boolean))];
      let studioNameMap: Record<string, string> = {};
      if (homeStudioIds.length > 0) {
        const { data: studioRows } = await supabase.from("studios").select("id, name").in("id", homeStudioIds);
        (studioRows ?? []).forEach((s: any) => { studioNameMap[s.id] = s.name; });
      }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("user_id, created_at")
        .in("studio_id", studioIds)
        .in("status", ["confirmed", "checked_in"])
        .in("user_id", userIds);

      const bookingMap: Record<string, { count: number; last: string | null }> = {};
      (bookings ?? []).forEach((b: any) => {
        if (!bookingMap[b.user_id]) bookingMap[b.user_id] = { count: 0, last: null };
        bookingMap[b.user_id].count++;
        if (!bookingMap[b.user_id].last || b.created_at > bookingMap[b.user_id].last!) {
          bookingMap[b.user_id].last = b.created_at;
        }
      });

      const rows: StudentRow[] = (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone ?? null,
        membership_tier: p.membership_tier,
        total_bookings: bookingMap[p.id]?.count ?? 0,
        last_booking_at: bookingMap[p.id]?.last ?? null,
        home_studio_id: p.home_studio_id ?? null,
        home_studio_name: p.home_studio_id ? (studioNameMap[p.home_studio_id] ?? null) : null,
        injury_notes: p.injury_notes ?? null,
        staff_notes: p.staff_notes ?? null,
        created_at: p.created_at,
      }));
      rows.sort((a, b) => (a.first_name ?? a.email).localeCompare(b.first_name ?? b.email));
      setStudents(rows);
      setLoading(false);
    };
    fetchStudents();
  }, [activeStudio?.id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter((s) =>
      s.email.toLowerCase().includes(q) || s.first_name?.toLowerCase().includes(q) || s.last_name?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const displayName = (s: StudentRow) => {
    if (s.first_name || s.last_name) return [s.first_name, s.last_name].filter(Boolean).join(" ");
    return s.email;
  };

  const [dmStudent, setDmStudent] = useState<StudentRow | null>(null);
  const viewAsRole = useViewAsRole();
  const canSeeEmail = viewAsRole === "owner";

  const openSheet = (student: StudentRow) => {
    setSelectedStudent(student);
    setEditData({
      first_name: student.first_name ?? "",
      last_name: student.last_name ?? "",
      phone: student.phone ?? "",
      injury_notes: student.injury_notes ?? "",
      staff_notes: student.staff_notes ?? "",
    });
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editData.first_name || null,
        last_name: editData.last_name || null,
        phone: editData.phone || null,
        injury_notes: editData.injury_notes || null,
        staff_notes: editData.staff_notes || null,
      })
      .eq("id", selectedStudent.user_id);

    setSaving(false);
    if (error) {
      toast.error("Failed to update profile: " + error.message);
      return;
    }

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.user_id === selectedStudent.user_id
          ? { ...s, first_name: editData.first_name || null, last_name: editData.last_name || null, phone: editData.phone || null, injury_notes: editData.injury_notes || null, staff_notes: editData.staff_notes || null }
          : s
      )
    );
    setSelectedStudent(null);
    toast.success("Student profile updated successfully");
  };

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Students</h2>
          <p className="mt-1 text-muted-foreground">All clients across your organization</p>
        </div>
        <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3"><Users className="h-4 w-4" />{students.length} total</Badge>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Loading students…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{search ? `No students matching "${search}"` : "No students found."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Name</TableHead>
                     <TableHead>Email</TableHead>
                     <TableHead>Home Studio</TableHead>
                     <TableHead>Tier</TableHead>
                     <TableHead className="text-right">Bookings</TableHead>
                     <TableHead className="text-right">Last Visit</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => openSheet(s)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName(s)}</span>
                          {s.injury_notes && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          {s.total_bookings <= 3 && <Star className="h-3.5 w-3.5 text-blue-500" />}
                          {s.total_bookings >= 50 && <Award className="h-3.5 w-3.5 text-yellow-500" />}
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); setDmStudent(s); }}>
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {canSeeEmail ? s.email : (
                          <span className="inline-flex items-center gap-1.5 select-none text-muted-foreground/60 text-xs"><Lock className="h-3 w-3" />{maskEmail(s.email)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.home_studio_name && s.home_studio_id ? (
                          <Badge variant="outline" className={`text-[10px] gap-1 ${studioColorClass(s.home_studio_id)}`}>
                            <Home className="h-2.5 w-2.5" />
                            {s.home_studio_name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{s.membership_tier ?? "Drop-in"}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.total_bookings}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {s.last_booking_at ? format(new Date(s.last_booking_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DM Drawer */}
      {dmStudent && (
        <DirectMessageDrawer open={!!dmStudent} onOpenChange={(open) => { if (!open) setDmStudent(null); }} studentName={displayName(dmStudent)} studentEmail={dmStudent.email} role={activeRole} />
      )}

      {/* Student Detail CRM Sheet */}
      <Sheet open={!!selectedStudent} onOpenChange={(open) => { if (!open) setSelectedStudent(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto flex flex-col">
          {selectedStudent && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{displayName(selectedStudent)}</SheetTitle>
                <SheetDescription>{selectedStudent.email}</SheetDescription>
              </SheetHeader>

              {/* Section A: Badges & Quick Stats */}
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedStudent.total_bookings <= 3 && (
                  <Badge variant="secondary" className="gap-1"><Star className="h-3 w-3" />First-Timer</Badge>
                )}
                {selectedStudent.total_bookings >= 50 && (
                  <Badge className="gap-1 bg-yellow-500/15 text-yellow-700 border-yellow-300"><Award className="h-3 w-3" />Milestone</Badge>
                )}
                {selectedStudent.injury_notes && (
                  <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Injury</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="rounded-md border border-border p-3">
                  <p className="text-2xl font-bold tabular-nums text-foreground">{selectedStudent.total_bookings}</p>
                  <p className="text-[11px] text-muted-foreground">Total Classes</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{format(new Date(selectedStudent.created_at), "MMM yyyy")}</p>
                  <p className="text-[11px] text-muted-foreground">Join Date</p>
                </div>
                <div className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{selectedStudent.membership_tier ?? "Drop-in"}</p>
                  <p className="text-[11px] text-muted-foreground">Tier</p>
                </div>
              </div>

              {/* Section B: Editable Demographics */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground">Demographics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="crm-fn">First Name</Label>
                    <Input id="crm-fn" value={editData.first_name} onChange={(e) => setEditData((d) => ({ ...d, first_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="crm-ln">Last Name</Label>
                    <Input id="crm-ln" value={editData.last_name} onChange={(e) => setEditData((d) => ({ ...d, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-phone">Phone</Label>
                  <Input id="crm-phone" value={editData.phone} onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-email">Email</Label>
                  <Input id="crm-email" value={selectedStudent.email} disabled className="opacity-60" />
                </div>
              </div>

              {/* Section C: Notes Engine */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold text-foreground">Notes</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-injury">Official Injury / Medical Notes</Label>
                  <Textarea id="crm-injury" rows={3} value={editData.injury_notes} onChange={(e) => setEditData((d) => ({ ...d, injury_notes: e.target.value }))} />
                  <p className="text-[11px] text-amber-600">⚠️ Warning: This is the official liability/medical profile. Editing this will update the ⚠️ flag on the instructor Kiosk.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="crm-staff">Internal Staff Notes</Label>
                  <Textarea id="crm-staff" rows={3} value={editData.staff_notes} onChange={(e) => setEditData((d) => ({ ...d, staff_notes: e.target.value }))} />
                  <p className="text-[11px] text-muted-foreground">General instructor observations and preferences.</p>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-background border-t border-border pt-4 pb-2 mt-auto flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setSelectedStudent(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Profile"}</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
