import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const QttrUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentFile();
  }, []);

  const fetchCurrentFile = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .list('', {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentFile(data[0].name);
      }
    } catch (error) {
      console.error('Error fetching current file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Ungültiges Dateiformat",
        description: "Bitte laden Sie nur PDF-Dateien hoch.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old file if exists
      if (currentFile) {
        await supabase.storage
          .from('qttr-lists')
          .remove([currentFile]);
      }

      // Upload new file with fixed name
      const fileName = 'aktuelle-qttr-liste.pdf';
      const { error: uploadError } = await supabase.storage
        .from('qttr-lists')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      setCurrentFile(fileName);
      toast({
        title: "Upload erfolgreich",
        description: "Die QTTR/TTR-Liste wurde hochgeladen."
      });

      fetchCurrentFile();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload fehlgeschlagen",
        description: "Die Datei konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!currentFile) return;

    const confirmed = window.confirm('Möchten Sie die aktuelle QTTR/TTR-Liste wirklich löschen?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.storage
        .from('qttr-lists')
        .remove([currentFile]);

      if (error) throw error;

      setCurrentFile(null);
      toast({
        title: "Datei gelöscht",
        description: "Die QTTR/TTR-Liste wurde entfernt."
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: "Fehler",
        description: "Die Datei konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    if (!currentFile) return;

    try {
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .download(currentFile);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = currentFile;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            QTTR/TTR-Liste verwalten
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          QTTR/TTR-Liste verwalten
        </CardTitle>
        <CardDescription>
          Laden Sie die aktuelle QTTR/TTR-Liste als PDF hoch. Diese wird für alle Mitglieder zum Download verfügbar sein.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentFile ? (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="flex-1">
                Aktuelle Datei: <strong>{currentFile}</strong>
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Vorschau
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              Es ist derzeit keine QTTR/TTR-Liste hochgeladen.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="qttr-file">
              {currentFile ? "Neue Liste hochladen (ersetzt die aktuelle)" : "QTTR/TTR-Liste hochladen"}
            </Label>
            <Input
              id="qttr-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Nur PDF-Dateien sind erlaubt. Die Datei wird für alle Mitglieder sichtbar sein.
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Upload className="w-4 h-4 animate-pulse" />
              Datei wird hochgeladen...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};