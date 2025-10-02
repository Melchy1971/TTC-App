import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, MapPin } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

interface PinRow {
  "Datum"?: string;
  "Heimmannschaft"?: string;
  "Gastmannschaft"?: string;
  "Spielpin"?: string;
  "Spielcode"?: string;
}

export const PinsImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template: PinRow[] = [
      {
        "Datum": "YYYY-MM-DD",
        "Heimmannschaft": "Beispiel Heimmannschaft",
        "Gastmannschaft": "Beispiel Gastmannschaft",
        "Spielpin": "0000",
        "Spielcode": "XXXXXXXXXXXX",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pins");
    
    const colWidths = [
      { wch: 12 },  // Datum
      { wch: 25 },  // Heimmannschaft
      { wch: 25 },  // Gastmannschaft
      { wch: 10 },  // Spielpin
      { wch: 15 },  // Spielcode
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, "pins_import_vorlage.xlsx");
    
    toast({
      title: "Vorlage heruntergeladen",
      description: "Füllen Sie die Vorlage mit Datum, Mannschaften und Pins aus.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    try {
      setIsImporting(true);
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: PinRow[] = XLSX.utils.sheet_to_json(worksheet);

          const pinsData = jsonData
            .filter((row) => row["Datum"] && row["Heimmannschaft"] && row["Gastmannschaft"] && row["Spielpin"])
            .map((row) => {
              // Parse date - handle both YYYY-MM-DD and DD.MM.YYYY formats
              let dateStr = row["Datum"]?.toString().trim() || "";
              if (dateStr.includes('.')) {
                const [day, month, year] = dateStr.split('.');
                dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              }
              
              return {
                date: dateStr,
                homeTeam: row["Heimmannschaft"]?.toString().trim() || "",
                awayTeam: row["Gastmannschaft"]?.toString().trim() || "",
                spielpin: row["Spielpin"]?.toString().trim() || "",
                spielpartiePin: row["Spielcode"]?.toString().trim() || null,
              };
            });

          if (pinsData.length === 0) {
            toast({
              title: "Keine gültigen Daten",
              description: "Die Excel-Datei enthält keine gültigen Pin-Daten.",
              variant: "destructive",
            });
            setIsImporting(false);
            return;
          }

          const { data: result, error } = await supabase.functions.invoke("import-pins", {
            body: { pins: pinsData },
          });

          if (error) throw error;

          toast({
            title: "Import erfolgreich",
            description: `${result.successful} Pin(s) erfolgreich importiert. ${result.failed} fehlgeschlagen.`,
          });

          setFile(null);
          if (event.target) {
            event.target.value = "";
          }
        } catch (error) {
          console.error("Error processing file:", error);
          toast({
            title: "Fehler beim Verarbeiten",
            description: "Die Datei konnte nicht verarbeitet werden.",
            variant: "destructive",
          });
        } finally {
          setIsImporting(false);
        }
      };

      reader.readAsArrayBuffer(uploadedFile);
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Fehler beim Lesen",
        description: "Die Datei konnte nicht gelesen werden.",
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Spielpins und Spielpartie Pins Import
        </CardTitle>
        <CardDescription>
          Importieren Sie Spielpins und Spielcodes aus einer Excel-Datei. Die Zuordnung erfolgt automatisch über Datum und Mannschaftsnamen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">1. Vorlage herunterladen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Laden Sie die Excel-Vorlage herunter und füllen Sie sie mit Ihren Pin-Daten aus.
            </p>
            <Button onClick={downloadTemplate} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Vorlage herunterladen
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">2. Ausgefüllte Datei hochladen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Laden Sie die ausgefüllte Excel-Datei hoch, um die Pins zu importieren.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pins-file">Excel-Datei auswählen</Label>
              <Input
                id="pins-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Ausgewählte Datei: {file.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {isImporting && (
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Pins werden importiert...</span>
          </div>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Hinweise:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
            <li className="text-primary font-medium">⚠️ Wichtig: Die Spiele müssen bereits in der Datenbank existieren! Importieren Sie zuerst den Spielplan über "ICS Import".</li>
            <li>Die Excel-Datei muss die Spalten "Datum", "Heimmannschaft", "Gastmannschaft", "Spielpin" und "Spielcode" enthalten</li>
            <li>Datum, Heimmannschaft, Gastmannschaft und Spielpin sind Pflichtfelder</li>
            <li>Das Datum kann im Format YYYY-MM-DD oder DD.MM.YYYY angegeben werden</li>
            <li>Die Zuordnung erfolgt über Datum und beide Mannschaftsnamen</li>
            <li>Vorhandene Pins werden aktualisiert, neue werden hinzugefügt</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
