import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, UserPlus, MapPin } from "lucide-react";
import { IcsImport } from "./IcsImport";
import { MemberImport } from "./MemberImport";
import { PinsImport } from "./PinsImport";
import { useState } from "react";

export const ImportSection = () => {
  const [activeTab, setActiveTab] = useState("ics");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Import</h2>
        <p className="text-muted-foreground">
          Importieren Sie Spielpläne, Mitglieder und Pins
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ics" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            ICS Import
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Mitglieder Import
          </TabsTrigger>
          <TabsTrigger value="pins" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Pins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ics" className="space-y-6">
          <IcsImport />
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <MemberImport />
        </TabsContent>

        <TabsContent value="pins" className="space-y-6">
          <PinsImport />
        </TabsContent>
      </Tabs>
    </div>
  );
};
