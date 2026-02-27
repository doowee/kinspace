import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { useViewAsRole } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, MessageCircle, Lock, Home } from "lucide-react";
import DirectMessageDrawer from "@/components/communication/DirectMessageDrawer";
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
  membership_tier: string | null;
  total_bookings: number;
  last_booking_at: string | null;
  home_studio_id: string | null;
  home_studio_name: string | null;
}

export default function Students() {
  const { activeStudio, activeRole } = useStudio();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      if (!activeStudio) { setLoading(false); return; }
      setLoading(true);

      // Determine if studio belongs to an org — if so, fetch all org studio members
      const { data: studioRow } = await supabase
        .from("studios")
        .select("organization_id")
        .eq("id", activeStudio.id)
        .single();

      const orgId = studioRow?.organization_id;

      let studioIds: string[] = [activeStudio.id];

      if (orgId) {
        // Get all studios in this org
        const { data: orgStudios } = await supabase
          .from("studios")
          .select("id")
          .eq("organization_id", orgId);
        if (orgStudios && orgStudios.length > 0) {
          studioIds = orgStudios.map((s) => s.id);
        }
      }

      // Get student members across all org studios
      const { data: members } = await supabase
        .from("studio_members")
        .select("user_id")
        .in("studio_id", studioIds)
        .eq("role", "student");

      if (!members || members.length === 0) { setStudents([]); setLoading(false); return; }

      // Deduplicate user IDs
      const userIds = [...new Set(members.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, membership_tier, home_studio_id")
        .in("id", userIds);

      // Resolve home studio names
      const homeStudioIds = [...new Set((profiles ?? []).map((p: any) => p.home_studio_id).filter(Boolean))];
      let studioNameMap: Record<string, string> = {};
      if (homeStudioIds.length > 0) {
        const { data: studioRows } = await supabase.from("studios").select("id, name").in("id", homeStudioIds);
        (studioRows ?? []).forEach((s: any) => { studioNameMap[s.id] = s.name; });
      }

      // Get booking counts across all org studios
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
        membership_tier: p.membership_tier,
        total_bookings: bookingMap[p.id]?.count ?? 0,
        last_booking_at: bookingMap[p.id]?.last ?? null,
        home_studio_id: p.home_studio_id ?? null,
        home_studio_name: p.home_studio_id ? (studioNameMap[p.home_studio_id] ?? null) : null,
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
                    <TableRow key={s.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName(s)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDmStudent(s)}>
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
      {dmStudent && (
        <DirectMessageDrawer open={!!dmStudent} onOpenChange={(open) => { if (!open) setDmStudent(null); }} studentName={displayName(dmStudent)} studentEmail={dmStudent.email} role={activeRole} />
      )}
    </div>
  );
}
