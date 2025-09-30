import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

export const IcsImport = () => {
  const [dragActive, setDragActive] = useState(false);
  const [importHistory, setImportHistory] = useState([
    { 
      file: "herren1_spielplan.ics", 
      date: "25.11.2024", 
      matches: 15, 
      status: "success",
      team: "Herren I"
    },
    { 
      file: "damen1_spielplan.ics", 
      date: "20.11.2024", 
      matches: 12, 
      status: "success",
      team: "Damen I"
    },
    { 
      file: "jugend_u18.ics", 
      date: "18.11.2024", 
      matches: 8, 
      status: "error",
      team: "Jugend U18"
    }
  ]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    // Handle file upload logic here
    console.log("Files dropped:", files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">ICS Import</h1>
        <p className="text-muted-foreground">Importieren Sie Spielpläne aus ICS-Kalenderdateien</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-full md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Datei hochladen
            </CardTitle>
            <CardDescription>
              Ziehen Sie ICS-Dateien hierher oder klicken Sie zum Auswählen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? "border-primary bg-primary/5 shadow-sport" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">ICS-Datei hochladen</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Unterstützte Formate: .ics, .ical
                <br />
                Maximale Dateigröße: 10 MB
              </p>
              <Button className="bg-gradient-secondary hover:bg-secondary-hover shadow-accent">
                <FileText className="w-4 h-4 mr-2" />
                Datei auswählen
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Import-Einstellungen
            </CardTitle>
            <CardDescription>Konfigurieren Sie den Import-Vorgang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mannschaft zuweisen</label>
              <select className="w-full p-2 border rounded-md bg-background">
                <option>Automatisch erkennen</option>
                <option>Herren I</option>
                <option>Herren II</option>
                <option>Damen I</option>
                <option>Jugend U18</option>
                <option>Jugend U15</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Bestehende Spiele</label>
              <select className="w-full p-2 border rounded-md bg-background">
                <option>Überschreiben</option>
                <option>Zusammenführen</option>
                <option>Neue hinzufügen</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" id="notifications" className="rounded" />
              <label htmlFor="notifications" className="text-sm">
                Benachrichtigungen bei neuen Spielen senden
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import-Verlauf</CardTitle>
          <CardDescription>Zuletzt importierte ICS-Dateien</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {importHistory.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === "success" ? "bg-green-500" : "bg-red-500"
                  }`} />
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{item.file}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.team} • {item.matches} Spiele • {item.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={item.status === "success" ? "default" : "destructive"}
                    className={item.status === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {item.status === "success" ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Erfolgreich
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Fehler
                      </>
                    )}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};