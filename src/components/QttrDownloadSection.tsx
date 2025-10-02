import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const QttrDownloadSection = () => {
  const [pdfAvailable, setPdfAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPdfAvailability();
  }, []);

  const checkPdfAvailability = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .list('', {
          limit: 1
        });

      if (error) throw error;

      setPdfAvailable(data && data.length > 0);
    } catch (error) {
      console.error('Error checking PDF availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);

    try {
      const fileName = 'aktuelle-qttr-liste.pdf';
      
      const { data, error } = await supabase.storage
        .from('qttr-lists')
        .download(fileName);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: "Die QTTR/TTR-Liste wurde heruntergeladen."
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Download fehlgeschlagen",
        description: "Die QTTR/TTR-Liste konnte nicht heruntergeladen werden.",
        variant: "destructive"
      });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">
          Prüfe Verfügbarkeit...
        </div>
      </div>
    );
  }

  if (!pdfAvailable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Derzeit ist keine QTTR/TTR-Liste verfügbar. Bitte kontaktieren Sie den Vorstand.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <div className="text-center space-y-2">
        <FileText className="w-16 h-16 mx-auto text-primary" />
        <h3 className="text-lg font-semibold">Aktuelle QTTR/TTR-Liste</h3>
        <p className="text-sm text-muted-foreground">
          Laden Sie die vollständige Liste als PDF herunter
        </p>
      </div>

      <Button
        size="lg"
        onClick={handleDownloadPdf}
        disabled={downloading}
        className="gap-2"
      >
        <Download className="w-5 h-5" />
        {downloading ? "Wird heruntergeladen..." : "QTTR/TTR-Liste herunterladen"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Die Liste wird als PDF-Datei auf Ihrem Gerät gespeichert
      </p>
    </div>
  );
};