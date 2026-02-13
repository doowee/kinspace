import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Mail, LogOut, Pencil, Check, Phone, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PHONE_REGEX = /^\+?[\d\s\-().]{7,20}$/;

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSms, setEditSms] = useState(true);
  const [editEmail, setEditEmail] = useState(true);
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, notification_preferences")
        .eq("id", user.id)
        .single();
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setPhone((data as any)?.phone ?? "");
      const prefs = (data as any)?.notification_preferences ?? { sms: true, email: true };
      setSmsEnabled(prefs.sms ?? true);
      setEmailEnabled(prefs.email ?? true);
      setEditFirst(data?.first_name ?? "");
      setEditLast(data?.last_name ?? "");
      setEditPhone((data as any)?.phone ?? "");
      setEditSms(prefs.sms ?? true);
      setEditEmail(prefs.email ?? true);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;

    // Validate phone if provided
    if (editPhone.trim() && !PHONE_REGEX.test(editPhone.trim())) {
      setPhoneError("Please enter a valid phone number");
      return;
    }
    setPhoneError("");
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: editFirst.trim(),
        last_name: editLast.trim(),
        phone: editPhone.trim() || null,
        notification_preferences: { sms: editSms, email: editEmail },
      } as any)
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setFirstName(editFirst.trim());
      setLastName(editLast.trim());
      setPhone(editPhone.trim());
      setSmsEnabled(editSms);
      setEmailEnabled(editEmail);
      setEditing(false);
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditFirst(firstName);
    setEditLast(lastName);
    setEditPhone(phone);
    setEditSms(smsEnabled);
    setEditEmail(emailEnabled);
    setPhoneError("");
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
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{phone || "Not set"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contact Info & Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Contact & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => {
                    setEditPhone(e.target.value);
                    if (phoneError) setPhoneError("");
                  }}
                  placeholder="+1 (555) 123-4567"
                />
                {phoneError && (
                  <p className="text-xs text-destructive">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Used for class reminders and important updates.
                </p>
              </div>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-toggle" className="text-sm font-medium">SMS Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get text reminders before class</p>
                  </div>
                  <Switch id="sms-toggle" checked={editSms} onCheckedChange={setEditSms} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-toggle" className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Booking confirmations and updates</p>
                  </div>
                  <Switch id="email-toggle" checked={editEmail} onCheckedChange={setEditEmail} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{phone || "Not set"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">SMS Reminders</span>
                  <span className={`text-xs font-medium ${smsEnabled ? "text-primary" : "text-muted-foreground"}`}>
                    {smsEnabled ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Notifications</span>
                  <span className={`text-xs font-medium ${emailEnabled ? "text-primary" : "text-muted-foreground"}`}>
                    {emailEnabled ? "On" : "Off"}
                  </span>
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
