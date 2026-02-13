import { useStudio } from "@/contexts/StudioContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, Shield } from "lucide-react";
import StudentDashboard from "@/components/dashboard/StudentDashboard";

export default function Dashboard() {
  const { activeStudio, activeRole, memberships } = useStudio();
  const { user } = useAuth();

  if (!activeStudio) return null;

  if (activeRole === "student") {
    return <StudentDashboard />;
  }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">
          {activeStudio.name}
        </h2>
        <p className="mt-1 text-muted-foreground">
          Studio dashboard — manage your classes, instructors, and students.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Active Studio</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{activeStudio.name}</div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              /{activeStudio.slug}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Your Role</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className="capitalize text-sm">{activeRole}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Studio ID</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {activeStudio.id}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium font-sans">Studios</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{memberships.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              total memberships
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Session Info</CardTitle>
          <CardDescription>Current authentication and tenant context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User Email</span>
            <span className="font-mono">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Studio ID</span>
            <span className="font-mono text-xs">{activeStudio.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenant Role</span>
            <Badge variant="outline" className="capitalize">{activeRole}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
