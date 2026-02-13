import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PackagesTab from "@/components/settings/PackagesTab";
import BrandingTab from "@/components/settings/BrandingTab";
import PoliciesTab from "@/components/settings/PoliciesTab";
import InstructorsTab from "@/components/settings/InstructorsTab";

export default function Settings() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-muted-foreground">Manage your studio configuration</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding & Appearance</TabsTrigger>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="instructors">Instructors</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="branding" className="mt-4">
          <BrandingTab />
        </TabsContent>
        <TabsContent value="packages" className="mt-4">
          <PackagesTab />
        </TabsContent>
        <TabsContent value="instructors" className="mt-4">
          <InstructorsTab />
        </TabsContent>
        <TabsContent value="policies" className="mt-4">
          <PoliciesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
