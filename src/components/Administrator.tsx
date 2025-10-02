import { AdminTransfer } from "./AdminTransfer";
import { DesignSettings } from "./DesignSettings";
import { Shield, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Administrator = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Administrator-Bereich
        </h1>
        <p className="text-muted-foreground mt-2">
          Verwalten Sie die Administrator-Rolle und Vereinseinstellungen
        </p>
      </div>

      <Tabs defaultValue="admin" className="w-full">
        <TabsList>
          <TabsTrigger value="admin">
            <Shield className="w-4 h-4 mr-2" />
            Administrator
          </TabsTrigger>
          <TabsTrigger value="design">
            <Palette className="w-4 h-4 mr-2" />
            Design
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin">
          <AdminTransfer />
        </TabsContent>

        <TabsContent value="design">
          <DesignSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
