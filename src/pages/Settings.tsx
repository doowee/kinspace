import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PackagesTab from "@/components/settings/PackagesTab";

export default function Settings() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-foreground">Settings</h2>
        <p className="mt-1 text-muted-foreground">Manage your studio configuration</p>
      </div>

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
        </TabsList>
        <TabsContent value="packages" className="mt-4">
          <PackagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
