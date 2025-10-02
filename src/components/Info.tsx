import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info as InfoIcon, Code, Heart, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Info = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Über dieses Tool</h1>
        <p className="text-muted-foreground">Informationen zum TT Vereinsverwaltungs-Tool</p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-primary" />
            Was ist dieses Tool?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground/90 leading-relaxed">
            Das TT Vereinsverwaltungs-Tool ist eine umfassende Web-Anwendung zur Verwaltung von Tischtennis-Vereinen.
            Es wurde entwickelt, um Vereinsmanagern, Vorständen und Mannschaftsführern die tägliche Arbeit zu erleichtern.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 text-foreground">Funktionen</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Mannschaftsverwaltung und Spielerübersicht</li>
                <li>• Spielplan-Management mit ICS-Import</li>
                <li>• Kommunikationstools für Verein und Teams</li>
                <li>• Vorstandsbereich für wichtige Mitteilungen</li>
                <li>• Benutzerverwaltung mit Rollensystem</li>
                <li>• QttrOS-Integration für Spielerstatistiken</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-semibold mb-2 text-foreground">Zielgruppe</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Vereinsvorstände</li>
                <li>• Mannschaftsführer</li>
                <li>• Vereinsmitglieder</li>
                <li>• Trainer und Betreuer</li>
                <li>• Aktive Spieler</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Autor & Entwicklung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground/90 leading-relaxed">
            Dieses Tool wurde mit Leidenschaft für die Tischtennis-Community entwickelt.
            Die kontinuierliche Weiterentwicklung erfolgt auf Basis von Feedback aus der Praxis
            und den Bedürfnissen echter Tischtennis-Vereine.
          </p>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Entwickler:</strong> Markus Dickscheit<br />
              <strong className="text-foreground">Version:</strong> 1.0.0<br />
              <strong className="text-foreground">Letzte Aktualisierung:</strong> 2025
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5 text-green-500" />
            Open Source Projekt
          </CardTitle>
          <CardDescription>
            Freie Software für die Tischtennis-Community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-foreground/90 leading-relaxed">
            Dieses Tool ist ein <strong>Open Source Projekt</strong> und steht unter einer freien Lizenz.
            Das bedeutet, dass jeder den Quellcode einsehen, verwenden, modifizieren und verbreiten kann.
          </p>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Github className="w-5 h-5 text-foreground mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Transparenz</h4>
                <p className="text-sm text-muted-foreground">
                  Der komplette Quellcode ist öffentlich einsehbar und kann von jedem überprüft werden.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Heart className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Community-Driven</h4>
                <p className="text-sm text-muted-foreground">
                  Jeder kann zur Verbesserung beitragen - durch Code, Feedback oder Ideen.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Code className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Kostenlos</h4>
                <p className="text-sm text-muted-foreground">
                  Die Nutzung ist komplett kostenfrei - keine versteckten Gebühren oder Premium-Features.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button className="w-full sm:w-auto" variant="outline" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                Zum GitHub Repository
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Gebaut mit modernen Web-Technologien
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>React</span>
              <span>•</span>
              <span>TypeScript</span>
              <span>•</span>
              <span>Supabase</span>
              <span>•</span>
              <span>Tailwind CSS</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};