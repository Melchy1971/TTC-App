import { useMemo, useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Download, MapPin, Printer, Users, Calendar, TrendingUp, Layers } from "lucide-react";
import { initialSeasons } from "@/lib/teamData";
import type { Team, TeamMember } from "@/types/team";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const TeamOverview = () => {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState(() => {
    const currentSeason = initialSeasons.find((season) => season.isCurrent);
    return currentSeason?.id ?? initialSeasons[0]?.id ?? "";
  });
  const [activeTab, setActiveTab] = useState("overview");

  const loadTeamsForSeason = useCallback(async (seasonId: string) => {
    try {
      setLoading(true);
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('season_id', seasonId);

      if (teamsError) throw teamsError;

      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*');

      if (membersError) throw membersError;

      const teamsWithMembers: Team[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        league: team.league,
        division: team.division || undefined,
        trainingSlots: (team.training_slots as any[]) || [],
        homeMatch: team.home_match as any || undefined,
        members: (membersData || [])
          .filter(m => m.team_id === team.id)
          .map(m => ({
            id: m.member_id,
            name: m.member_id,
            email: '',
            rating: 0,
            isCaptain: m.is_captain
          }))
      }));

      setTeams(teamsWithMembers);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast({
        title: "Fehler",
        description: "Teams konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedSeasonId) {
      loadTeamsForSeason(selectedSeasonId);
    }
  }, [selectedSeasonId, loadTeamsForSeason]);

  const selectedSeason = initialSeasons.find((season) => season.id === selectedSeasonId);

  const aggregatedPlayers = useMemo<(TeamMember & { teams: string[] })[]>(() => {
    const playerMap = new Map<string, TeamMember & { teams: string[] }>();

    teams.forEach((team) => {
      team.members.forEach((member) => {
        const existing = playerMap.get(member.id);
        if (existing) {
          existing.teams = Array.from(new Set([...existing.teams, team.name]));
          existing.isCaptain = existing.isCaptain || member.isCaptain;
        } else {
          playerMap.set(member.id, { ...member, teams: [team.name] });
        }
      });
    });

    return Array.from(playerMap.values()).sort((a, b) => b.rating - a.rating);
  }, [teams]);

  const totalTeams = teams.length;
  const assignedPlayers = teams.reduce((sum, team) => sum + team.members.length, 0);
  const availablePlayers = 0;
  const averageRating = aggregatedPlayers.length
    ? Math.round(
        aggregatedPlayers.reduce((sum, player) => sum + player.rating, 0) / aggregatedPlayers.length,
      )
    : 0;

  const handleDownloadCsv = () => {
    if (!aggregatedPlayers.length || typeof window === "undefined") return;

    const header = "Name;E-Mail;QTTR/TTR;Mannschaften";
    const rows = aggregatedPlayers.map((player) => {
      const teamsLabel = player.teams.length > 0 ? player.teams.join(", ") : "Noch keiner Mannschaft zugeordnet";
      return `${player.name};${player.email};${player.rating};${teamsLabel}`;
    });

    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qttr-gesamtliste-${selectedSeasonId || "verein"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintList = () => {
    if (!aggregatedPlayers.length || typeof window === "undefined") return;

    const rowsHtml = aggregatedPlayers
      .map((player) => {
        const teamsLabel = player.teams.length > 0 ? player.teams.join(", ") : "Noch keiner Mannschaft zugeordnet";
        return `<tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${player.name}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${player.email}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${player.rating}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${teamsLabel}</td>
          </tr>`;
      })
      .join("");

    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QTTR/TTR Gesamtliste</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 8px; border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <h1>QTTR/TTR Gesamtliste – ${selectedSeason?.label ?? "Vereinsübersicht"}</h1>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>E-Mail</th>
                <th>QTTR/TTR</th>
                <th>Mannschaften</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Mannschaften & QTTR-Übersicht
          </h2>
          <p className="text-muted-foreground">
            Alle Rollen erhalten hier einen schnellen Blick auf aktuelle Mannschaften, zugeteilte Spieler:innen
            und deren QTTR/TTR-Werte.
          </p>
        </div>
        <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Saison auswählen" />
          </SelectTrigger>
          <SelectContent>
            {initialSeasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.label} {season.isCurrent && "• Aktuell"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sport">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktive Mannschaften</CardTitle>
            <Layers className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams}</div>
            <p className="text-xs text-muted-foreground">vereinsweit gemeldete Teams</p>
          </CardContent>
        </Card>
        <Card className="shadow-sport">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eingesetzte Spieler:innen</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedPlayers}</div>
            <p className="text-xs text-muted-foreground">in aktuellen Mannschaften</p>
          </CardContent>
        </Card>
        <Card className="shadow-sport">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschnittlicher QTTR/TTR</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating}</div>
            <p className="text-xs text-muted-foreground">über alle erfassten Mitglieder</p>
          </CardContent>
        </Card>
        <Card className="shadow-sport">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verfügbare Spieler:innen</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availablePlayers}</div>
            <p className="text-xs text-muted-foreground">noch ohne feste Mannschaft</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Mannschaften</TabsTrigger>
          <TabsTrigger value="ttr">QTTR/TTR</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : teams.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {teams.map((team) => (
                <Card key={team.id} className="shadow-sport h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl font-semibold">{team.name}</CardTitle>
                        <CardDescription className="text-base">
                          {team.league}
                          {team.division ? ` • ${team.division}` : ""}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                        {team.members.length} Spieler:innen
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(team.trainingSlots.length > 0 || team.homeMatch) && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-foreground">Rahmendaten</div>
                        <div className="grid gap-2 text-sm text-muted-foreground">
                          {team.trainingSlots.map((slot, index) => (
                            <div key={`${team.id}-training-${index}`} className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>
                                Training {index + 1}: {slot.day}, {slot.time} Uhr
                              </span>
                            </div>
                          ))}
                          {team.homeMatch && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span>
                                Heimspiele: {team.homeMatch.day}, {team.homeMatch.time} Uhr – {team.homeMatch.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-foreground">Aufstellung</div>
                      <Separator />
                      <div className="space-y-3">
                        {team.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Keine Spieler:innen zugewiesen.</p>
                        ) : (
                          team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex flex-col gap-1 rounded-lg border border-slate-200/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{member.name}</span>
                                  {member.isCaptain && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                      <Crown className="h-3 w-3 text-primary" /> Kapitän:in
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                                  <span>{member.email}</span>
                                  {member.playStyle && <span>• Spielstil: {member.playStyle}</span>}
                                </div>
                              </div>
                              <Badge className="self-start sm:self-auto bg-gradient-primary text-white">
                                QTTR {member.rating}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle>Keine Mannschaften gefunden</CardTitle>
                <CardDescription>Für diese Saison wurden noch keine Mannschaften angelegt.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ttr" className="space-y-4">
          <Card className="shadow-sport">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">QTTR/TTR Gesamtliste</CardTitle>
                <CardDescription>
                  Exportieren oder drucken Sie die aktuelle Gesamtliste aller Mitglieder inklusive Mannschaftszuordnung.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleDownloadCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  Als CSV herunterladen
                </Button>
                <Button variant="outline" onClick={handlePrintList} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Liste drucken
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>QTTR/TTR</TableHead>
                    <TableHead>Mannschaften</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedPlayers.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-muted-foreground">{player.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white font-semibold">
                          {player.rating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {player.teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {player.teams.map((team) => (
                              <Badge key={`${player.id}-${team}`} variant="secondary">
                                {team}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Noch keiner Mannschaft zugeordnet</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>
                  Stand: {new Date().toLocaleDateString("de-DE")} • Saison {selectedSeason?.label ?? "unbekannt"}
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
