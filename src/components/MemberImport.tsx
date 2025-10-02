import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { memberImportSchema, getValidationError } from "@/lib/validation";

interface MemberRow {
  Vorname: string;
  Nachname: string;
  Email: string;
  Telefon?: string;
  Mobil?: string;
  Mitgliedsnummer?: string;
  Strasse?: string;
  PLZ?: string;
  Stadt?: string;
  Geburtstag?: string;
  "Temporäres Passwort": string;
  Rolle?: string;
}

export const MemberImport = () => {
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template: MemberRow[] = [
      {
        Vorname: "Max",
        Nachname: "Mustermann",
        Email: "max.mustermann@example.com",
        Telefon: "0123-456789",
        Mobil: "0171-1234567",
        Mitgliedsnummer: "M001",
        Strasse: "Musterstraße 1",
        PLZ: "12345",
        Stadt: "Musterstadt",
        Geburtstag: "1990-01-15",
        "Temporäres Passwort": "Willkommen2025!",
        Rolle: "player"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mitglieder");

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Vorname
      { wch: 15 }, // Nachname
      { wch: 30 }, // Email
      { wch: 15 }, // Telefon
      { wch: 15 }, // Mobil
      { wch: 18 }, // Mitgliedsnummer
      { wch: 25 }, // Strasse
      { wch: 8 },  // PLZ
      { wch: 15 }, // Stadt
      { wch: 12 }, // Geburtstag
      { wch: 20 }, // Temporäres Passwort
      { wch: 20 }  // Rolle
    ];

    XLSX.writeFile(workbook, "Mitglieder_Import_Vorlage.xlsx");

    toast({
      title: "Vorlage heruntergeladen",
      description: "Die Excel-Vorlage wurde erfolgreich heruntergeladen.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<MemberRow>(worksheet);

      if (jsonData.length === 0) {
        throw new Error("Die Excel-Datei enthält keine Daten.");
      }

      // Validate required fields and data format
      const invalidRows: { row: number; errors: string[] }[] = [];
      const members = jsonData.map((row, index) => {
        const memberData = {
          first_name: row.Vorname,
          last_name: row.Nachname,
          email: row.Email,
          phone: row.Telefon,
          mobile: row.Mobil,
          member_number: row.Mitgliedsnummer,
          street: row.Strasse,
          postal_code: row.PLZ,
          city: row.Stadt,
          birthday: row.Geburtstag,
          temporary_password: row["Temporäres Passwort"],
          role: row.Rolle || "player",
        };

        // Validate each row with zod schema
        const validationResult = memberImportSchema.safeParse(memberData);
        if (!validationResult.success) {
          invalidRows.push({
            row: index + 2, // +2 for header row and 0-index
            errors: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
          });
          return null;
        }

        return validationResult.data;
      }).filter(Boolean);

      if (invalidRows.length > 0) {
        const errorMessages = invalidRows.map(
          ({ row, errors }) => `Zeile ${row}: ${errors.join(', ')}`
        ).join('\n');
        throw new Error(`Validierungsfehler:\n${errorMessages}`);
      }

      // Call edge function to import members
      const { data: result, error } = await supabase.functions.invoke("import-members", {
        body: { members },
      });

      if (error) throw error;

      const { successful, failed } = result;

      let message = `${successful.length} Mitglied(er) erfolgreich importiert.`;
      if (failed.length > 0) {
        message += ` ${failed.length} fehlgeschlagen: ${failed.map((f: any) => f.email).join(", ")}`;
      }

      toast({
        title: failed.length > 0 ? "Import teilweise erfolgreich" : "Import erfolgreich",
        description: message,
        variant: failed.length > 0 ? "destructive" : "default",
      });

      // Reset input
      event.target.value = "";
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Fehler beim Import",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mitglieder-Import</CardTitle>
        <CardDescription>
          Laden Sie mehrere Mitglieder gleichzeitig über eine Excel-Datei hoch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">1. Vorlage herunterladen</h3>
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Excel-Vorlage herunterladen
          </Button>
          <p className="text-xs text-muted-foreground">
            Laden Sie die Vorlage herunter und füllen Sie diese mit den Mitgliederdaten aus.
            Verfügbare Rollen: player, admin, moderator, vorstand, mannschaftsfuehrer
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">2. Ausgefüllte Datei hochladen</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={importing}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Excel-Datei hochladen
                </>
              )}
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={importing}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Die Mitglieder erhalten ihre temporären Passwörter per Email und müssen diese beim ersten Login ändern.
          </p>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm">
          <h4 className="font-medium mb-2">Hinweise:</h4>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Pflichtfelder: Vorname, Nachname, Email, Temporäres Passwort</li>
            <li>Alle Mitglieder werden per Email über ihr Konto informiert</li>
            <li>Das temporäre Passwort muss beim ersten Login geändert werden</li>
            <li>Die Standard-Rolle ist "player", wenn nichts anderes angegeben wird</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
