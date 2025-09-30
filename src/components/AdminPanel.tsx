import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Upload, Users, Calendar } from "lucide-react";
import { IcsImport } from "./IcsImport";
import { UserAdmin } from "./UserAdmin";
import { MatchSchedule } from "./MatchSchedule";
import { useState } from "react";

export const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Admin-Bereich
          </h1>
          <p className="text-muted-foreground">
            Verwalten Sie Benutzer, Spielpläne und den Import von Spielplänen
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzerverwaltung
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Spielplanverwaltung
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            ICS Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserAdmin />
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <MatchSchedule />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <IcsImport />
        </TabsContent>
      </Tabs>
    </div>
  );
};
