import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Upload, Users, Database } from "lucide-react";
import { IcsImport } from "./IcsImport";
import { UserAdmin } from "./UserAdmin";
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
          <p className="text-muted-foreground">Verwalten Sie Benutzer, Spielpläne und Systemeinstellungen</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Benutzerverwaltung
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            ICS Import
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserAdmin />
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <IcsImport />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Systemeinstellungen</CardTitle>
              <CardDescription>Konfigurieren Sie allgemeine Systemoptionen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-2">Datenbank-Status</h3>
                  <p className="text-sm text-muted-foreground">
                    Alle Systeme betriebsbereit
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-semibold mb-2">Backup-Verwaltung</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Letztes Backup: Heute, 03:00 Uhr
                  </p>
                  <Button variant="outline" size="sm">
                    Manuelles Backup erstellen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
