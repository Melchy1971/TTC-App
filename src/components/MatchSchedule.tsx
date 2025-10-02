import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Edit, Key, Plus, Search, Trash2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Match } from "@/types/match";
import { initialSeasons, seasonTemplates } from "@/lib/teamData";

const LOCAL_STORAGE_KEY = "icsImportedMatches";
const IMPORT_EVENT = "ics-import-updated";
const TEAM_UPDATE_EVENT = "team-management-updated";

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
  const [dbTeams, setDbTeams] = useState<string[]>([]);
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
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamPins, setTeamPins] = useState<Record<string, { spielpin: string; spielpartie_pin: string | null }>>({});
  const [pinsDialogOpen, setPinsDialogOpen] = useState(false);
  const [selectedPinType, setSelectedPinType] = useState<"spielpin" | "spielpartie_pin" | null>(null);
  const { toast } = useToast();

  const loadDbTeams = useCallback(async () => {
    try {
      const currentSeason = initialSeasons.find(s => s.isCurrent);
      if (!currentSeason) return;

      const { data, error } = await supabase
        .from("teams")
        .select("name")
        .eq("season_id", currentSeason.id);

      if (error) throw error;
      setDbTeams((data || []).map(t => t.name));
    } catch (error) {
      console.error("Error loading teams from database:", error);
    }
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (data && data.length > 0) {
        // Check if user has any of the required roles
        const hasEditRole = data.some(r => 
          r.role === 'admin' || r.role === 'vorstand' || r.role === 'moderator' || r.role === 'mannschaftsfuehrer'
        );
        
        if (hasEditRole) {
          // Set to the first matching role for display purposes
          const editRole = data.find(r => 
            r.role === 'admin' || r.role === 'vorstand' || r.role === 'moderator' || r.role === 'mannschaftsfuehrer'
          );
          setUserRole(editRole?.role || null);
        } else {
          setUserRole(data[0].role);
        }
      }
    }
  };

  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
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

  const loadAllTeamPins = useCallback(async () => {
    try {
      // Get all match pins
      const { data: pins, error: pinsError } = await supabase
        .from("match_pins")
        .select(`
          spielpin,
          spielpartie_pin,
          matches!inner(team)
        `);

      if (pinsError) throw pinsError;

      // Group pins by team
      const pinsByTeam: Record<string, { spielpin: string; spielpartie_pin: string | null }> = {};
      if (pins) {
        pins.forEach((pin: any) => {
          const teamName = pin.matches?.team;
          if (teamName && !pinsByTeam[teamName]) {
            pinsByTeam[teamName] = {
              spielpin: pin.spielpin,
              spielpartie_pin: pin.spielpartie_pin
            };
          }
        });
      }

      setTeamPins(pinsByTeam);
    } catch (error) {
      console.error("Error loading team pins:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserRole();
    fetchMatches();
    loadImportedMatches();
    loadDbTeams();
    loadAllTeamPins();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY) {
        loadImportedMatches();
      }
    };

    const handleImportUpdate = () => {
      loadImportedMatches();
    };

    const handleTeamUpdate = () => {
      loadDbTeams();
      loadAllTeamPins();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);
    window.addEventListener(TEAM_UPDATE_EVENT, handleTeamUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(IMPORT_EVENT, handleImportUpdate as EventListener);
      window.removeEventListener(TEAM_UPDATE_EVENT, handleTeamUpdate as EventListener);
    };
  }, [fetchMatches, loadImportedMatches, loadDbTeams, loadAllTeamPins]);

  const handleSaveResult = async () => {
    if (!resultMatch) return;

    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (resultMatch.source === "ics" && !canEditImported) {
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
      const isIcsMatch = resultMatch.source === "ics";
      
      if (isIcsMatch) {
        // For ICS matches, create a new match in Supabase with the result
        const { error } = await supabase
          .from("matches")
          .insert([{
            team: resultMatch.team,
            opponent: resultMatch.opponent,
            date: resultMatch.date,
            time: resultMatch.time || "",
            location: resultMatch.location || "",
            home_score: homeScore,
            away_score: awayScore,
            status: "completed"
          }]);

        if (error) throw error;

        // Remove from localStorage
        if (resultMatch.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const allIcsMatches = JSON.parse(stored) as Match[];
            const filtered = allIcsMatches.filter(m => m.icsUid !== resultMatch.icsUid);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            loadImportedMatches();
          }
        }
      } else {
        // Update existing Supabase match
        const { error } = await supabase
          .from("matches")
          .update({
            home_score: homeScore,
            away_score: awayScore,
            status: "completed"
          } as Partial<Match>)
          .eq("id", resultMatch.id);

        if (error) throw error;
      }

      toast({
        title: "Erfolg",
        description: isIcsMatch 
          ? "ICS-Spiel mit Ergebnis in den regulären Spielplan übernommen."
          : "Ergebnis wurde gespeichert."
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
      const isIcsMatch = matchFormMatch?.source === "ics";
      
      if (matchFormMatch && !isIcsMatch) {
        // Update existing Supabase match
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
        // Create new match (either new or converted from ICS)
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

        // If this was an ICS match, remove it from localStorage
        if (isIcsMatch && matchFormMatch?.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const allIcsMatches = JSON.parse(stored) as Match[];
            const filtered = allIcsMatches.filter(m => m.icsUid !== matchFormMatch.icsUid);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            loadImportedMatches();
          }
        }

        toast({
          title: isIcsMatch ? "ICS-Spiel übernommen" : "Spiel erstellt",
          description: isIcsMatch 
            ? "Das ICS-Spiel wurde in den regulären Spielplan übernommen." 
            : "Das Spiel wurde zum Spielplan hinzugefügt."
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
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
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
      const isIcsMatch = match.source === "ics";
      
      if (isIcsMatch) {
        // Delete from localStorage
        if (match.icsUid) {
          const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (stored) {
            const allIcsMatches = JSON.parse(stored) as Match[];
            const filtered = allIcsMatches.filter(m => m.icsUid !== match.icsUid);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
            loadImportedMatches();
          }
        }
      } else {
        // Delete from Supabase
        const { error } = await supabase
          .from("matches")
          .delete()
          .eq("id", match.id);

        if (error) throw error;
        fetchMatches();
      }

      toast({
        title: "Spiel gelöscht",
        description: "Das Spiel wurde aus dem Spielplan entfernt."
      });
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
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
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
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
    if (match.source === "ics" && !canEditImported) {
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
    if (userRole === "admin" || userRole === "moderator" || userRole === "vorstand" || userRole === "mannschaftsfuehrer") return true;
    return false;
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

  const matchesByTeam = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    sortedAllMatches.forEach((match) => {
      const teamLabel = getTeamLabel(match.team);
      if (!grouped[teamLabel]) {
        grouped[teamLabel] = [];
      }
      grouped[teamLabel].push(match);
    });

    return grouped;
  }, [sortedAllMatches]);

  const teams = useMemo(() => {
    // Only show teams that exist in the database for the current season
    return dbTeams.sort((a, b) => a.localeCompare(b, "de-DE"));
  }, [dbTeams]);

  const teamMatches = useMemo(() => {
    if (!selectedTeam) return [];
    const matches = matchesByTeam[selectedTeam] ?? [];
    const lowerSearch = searchTerm.toLowerCase();
    if (!lowerSearch) {
      return matches;
    }

    return matches.filter((match) => {
      const teamLabel = getTeamLabel(match.team).toLowerCase();
      const opponent = (match.opponent || "").toLowerCase();
      const location = (match.location || "").toLowerCase();
      return (
        teamLabel.includes(lowerSearch) ||
        opponent.includes(lowerSearch) ||
        location.includes(lowerSearch)
      );
    });
  }, [matchesByTeam, searchTerm, selectedTeam]);

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
    if (!selectedTeam) return;
    if (!teams.includes(selectedTeam)) {
      setSelectedTeam(null);
    }
  }, [selectedTeam, teams]);

  const selectedTeamMatchesCount = useMemo(
    () => (selectedTeam ? matchesByTeam[selectedTeam]?.length ?? 0 : 0),
    [matchesByTeam, selectedTeam]
  );

  const renderMatchCard = (match: Match) => {
    const isImported = match.source === "ics";
    const canEditImported = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
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
              variant="default"
              size="sm"
              onClick={() => openEditDialog(match)}
              disabled={isImported && !canEditImported}
              className="bg-gradient-primary hover:bg-primary-hover"
            >
              <Edit className="mr-2 h-4 w-4" />
              Ändern
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openResultDialog(match)}
              disabled={isImported && !canEditImported}
            >
              <Trophy className="mr-2 h-4 w-4" />
              {match.home_score !== null ? "Ergebnis ändern" : "Ergebnis"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteMatch(match)}
              disabled={isImported && !canEditImported}
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
          <p className="text-muted-foreground">
            {selectedTeam
              ? `Spielplan und Ergebnisse für ${selectedTeam}.`
              : "Überblick über den aktuellen Spieltag und alle Mannschaften."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedTeam && (
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                setSelectedTeam(null);
                setSearchTerm("");
              }}
            >
              Zur Übersicht
            </Button>
          )}
          {canEdit && (
            <Button
              className="bg-gradient-primary shadow-sport hover:bg-primary-hover"
              onClick={openCreateDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Spiel hinzufügen
            </Button>
          )}
        </div>
      </div>

      {!selectedTeam ? (
        <>
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

          <Card>
            <CardHeader>
              <CardTitle>Mannschaften</CardTitle>
              <CardDescription>
                {teams.length > 0
                  ? "Wählen Sie eine Mannschaft aus, um deren Spielplan einzusehen."
                  : "Es wurden noch keine Mannschaften mit Spielen hinterlegt."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => {
                    const teamMatchCount = matchesByTeam[team]?.length ?? 0;
                    const hasPins = teamPins[team];
                    const canViewPins = userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer";
                    
                    return (
                      <div key={team} className="flex flex-col gap-2 p-4 rounded-lg border bg-card">
                        <Button
                          variant="outline"
                          className="w-full flex items-center justify-between gap-3 border-dashed"
                          onClick={() => {
                            setSelectedTeam(team);
                            setSearchTerm("");
                          }}
                        >
                          <span>{team}</span>
                          {teamMatchCount > 0 && (
                            <Badge variant="secondary">
                              {teamMatchCount}
                            </Badge>
                          )}
                        </Button>
                        
                        {canViewPins && hasPins && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => {
                                setSelectedTeam(team);
                                setSelectedPinType("spielpin");
                                setPinsDialogOpen(true);
                              }}
                            >
                              <Key className="h-3 w-3" />
                              Spielpin
                            </Button>
                            {hasPins.spielpartie_pin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 gap-2"
                                onClick={() => {
                                  setSelectedTeam(team);
                                  setSelectedPinType("spielpartie_pin");
                                  setPinsDialogOpen(true);
                                }}
                              >
                                <Key className="h-3 w-3" />
                                Spielcode
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Legen Sie neue Spiele an oder importieren Sie einen Spielplan, um hier Mannschaften zu sehen.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <CardTitle>{selectedTeam}</CardTitle>
                <CardDescription>
                  {selectedTeamMatchesCount > 0
                    ? "Alle Spielpaarungen dieser Mannschaft."
                    : "Für diese Mannschaft wurden noch keine Spiele erfasst."}
                </CardDescription>
              </div>
              {(userRole === "admin" || userRole === "vorstand" || userRole === "mannschaftsfuehrer") && 
               selectedTeam && teamPins[selectedTeam] && (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPinType("spielpin");
                      setPinsDialogOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Spielpin
                  </Button>
                  {teamPins[selectedTeam].spielpartie_pin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPinType("spielpartie_pin");
                        setPinsDialogOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Key className="h-4 w-4" />
                      Spiel-Pin
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTeamMatchesCount > 0 && (
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Spiel oder Ort suchen..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            )}

            {teamMatches.length > 0 ? (
              <div className="space-y-4">
                {teamMatches.map(renderMatchCard)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selectedTeamMatchesCount > 0
                  ? "Keine Spiele passend zur Suche gefunden."
                  : "Legen Sie neue Spiele an oder importieren Sie einen Spielplan."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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

      <Dialog open={pinsDialogOpen} onOpenChange={setPinsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPinType === "spielpin" ? "Spielpin" : "Spielcode"}
            </DialogTitle>
            <DialogDescription>
              {selectedTeam && `Pin für ${selectedTeam}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                {selectedPinType === "spielpin" ? "Spielpin" : "Spielcode"}
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  readOnly
                  value={
                    selectedTeam && teamPins[selectedTeam]
                      ? selectedPinType === "spielpin"
                        ? teamPins[selectedTeam].spielpin
                        : teamPins[selectedTeam].spielpartie_pin || ""
                      : ""
                  }
                  className="font-mono text-lg font-semibold"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedTeam && teamPins[selectedTeam]) {
                      const pin =
                        selectedPinType === "spielpin"
                          ? teamPins[selectedTeam].spielpin
                          : teamPins[selectedTeam].spielpartie_pin;
                      if (pin) {
                        navigator.clipboard.writeText(pin);
                        toast({
                          title: "Kopiert",
                          description: "Der Pin wurde in die Zwischenablage kopiert."
                        });
                      }
                    }
                  }}
                >
                  Kopieren
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
