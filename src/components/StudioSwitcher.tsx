import { useStudio } from "@/contexts/StudioContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Building2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function StudioSwitcher() {
  const { memberships, activeStudio, setActiveStudioId, activeRole } = useStudio();
  const navigate = useNavigate();

  if (!activeStudio) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 px-3 font-sans">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-medium truncate max-w-[160px]">
            {activeStudio.name}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Your Studios
        </DropdownMenuLabel>
        {/* Deduplicate by studio, keeping highest role */}
        {Object.values(
          memberships.reduce((acc, m) => {
            const existing = acc[m.studio_id];
            const rolePriority: Record<string, number> = { owner: 3, instructor: 2, student: 1 };
            if (!existing || (rolePriority[m.role] ?? 0) > (rolePriority[existing.role] ?? 0)) {
              acc[m.studio_id] = m;
            }
            return acc;
          }, {} as Record<string, typeof memberships[0]>)
        ).map((m) => (
          <DropdownMenuItem
            key={m.studio_id}
            onClick={() => setActiveStudioId(m.studio_id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{m.studios.name}</span>
            <Badge variant="outline" className="text-xs capitalize ml-2">
              {m.role}
            </Badge>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/create-studio")}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Studio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
