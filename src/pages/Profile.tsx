import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, LogOut, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setEditFirst(data?.first_name ?? "");
      setEditLast(data?.last_name ?? "");
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: editFirst.trim(), last_name: editLast.trim() })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFirstName(editFirst.trim());
      setLastName(editLast.trim());
      setEditing(false);
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditFirst(firstName);
    setEditLast(lastName);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Student";

  return (
    <div className="animate-fade-in max-w-lg mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground">{fullName}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account Details
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={editFirst}
                  onChange={(e) => setEditFirst(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={editLast}
                  onChange={(e) => setEditLast(e.target.value)}
                  placeholder="Last name"
                />
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="gap-1">
                  <Check className="h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{fullName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
