import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Edit, Plus, Search, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Match } from "@/types/match";

const LOCAL_STORAGE_KEY = "icsImportedMatches";
const IMPORT_EVENT = "ics-import-updated";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Geplant",
  completed: "Abgeschlossen",
  canceled: "Abgesagt"
};

const UNKNOWN_TEAM_LABEL = "Unbekannte Mannschaft";

const getTeamLabel = (team?: string | null) => {
  if (!team) return UNKNOWN_TEAM_LABEL;
  const trimmed = team.trim();
  return trimmed.length > 0 ? trimmed : UNKNOWN_TEAM_LABEL;
};

const parseMatchDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchSortValue = (value?: string | null) => {
  const parsed = parseMatchDate(value);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
};

const datesAreOnSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const MatchSchedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [importedMatches, setImportedMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [resultMatch, setResultMatch] = useState<Match | null>(null);
  const [matchFormMatch, setMatchFormMatch] = useState<Match | null>(null);
  const [matchForm, setMatchForm] = useState({
    team: "",
    opponent: "",
    date: "",
    time: "",
    location: "",
    status: "scheduled"
  });
  const [resultForm, setResultForm] = useState({ home: "", away: "" });
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRole();
    fetchMatches();
    loadImportedMatches();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY) {
        loadImportedMatches();
      }
    };

    const handleImportUpdate = () => {
      loadImportedMatches();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);
    };
  }, [fetchMatches, loadImportedMatches]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setUserRole(data.role);
      }
    }
  };

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from<Match>("matches")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      const normalized = (data || []).map((match) => ({
        ...match,
        time: match.time || "",
        source: "supabase" as const
      }));
      setMatches(normalized);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Fehler",
        description: "Spiele konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadImportedMatches = useCallback(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        setImportedMatches([]);
        return;
      }

      const parsed = JSON.parse(stored) as Match[];
      const normalized = parsed.map((match) => ({
        ...match,
        source: "ics" as const
      }));
      setImportedMatches(normalized);
    } catch (error) {
      console.error("Error loading ICS matches:", error);
      setImportedMatches([]);
    }
  }, []);

  const handleSaveResult = async () => {
    if (!resultMatch) return;

    if (resultMatch.source === "ics") {
      toast({
        title: "Nicht möglich",
        description: "Importierte Spiele werden über den ICS-Import verwaltet.",
        variant: "destructive"
      });
      return;
    }

    const homeScore = parseInt(resultForm.home, 10);
    const awayScore = parseInt(resultForm.away, 10);

    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      toast({
        title: "Ungültiges Ergebnis",
        description: "Bitte geben Sie gültige Zahlen für beide Ergebnisse ein.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("matches")
        .update({
          home_score: homeScore,
          away_score: awayScore,
          status: "completed"
        } as Partial<Match>)
        .eq("id", resultMatch.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Ergebnis wurde gespeichert."
      });

      fetchMatches();
      setResultDialogOpen(false);
      setResultMatch(null);
    } catch (error) {
      console.error("Error saving result:", error);
      toast({
        title: "Fehler",
        description: "Ergebnis konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveMatch = async () => {
    if (!matchForm.team || !matchForm.opponent || !matchForm.date || !matchForm.time || !matchForm.location) {
      toast({
        title: "Pflichtfelder fehlen",
        description: "Bitte füllen Sie alle Felder aus, um den Spielplan zu speichern.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (matchFormMatch) {
        const { error } = await supabase
          .from("matches")
          .update({
            team: matchForm.team,
            opponent: matchForm.opponent,
            date: matchForm.date,
            time: matchForm.time,
            location: matchForm.location,
            status: matchForm.status
          } as Partial<Match>)
          .eq("id", matchFormMatch.id);

        if (error) throw error;

        toast({
          title: "Spiel aktualisiert",
          description: "Die Spielplandaten wurden erfolgreich aktualisiert."
        });
      } else {
        const { error } = await supabase
          .from("matches")
          .insert([{
            team: matchForm.team,
            opponent: matchForm.opponent,
            date: matchForm.date,
            time: matchForm.time,
            location: matchForm.location,
            status: matchForm.status,
            home_score: null,
            away_score: null
          }]);

        if (error) throw error;

        toast({
          title: "Spiel erstellt",
          description: "Das Spiel wurde zum Spielplan hinzugefügt."
        });
      }

      fetchMatches();
      resetMatchForm();
    } catch (error) {
      console.error("Error saving match:", error);
      toast({
        title: "Fehler",
        description: "Der Spielplan konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMatch = async (match: Match) => {
    if (match.source === "ics") {
      toast({
        title: "Aktion nicht verfügbar",
        description: "Importierte Spiele können hier nicht gelöscht werden.",
        variant: "destructive"
      });
      return;
    }

    const confirmDelete = window.confirm(`Soll das Spiel ${match.team} vs ${match.opponent} wirklich gelöscht werden?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", match.id);

      if (error) throw error;

      toast({
        title: "Spiel gelöscht",
        description: "Das Spiel wurde aus dem Spielplan entfernt."
      });

      fetchMatches();
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Fehler",
        description: "Das Spiel konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const resetMatchForm = () => {
    setMatchDialogOpen(false);
    setMatchFormMatch(null);
    setMatchForm({
      team: "",
      opponent: "",
      date: "",
      time: "",
      location: "",
      status: "scheduled"
    });
  };

  const openCreateDialog = () => {
    setMatchFormMatch(null);
    setMatchForm({
      team: "",
      opponent: "",
      date: "",
      time: "",
      location: "",
      status: "scheduled"
    });
    setMatchDialogOpen(true);
  };

  const openEditDialog = (match: Match) => {
    if (match.source === "ics") {
      toast({
        title: "Bearbeitung nicht möglich",
        description: "Importierte Spiele können nur über den ICS-Import angepasst werden.",
        variant: "destructive"
      });
      return;
    }

    setMatchFormMatch(match);
    setMatchForm({
      team: match.team,
      opponent: match.opponent,
      date: match.date ? match.date.split("T")[0] : "",
      time: match.time || "",
      location: match.location || "",
      status: match.status || "scheduled"
    });
    setMatchDialogOpen(true);
  };

  const openResultDialog = (match: Match) => {
    if (match.source === "ics") {
      toast({
        title: "Bearbeitung nicht möglich",
        description: "Importierte Spiele können nur über den ICS-Import angepasst werden.",
        variant: "destructive"
      });
      return;
    }

    setResultMatch(match);
    setResultForm({
      home: match.home_score !== null && match.home_score !== undefined ? String(match.home_score) : "",
      away: match.away_score !== null && match.away_score !== undefined ? String(match.away_score) : ""
    });
    setResultDialogOpen(true);
  };

  const canEdit = useMemo(() => {
    if (!userRole) return false;
    if (userRole === "admin" || userRole === "captain") return true;
    // Backwards compatibility for ältere Daten
    return userRole === "moderator";
  }, [userRole]);

  const allMatches = useMemo(
    () => [...matches, ...importedMatches],
    [matches, importedMatches]
  );

  const sortedAllMatches = useMemo(
    () =>
      [...allMatches].sort(
        (a, b) => matchSortValue(a.date) - matchSortValue(b.date)
      ),
    [allMatches]
  );

  const filteredMatches = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    if (!lowerSearch) {
      return sortedAllMatches;
    }

    return sortedAllMatches.filter((match) => {
      const teamLabel = getTeamLabel(match.team);
      return (
        teamLabel.toLowerCase().includes(lowerSearch) ||
        match.opponent.toLowerCase().includes(lowerSearch) ||
        match.location.toLowerCase().includes(lowerSearch)
      );
    });
  }, [sortedAllMatches, searchTerm]);

  const matchesByTeam = useMemo(() => {
    const grouped: Record<string, Match[]> = {};

    filteredMatches.forEach((match) => {
      const teamLabel = getTeamLabel(match.team);
      if (!grouped[teamLabel]) {
        grouped[teamLabel] = [];
      }
      grouped[teamLabel].push(match);
    });

    return grouped;
  }, [filteredMatches]);

  const teams = useMemo(() => {
    const teamSet = new Set<string>();

    allMatches.forEach((match) => {
      teamSet.add(getTeamLabel(match.team));
    });

    return Array.from(teamSet).sort((a, b) => a.localeCompare(b, "de-DE"));
  }, [allMatches]);

  const currentMatchdayDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = sortedAllMatches.find((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      const normalized = new Date(matchDate);
      normalized.setHours(0, 0, 0, 0);
      return normalized >= today;
    });

    if (upcoming) {
      return upcoming.date;
    }

    const last = [...sortedAllMatches]
      .reverse()
      .find((match) => parseMatchDate(match.date));

    return last ? last.date : null;
  }, [sortedAllMatches]);

  const overviewMatches = useMemo(() => {
    if (!currentMatchdayDate) return [];
    const reference = parseMatchDate(currentMatchdayDate);
    if (!reference) return [];

    return sortedAllMatches.filter((match) => {
      const matchDate = parseMatchDate(match.date);
      if (!matchDate) return false;
      return datesAreOnSameDay(matchDate, reference);
    });
  }, [sortedAllMatches, currentMatchdayDate]);

  const formattedMatchdayDate = useMemo(() => {
    if (!currentMatchdayDate) return "";
    const date = parseMatchDate(currentMatchdayDate);
    return date ? date.toLocaleDateString("de-DE") : "";
  }, [currentMatchdayDate]);

  useEffect(() => {
    if (activeTab === "overview") return;

    if (teams.length === 0) {
      setActiveTab("overview");
      return;
    }

    if (!teams.includes(activeTab)) {
      setActiveTab(teams[0]);
    }
  }, [teams, activeTab]);

  const renderMatchCard = (match: Match) => {
    const isImported = match.source === "ics";
    const matchDate = parseMatchDate(match.date);
    const formattedDate = matchDate
      ? matchDate.toLocaleDateString("de-DE")
      : match.date;
    const formattedTime = match.time
      ? match.time
      : matchDate
        ? matchDate.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";
    const statusKey = match.status || "scheduled";
    const teamLabel = getTeamLabel(match.team);
    const opponentLabel = match.opponent || "Unbekannter Gegner";
    const matchKey = `${match.source || "supabase"}-${
      match.id ||
      match.icsUid ||
      [teamLabel, opponentLabel, match.date].filter(Boolean).join("-")
    }`;

    return (
      <div
        key={matchKey}
        className="flex flex-col gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-accent sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {formattedDate}
              {formattedTime ? ` um ${formattedTime}` : ""}
            </span>
            <Badge
              variant={
                statusKey === "completed"
                  ? "default"
                  : statusKey === "canceled"
                    ? "destructive"
                    : "outline"
              }
            >
              {STATUS_LABELS[statusKey] || statusKey}
            </Badge>
            {isImported && <Badge variant="secondary">ICS-Import</Badge>}
          </div>
          <div className="text-lg font-semibold">
            {teamLabel} vs {opponentLabel}
          </div>
          <div className="text-sm text-muted-foreground">
            {match.location || "Ort noch nicht festgelegt"}
          </div>
          {match.description && (
            <div className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
              {match.description}
            </div>
          )}
          {match.home_score !== null && match.away_score !== null && (
            <div className="mt-2 text-lg font-bold">
              Ergebnis: {match.home_score}:{match.away_score}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResultDialog(match)}
              disabled={isImported}
            >
              {match.home_score !== null ? (
                <Edit className="mr-2 h-4 w-4" />
              ) : (
                <Trophy className="mr-2 h-4 w-4" />
              )}
              {match.home_score !== null
                ? "Ergebnis bearbeiten"
                : "Ergebnis eintragen"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(match)}
              disabled={isImported}
            >
              <Edit className="mr-2 h-4 w-4" />
              Details bearbeiten
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteMatch(match)}
              disabled={isImported}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Löschen
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/4 rounded bg-gray-200 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Spielplan</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Spiele und Ergebnisse</p>
        </div>
        {canEdit && (
          <Button className="bg-gradient-primary shadow-sport hover:bg-primary-hover" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Spiel hinzufügen
          </Button>
        )}
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
        <Input
          placeholder="Spiel oder Ort suchen..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 overflow-x-auto">
          <TabsTrigger value="overview" className="flex-shrink-0">
            Übersicht
          </TabsTrigger>
          {teams.map((team) => {
            const teamMatchesCount = matchesByTeam[team]?.length ?? 0;
            return (
              <TabsTrigger
                key={team}
                value={team}
                className="flex-shrink-0 items-center gap-2"
              >
                <span>{team}</span>
                {teamMatchesCount > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {teamMatchesCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktueller Spieltag</CardTitle>
              <CardDescription>
                {formattedMatchdayDate
                  ? `Alle Spiele am ${formattedMatchdayDate}`
                  : "Aktuell sind keine Spiele geplant."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewMatches.length > 0 ? (
                <div className="space-y-4">
                  {overviewMatches.map(renderMatchCard)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Es liegen keine Spiele für den aktuellen Spieltag vor.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {teams.map((team) => {
          const teamMatches = matchesByTeam[team] ?? [];
          return (
            <TabsContent key={team} value={team} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{team}</CardTitle>
                  <CardDescription>
                    {teamMatches.length > 0
                      ? "Alle Spielpaarungen dieser Mannschaft."
                      : searchTerm
                        ? "Keine Spiele passend zur Suche gefunden."
                        : "Für diese Mannschaft wurden noch keine Spiele erfasst."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamMatches.length > 0 ? (
                    <div className="space-y-4">
                      {teamMatches.map(renderMatchCard)}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {searchTerm
                        ? "Passen Sie den Suchbegriff an, um weitere Spiele anzuzeigen."
                        : "Legen Sie neue Spiele an oder importieren Sie einen Spielplan."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog
        open={resultDialogOpen}
        onOpenChange={(open) => {
          setResultDialogOpen(open);
          if (!open) {
            setResultMatch(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ergebnis eintragen</DialogTitle>
            <DialogDescription>
              {resultMatch ? `${resultMatch.team} vs ${resultMatch.opponent}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="homeScore">{resultMatch?.team || "Heimmannschaft"}</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={resultForm.home}
                onChange={(event) => setResultForm((prev) => ({ ...prev, home: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="awayScore">{resultMatch?.opponent || "Gastmannschaft"}</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={resultForm.away}
                onChange={(event) => setResultForm((prev) => ({ ...prev, away: event.target.value }))}
              />
            </div>
          </div>
          <Button className="mt-4 w-full" onClick={handleSaveResult}>
            Speichern
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={matchDialogOpen}
        onOpenChange={(open) => {
          setMatchDialogOpen(open);
          if (!open) {
            resetMatchForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{matchFormMatch ? "Spiel bearbeiten" : "Neues Spiel"}</DialogTitle>
            <DialogDescription>Erfassen oder ändern Sie die Details eines Spiels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="team">Heimmannschaft</Label>
                <Input
                  id="team"
                  value={matchForm.team}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, team: event.target.value }))}
                  placeholder="z. B. Herren I"
                />
              </div>
              <div>
                <Label htmlFor="opponent">Gastmannschaft</Label>
                <Input
                  id="opponent"
                  value={matchForm.opponent}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, opponent: event.target.value }))}
                  placeholder="z. B. TTC Musterstadt"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={matchForm.date}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, date: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Uhrzeit</Label>
                <Input
                  id="time"
                  type="time"
                  value={matchForm.time}
                  onChange={(event) => setMatchForm((prev) => ({ ...prev, time: event.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Spielort</Label>
              <Input
                id="location"
                value={matchForm.location}
                onChange={(event) => setMatchForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="z. B. Sporthalle Musterstadt"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={matchForm.status} onValueChange={(value) => setMatchForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Geplant</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="canceled">Abgesagt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveMatch}>
              {matchFormMatch ? "Änderungen speichern" : "Spiel erstellen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
