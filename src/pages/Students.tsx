import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudio } from "@/contexts/StudioContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Search, MapPin, MessageCircle } from "lucide-react";
import DirectMessageDrawer from "@/components/communication/DirectMessageDrawer";
import { format } from "date-fns";

interface OrgStudent {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  home_studio_name: string;
  total_bookings: number;
  last_booking_at: string | null;
}

export default function Students() {
  const { activeStudio } = useStudio();
  const [students, setStudents] = useState<OrgStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      if (!activeStudio?.organization_id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.rpc("get_org_students", {
        _org_id: activeStudio.organization_id,
      });

      if (error) {
        console.error("Failed to fetch students:", error);
      } else {
        setStudents((data as OrgStudent[]) ?? []);
      }
      setLoading(false);
    };

    fetchStudents();
  }, [activeStudio?.organization_id]);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.first_name?.toLowerCase().includes(q)) ||
        (s.last_name?.toLowerCase().includes(q)) ||
        s.home_studio_name.toLowerCase().includes(q)
    );
  }, [students, search]);

  const displayName = (s: OrgStudent) => {
    if (s.first_name || s.last_name)
      return [s.first_name, s.last_name].filter(Boolean).join(" ");
    return s.email;
  };

  const [dmStudent, setDmStudent] = useState<OrgStudent | null>(null);
  const { activeRole } = useStudio();

  if (!activeStudio) return null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold text-foreground">Students</h2>
          <p className="mt-1 text-muted-foreground">
            All students across your organization
          </p>
        </div>
        <Badge variant="outline" className="text-sm gap-1.5 py-1.5 px-3">
          <Users className="h-4 w-4" />
          {students.length} total
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or studio…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">
              Loading students…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? `No students matching "${search}"` : "No students found."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        Home Studio
                      </span>
                    </TableHead>
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
                          {s.total_bookings >= 30 ? (
                            <Badge className="bg-[hsl(80,40%,92%)] text-[hsl(80,50%,30%)] border-[hsl(80,40%,80%)] text-[10px] font-semibold px-2 py-0.5">
                              VIP Unlimited (Auto-Renew)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5">
                              10-Class Pack ({Math.max(0, 10 - (s.total_bookings % 10))} Remaining)
                            </Badge>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDmStudent(s)}>
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{s.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={s.home_studio_name === "No bookings yet" ? "outline" : "secondary"}
                          className="text-xs"
                        >
                          {s.home_studio_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.total_bookings}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {s.last_booking_at
                          ? format(new Date(s.last_booking_at), "MMM d, yyyy")
                          : "—"}
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
        <DirectMessageDrawer
          open={!!dmStudent}
          onOpenChange={(open) => { if (!open) setDmStudent(null); }}
          studentName={displayName(dmStudent)}
          studentEmail={dmStudent.email}
          role={activeRole}
        />
      )}
    </div>
  );
}
