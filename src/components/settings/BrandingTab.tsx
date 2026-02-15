import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useStudio } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palette, Save } from "lucide-react";

export default function BrandingTab() {
  const { activeStudio } = useStudio();
  const [primary, setPrimary] = useState("#374151");
  const [secondary, setSecondary] = useState("#F3D2C1");
  const [highlight, setHighlight] = useState("#F0FDF4");
  const [brandText, setBrandText] = useState("#FFFFFF");
  const [brandBackground, setBrandBackground] = useState("#F9F9F8");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeStudio) return;
    const load = async () => {
      const { data } = await supabase
        .from("studios")
        .select("brand_primary, brand_secondary, brand_highlight, brand_text, brand_background")
        .eq("id", activeStudio.id)
        .single();
      if (data) {
        setPrimary(data.brand_primary ?? "#374151");
        setSecondary(data.brand_secondary ?? "#F3D2C1");
        setHighlight(data.brand_highlight ?? "#F0FDF4");
        setBrandText((data as any).brand_text ?? "#FFFFFF");
        setBrandBackground((data as any).brand_background ?? "#F9F9F8");
      }
    };
    load();
  }, [activeStudio]);

  const handleSave = async () => {
    if (!activeStudio) return;
    setSaving(true);
    const { error } = await supabase
      .from("studios")
      .update({ brand_primary: primary, brand_secondary: secondary, brand_highlight: highlight, brand_text: brandText, brand_background: brandBackground } as any)
      .eq("id", activeStudio.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save branding");
    } else {
      toast.success("Branding updated!");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Brand Colors
          </CardTitle>
          <CardDescription>
            Customize the colors students see on your public booking page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ColorField label="Primary Brand Color" description="Headings, buttons, and heavy accents" value={primary} onChange={setPrimary} />
          <ColorField label="Secondary / Accent Color" description="Tags, badges, and secondary buttons" value={secondary} onChange={setSecondary} />
          <ColorField label="Background Highlight" description="Soft background for cards and sections" value={highlight} onChange={setHighlight} />
          <ColorField label="Button Text Color" description="Text color on primary-colored buttons and headers" value={brandText} onChange={setBrandText} />
          <ColorField label="App Background Color" description="Main background color for the entire site" value={brandBackground} onChange={setBrandBackground} />
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>See how your colors look on a sample class card.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-5 space-y-3 transition-colors"
            style={{ backgroundColor: brandBackground }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold" style={{ color: primary }}>Morning Flow Yoga</h3>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-medium"
                style={{ backgroundColor: secondary, color: primary }}
              >
                5 spots left
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Mon, Feb 17 · 9:00 AM · Sarah J.</p>
            <button
              className="rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: primary, color: brandText }}
            >
              Book Now
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function ColorField({ label, description, value, onChange }: {
  label: string; description: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded border p-1"
      />
      <div className="flex-1">
        <Label className="font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 font-mono text-xs"
      />
    </div>
  );
}
