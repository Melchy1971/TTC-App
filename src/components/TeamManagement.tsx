import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogFooterPrimitive, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Crown, Flag, Layers, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Season, SeasonState } from "@/types/team";
import { clubMembers, initialSeasons } from "@/lib/teamData";
import { supabase } from "@/integrations/supabase/client";

type TeamFormState = {
  name: string;
  league: string;
  division: string;
  trainingDay1: string;
  trainingTime1: string;
  trainingDay2: string;
  trainingTime2: string;
  homeMatchDay: string;
  homeMatchTime: string;
  homeMatchLocation: string;
};

type TrainingSlot = {
  day: string;
  time: string;
};

const WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag"
];

const createEmptyTeamForm = (): TeamFormState => ({
  name: "",
  league: "",
  division: "",
  trainingDay1: "",
  trainingTime1: "",
  trainingDay2: "",
  trainingTime2: "",
  homeMatchDay: "",
  homeMatchTime: "",
  homeMatchLocation: ""
});

const TEAM_UPDATE_EVENT = "team-management-updated";

export const TeamManagement = () => {
  const { toast } = useToast();
  const [seasonStates, setSeasonStates] = useState<Record<string, SeasonState>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    initialSeasons.find((season) => season.isCurrent)?.id ?? initialSeasons[0]?.id
  );
  const [seasonList, setSeasonList] = useState<Season[]>(initialSeasons);
  const [isSeasonDialogOpen, setIsSeasonDialogOpen] = useState(false);
  const [newSeasonLabel, setNewSeasonLabel] = useState("");
  const [newSeasonStart, setNewSeasonStart] = useState("");
  const [newSeasonEnd, setNewSeasonEnd] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");
  const [selectedTargetTeam, setSelectedTargetTeam] = useState<string>("");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState<TeamFormState>(createEmptyTeamForm());
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const selectedSeason = seasonList.find((season) => season.id === selectedSeasonId);
  const selectedState = seasonStates[selectedSeasonId];
  const isCurrentSeason = Boolean(selectedSeason?.isCurrent);
  
  const showSeasonLockedToast = () =>
    toast({
      title: "Bearbeitung nicht möglich",
      description: "Vergangene Saisons können nur von Administratoren bearbeitet werden.",
      variant: "destructive"
    });
  
  const updateTeamForm = (field: keyof TeamFormState, value: string) =>
    setTeamForm((prev) => ({
      ...prev,
      [field]: value
    }));

  // Load teams and team members from Supabase
  const loadTeamsForSeason = async (seasonId: string) => {
    try {
      // First, get all user_ids with the player role
      const { data: playerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "player");

      if (rolesError) throw rolesError;

      const playerUserIds = (playerRoles || []).map(r => r.user_id);

      // Then load profiles for these users
      const { data: playerProfiles, error: playersError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, status")
        .eq("status", "active")
        .in("user_id", playerUserIds);

      if (playersError) throw playersError;

      const activePlayers = (playerProfiles || []).map(profile => ({
        id: profile.user_id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unbekannt',
        email: profile.email || '',
        rating: 0,
        playStyle: undefined
      }));

      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("season_id", seasonId);

      if (teamsError) throw teamsError;

      if (!teams || teams.length === 0) {
        setSeasonStates((prev) => ({
          ...prev,
          [seasonId]: {
            teams: [],
            availableMembers: activePlayers
          }
        }));
        return;
      }

      // Load team members for all teams
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("*")
        .in("team_id", teams.map(t => t.id));

      if (membersError) throw membersError;

      const assignedMemberIds = new Set(teamMembers?.map(tm => tm.member_id) || []);

      const teamsWithMembers = teams.map((team) => {
        const members = (teamMembers || [])
          .filter(tm => tm.team_id === team.id)
          .map(tm => {
            const baseMember = activePlayers.find(m => m.id === tm.member_id);
            if (!baseMember) return null;
            return {
              ...baseMember,
              isCaptain: tm.is_captain
            };
          })
          .filter(Boolean);

        return {
          id: team.id,
          name: team.name,
          league: team.league,
          division: team.division || undefined,
          trainingSlots: team.training_slots as any[] || [],
          homeMatch: team.home_match as any || undefined,
          members: members as any[]
        };
      });

      const availableMembers = activePlayers
        .filter(member => !assignedMemberIds.has(member.id));

      setSeasonStates((prev) => ({
        ...prev,
        [seasonId]: {
          teams: teamsWithMembers,
          availableMembers
        }
      }));
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Fehler",
        description: "Mannschaften konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      if (selectedSeasonId) {
        await loadTeamsForSeason(selectedSeasonId);
      }
      setLoading(false);
    };
    loadInitialData();
  }, [selectedSeasonId]);

  const notifyTeamUpdate = () => {
    window.dispatchEvent(new Event(TEAM_UPDATE_EVENT));
  };

  const filteredAvailableMembers = useMemo(() => {
    if (!selectedState) return [];
    if (!availableSearch) return selectedState.availableMembers;
    return selectedState.availableMembers.filter((member) =>
      `${member.name} ${member.email}`
        .toLowerCase()
        .includes(availableSearch.toLowerCase())
    );
  }, [availableSearch, selectedState]);

  const handleAssignMember = async (teamId: string, memberId: string) => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedState) return;

    const memberToAssign = selectedState.availableMembers.find((member) => member.id === memberId);
    if (!memberToAssign) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .insert([{
          team_id: teamId,
          member_id: memberId,
          is_captain: false
        }]);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId);
      notifyTeamUpdate();

      toast({
        title: "Mitglied zugeordnet",
        description: `${memberToAssign.name} wurde ${selectedState.teams.find((team) => team.id === teamId)?.name ?? "der Mannschaft"} hinzugefügt.`
      });
    } catch (error) {
      console.error("Error assigning member:", error);
      toast({
        title: "Fehler",
        description: "Mitglied konnte nicht zugeordnet werden.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedState) return;

    const removedMember = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("member_id", memberId);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId);
      notifyTeamUpdate();

      if (removedMember) {
        toast({
          title: "Mitglied entfernt",
          description: `${removedMember.name} wurde aus der Mannschaft entfernt.`
        });
      }
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Fehler",
        description: "Mitglied konnte nicht entfernt werden.",
        variant: "destructive"
      });
    }
  };

  const handleSetCaptain = async (teamId: string, memberId: string) => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    if (!selectedState) return;

    const newCaptain = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    try {
      // First, unset all captains for this team
      const { error: unsetError } = await supabase
        .from("team_members")
        .update({ is_captain: false })
        .eq("team_id", teamId);

      if (unsetError) throw unsetError;

      // Then set the new captain
      const { error: setError } = await supabase
        .from("team_members")
        .update({ is_captain: true })
        .eq("team_id", teamId)
        .eq("member_id", memberId);

      if (setError) throw setError;

      await loadTeamsForSeason(selectedSeasonId);
      notifyTeamUpdate();

      if (newCaptain) {
        toast({
          title: "Mannschaftsführer gesetzt",
          description: `${newCaptain.name} ist jetzt Mannschaftsführer${newCaptain.name.endsWith("a") ? "in" : ""}.`
        });
      }
    } catch (error) {
      console.error("Error setting captain:", error);
      toast({
        title: "Fehler",
        description: "Mannschaftsführer konnte nicht gesetzt werden.",
        variant: "destructive"
      });
    }
  };

  const resetTeamDialog = () => {
    setTeamForm(createEmptyTeamForm());
    setEditingTeamId(null);
  };

  const handleOpenCreateTeam = () => {
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }
    resetTeamDialog();
    setIsTeamDialogOpen(true);
  };

  const handleEditTeam = (teamId: string) => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    const teamToEdit = selectedState.teams.find((team) => team.id === teamId);
    if (!teamToEdit) return;

    setTeamForm({
      name: teamToEdit.name,
      league: teamToEdit.league,
      division: teamToEdit.division ?? "",
      trainingDay1: teamToEdit.trainingSlots[0]?.day ?? "",
      trainingTime1: teamToEdit.trainingSlots[0]?.time ?? "",
      trainingDay2: teamToEdit.trainingSlots[1]?.day ?? "",
      trainingTime2: teamToEdit.trainingSlots[1]?.time ?? "",
      homeMatchDay: teamToEdit.homeMatch?.day ?? "",
      homeMatchTime: teamToEdit.homeMatch?.time ?? "",
      homeMatchLocation: teamToEdit.homeMatch?.location ?? ""
    });
    setEditingTeamId(teamId);
    setIsTeamDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    if (!teamForm.name.trim() || !teamForm.league.trim()) {
      toast({
        title: "Angaben unvollständig",
        description: "Bitte geben Sie mindestens Mannschaftsname und Spielklasse an.",
        variant: "destructive"
      });
      return;
    }

    const hasTraining1 = teamForm.trainingDay1 && teamForm.trainingTime1;
    const hasTraining2 = teamForm.trainingDay2 && teamForm.trainingTime2;
    const training1Partial =
      (teamForm.trainingDay1 && !teamForm.trainingTime1) || (!teamForm.trainingDay1 && teamForm.trainingTime1);
    const training2Partial =
      (teamForm.trainingDay2 && !teamForm.trainingTime2) || (!teamForm.trainingDay2 && teamForm.trainingTime2);

    if (training1Partial || training2Partial) {
      toast({
        title: "Trainingstag unvollständig",
        description: "Bitte geben Sie für Trainingstage immer Wochentag und Uhrzeit an.",
        variant: "destructive"
      });
      return;
    }

    const trainingSlots: TrainingSlot[] = [];
    if (hasTraining1) {
      trainingSlots.push({ day: teamForm.trainingDay1, time: teamForm.trainingTime1.trim() });
    }
    if (hasTraining2) {
      trainingSlots.push({ day: teamForm.trainingDay2, time: teamForm.trainingTime2.trim() });
    }

    if (trainingSlots.length === 0) {
      toast({
        title: "Training fehlt",
        description: "Bitte hinterlegen Sie mindestens einen Trainingstag mit Uhrzeit.",
        variant: "destructive"
      });
      return;
    }

    const homeMatchValues = [teamForm.homeMatchDay, teamForm.homeMatchTime, teamForm.homeMatchLocation];
    const hasHomeMatchInformation = homeMatchValues.some((value) => value.trim() !== "");
    if (hasHomeMatchInformation && homeMatchValues.some((value) => !value.trim())) {
      toast({
        title: "Heimspiel unvollständig",
        description: "Bitte geben Sie für den Heimspieltermin Tag, Uhrzeit und Spielort an oder lassen Sie alle Felder leer.",
        variant: "destructive"
      });
      return;
    }

    const homeMatch = hasHomeMatchInformation
      ? {
          day: teamForm.homeMatchDay,
          time: teamForm.homeMatchTime.trim(),
          location: teamForm.homeMatchLocation.trim()
        }
      : null;

    try {
      if (editingTeamId) {
        // Update existing team
        const { error } = await supabase
          .from("teams")
          .update({
            name: teamForm.name.trim(),
            league: teamForm.league.trim(),
            division: teamForm.division.trim() || null,
            training_slots: trainingSlots,
            home_match: homeMatch
          })
          .eq("id", editingTeamId);

        if (error) throw error;
      } else {
        // Create new team
        const { error } = await supabase
          .from("teams")
          .insert([{
            season_id: selectedSeasonId,
            name: teamForm.name.trim(),
            league: teamForm.league.trim(),
            division: teamForm.division.trim() || null,
            training_slots: trainingSlots,
            home_match: homeMatch
          }]);

        if (error) throw error;
      }

      await loadTeamsForSeason(selectedSeasonId);
      notifyTeamUpdate();

      toast({
        title: editingTeamId ? "Mannschaft aktualisiert" : "Mannschaft erstellt",
        description: `${teamForm.name.trim()} wurde ${editingTeamId ? "aktualisiert" : "angelegt"}.`
      });

      setIsTeamDialogOpen(false);
      resetTeamDialog();
    } catch (error) {
      console.error("Error saving team:", error);
      toast({
        title: "Fehler",
        description: "Mannschaft konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!selectedState) return;
    if (!isCurrentSeason) {
      showSeasonLockedToast();
      return;
    }

    const teamToDelete = selectedState.teams.find((team) => team.id === teamId);
    if (!teamToDelete) return;

    const confirmDelete = window.confirm(`Soll die Mannschaft "${teamToDelete.name}" wirklich gelöscht werden?`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      await loadTeamsForSeason(selectedSeasonId);
      notifyTeamUpdate();
      setSelectedTargetTeam("");

      toast({
        title: "Mannschaft gelöscht",
        description: `${teamToDelete.name} wurde entfernt.`
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Fehler",
        description: "Mannschaft konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleCreateSeason = () => {
    if (!newSeasonLabel || !newSeasonStart || !newSeasonEnd) {
      toast({
        title: "Angaben unvollständig",
        description: "Bitte geben Sie einen Namen sowie Start- und Endjahr an.",
        variant: "destructive"
      });
      return;
    }

    const newSeasonId = `${newSeasonStart}-${newSeasonEnd}`;
    if (seasonStates[newSeasonId]) {
      toast({
        title: "Saison existiert bereits",
        description: "Für diesen Zeitraum wurde schon eine Saison angelegt.",
        variant: "destructive"
      });
      return;
    }

    const newSeason: Season = {
      id: newSeasonId,
      label: newSeasonLabel,
      startYear: Number(newSeasonStart),
      endYear: Number(newSeasonEnd)
    };

    setSeasonList((prev) => [...prev, newSeason]);
    setSeasonStates((prev) => ({
      ...prev,
      [newSeason.id]: {
        teams: [],
        availableMembers: clubMembers.map((member) => ({ ...member }))
      }
    }));

    setSelectedSeasonId(newSeason.id);
    setIsSeasonDialogOpen(false);
    setNewSeasonLabel("");
    setNewSeasonStart("");
    setNewSeasonEnd("");

    toast({
      title: "Neue Saison erstellt",
      description: `${newSeason.label} wurde angelegt.`
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/4 rounded bg-muted mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded bg-muted"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Mannschaftsverwaltung
          </h2>
          <p className="text-muted-foreground">
            Ordnen Sie Mitglieder den Mannschaften zu, definieren Sie Mannschaftsführer und behalten Sie vergangene Saisons im Blick.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Saison auswählen" />
            </SelectTrigger>
            <SelectContent>
              {seasonList.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.label} {season.isCurrent && "• Aktuell"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isSeasonDialogOpen} onOpenChange={setIsSeasonDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary-hover shadow-sport">
                <Plus className="h-4 w-4 mr-2" />
                Saison anlegen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Saison anlegen</DialogTitle>
                <DialogDescription>
                  Erfassen Sie eine neue Spielzeit, um Mannschaften und Mitglieder später zuzuordnen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="season-label">Bezeichnung</Label>
                  <Input
                    id="season-label"
                    placeholder="z. B. Saison 2026/27"
                    value={newSeasonLabel}
                    onChange={(event) => setNewSeasonLabel(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="season-start">Startjahr</Label>
                    <Input
                      id="season-start"
                      type="number"
                      placeholder="2026"
                      value={newSeasonStart}
                      onChange={(event) => setNewSeasonStart(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="season-end">Endjahr</Label>
                    <Input
                      id="season-end"
                      type="number"
                      placeholder="2027"
                      value={newSeasonEnd}
                      onChange={(event) => setNewSeasonEnd(event.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooterPrimitive className="sm:justify-start">
                <Button onClick={handleCreateSeason} className="bg-gradient-secondary hover:bg-secondary/90">
                  Saison speichern
                </Button>
              </DialogFooterPrimitive>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedSeason && (
        <Card className="border-dashed border-primary/40">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                {selectedSeason.label}
              </CardTitle>
              <CardDescription>
                Zeitraum {selectedSeason.startYear}/{selectedSeason.endYear} · {selectedSeason.isCurrent ? "Aktuelle Saison" : "Archiv"}
              </CardDescription>
            </div>
            {selectedSeason.isCurrent && (
              <Badge className="bg-primary/10 text-primary border border-primary/40 flex items-center gap-1">
                <Flag className="h-3.5 w-3.5" /> Aktuell
              </Badge>
          )}
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-foreground">Teams der Saison</h3>
              <p className="text-sm text-muted-foreground">
                Pflegen Sie Spielklassen, Trainingszeiten und Heimspiele für die aktuelle Saison.
              </p>
            </div>
            <Button
              onClick={handleOpenCreateTeam}
              className={cn(
                "bg-gradient-secondary hover:bg-secondary-hover shadow-sport",
                !isCurrentSeason && "opacity-60"
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              Neue Mannschaft
            </Button>
          </div>

          {!isCurrentSeason && (
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 p-4 text-sm text-muted-foreground">
              Diese Saison ist archiviert. Änderungen an Mannschaften sind nur für Administratoren möglich.
            </div>
          )}

          {selectedState && selectedState.teams.length === 0 ? (
            <Card className="border-dashed border-muted-foreground/40 bg-muted/10">
              <CardContent className="py-8 text-center text-muted-foreground">
                Noch keine Mannschaften für diese Saison angelegt. Nutzen Sie „Neue Mannschaft“, um zu starten.
              </CardContent>
            </Card>
          ) : (
            selectedState?.teams.map((team) => (
              <Card key={team.id} className="shadow-sm border-border/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {team.name}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> {team.league}
                        </Badge>
                        {team.division && <Badge variant="outline">{team.division}</Badge>}
                        {team.trainingSlots.map((slot, index) => (
                          <Badge key={`${team.id}-training-${index}`} variant="outline">
                            Training {index + 1}: {slot.day} · {slot.time} Uhr
                          </Badge>
                        ))}
                        {team.homeMatch && (
                          <Badge variant="outline">
                            Heimspiel: {team.homeMatch.day} · {team.homeMatch.time} Uhr · {team.homeMatch.location}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-secondary/10 text-secondary-foreground">
                        {team.members.length} Spieler:innen
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTeam(team.id)}
                        className={cn("hover:text-primary", !isCurrentSeason && "opacity-60")}
                        title={
                          isCurrentSeason
                            ? "Mannschaft bearbeiten"
                            : "Nur in der aktuellen Saison bearbeitbar"
                        }
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Mannschaft bearbeiten</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTeam(team.id)}
                        className={cn("text-destructive hover:text-destructive", !isCurrentSeason && "opacity-60")}
                        title={
                          isCurrentSeason
                            ? "Mannschaft löschen"
                            : "Nur in der aktuellen Saison löschbar"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Mannschaft löschen</span>
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {team.members.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-muted-foreground">
                      Noch keine Mitglieder in dieser Mannschaft. Fügen Sie über die Auswahl unten Spieler:innen hinzu.
                    </div>
                  ) : (
                    team.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-lg border border-muted/70 bg-muted/20 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="bg-primary/10 text-primary">
                            <AvatarFallback>
                              {member.name
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">{member.name}</p>
                              {member.isCaptain && (
                                <Badge className="bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                                  <Crown className="h-3.5 w-3.5" /> Mannschaftsführer:in
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="outline">QTTR {member.rating}</Badge>
                              {member.playStyle && <Badge variant="outline">Spielstil: {member.playStyle}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={member.isCaptain ? "default" : "outline"}
                            className={cn(
                              member.isCaptain ? "bg-gradient-secondary" : "",
                              "flex items-center gap-2",
                              !isCurrentSeason && "opacity-60"
                            )}
                            onClick={() => handleSetCaptain(team.id, member.id)}
                          >
                            <Crown className="h-4 w-4" />
                            {member.isCaptain ? "Mannschaftsführer" : "Als Mannschaftsführer setzen"}
                          </Button>
                          <Button
                            variant="ghost"
                            className={cn(
                              "text-destructive hover:text-destructive",
                              !isCurrentSeason && "opacity-60"
                            )}
                            onClick={() => handleRemoveMember(team.id, member.id)}
                          >
                            Entfernen
                          </Button>
                        </div>
                      </div>
            ))
          )}
                </div>

                <div className="grid gap-2">
                  <Label>Mitglied hinzufügen</Label>
                  <Select
                    value=""
                    disabled={!isCurrentSeason || selectedState.availableMembers.length === 0}
                    onValueChange={(value) => handleAssignMember(team.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !isCurrentSeason
                            ? "Nur in aktueller Saison bearbeitbar"
                            : selectedState.availableMembers.length === 0
                              ? "Keine freien Mitglieder"
                              : "Mitglied auswählen"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedState.availableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} · QTTR {member.rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="h-full border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Mitgliederpool
              </CardTitle>
              <CardDescription>
                Freie Spieler:innen, die noch keiner Mannschaft der Saison zugeordnet sind.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Mitglieder durchsuchen..."
                value={availableSearch}
                onChange={(event) => setAvailableSearch(event.target.value)}
              />
              <div className="space-y-3">
                {filteredAvailableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Alle verfügbaren Mitglieder sind bereits Mannschaften zugeordnet.
                  </p>
                ) : (
                  filteredAvailableMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-lg border border-muted/60 bg-muted/10 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge variant="outline">QTTR {member.rating}</Badge>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">Mannschaft auswählen</Label>
                        <Select
                          value={
                            selectedTargetTeam && selectedTargetTeam.startsWith(member.id)
                              ? selectedTargetTeam.split(":")[1]
                              : ""
                          }
                          disabled={!isCurrentSeason}
                          onValueChange={(teamId) => {
                            setSelectedTargetTeam(`${member.id}:${teamId}`);
                            handleAssignMember(teamId, member.id);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                isCurrentSeason
                                  ? "Zuordnung auswählen"
                                  : "Nur in aktueller Saison bearbeitbar"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedState?.teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            {selectedState && (
              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <span>{selectedState.availableMembers.length} freie Mitglieder</span>
                <span>
                  {selectedState.teams.reduce((acc, team) => acc + team.members.length, 0)} zugeordnete Spieler:innen
                </span>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={isTeamDialogOpen}
        onOpenChange={(open) => {
          setIsTeamDialogOpen(open);
          if (!open) {
            resetTeamDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeamId ? "Mannschaft bearbeiten" : "Neue Mannschaft anlegen"}</DialogTitle>
            <DialogDescription>
              Hinterlegen Sie Spielklasse, Trainingszeiten und den Heimspieltermin für diese Saison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Mannschaftsname</Label>
              <Input
                id="team-name"
                value={teamForm.name}
                onChange={(event) => updateTeamForm("name", event.target.value)}
                placeholder="z. B. Herren I"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-league">Spielklasse</Label>
              <Input
                id="team-league"
                value={teamForm.league}
                onChange={(event) => updateTeamForm("league", event.target.value)}
                placeholder="z. B. Verbandsliga Süd"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-division">Staffel / Gruppe (optional)</Label>
              <Input
                id="team-division"
                value={teamForm.division}
                onChange={(event) => updateTeamForm("division", event.target.value)}
                placeholder="z. B. Staffel A"
              />
            </div>
            <div className="grid gap-2">
              <Label>Trainingstag 1</Label>
              <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
                <Select
                  value={teamForm.trainingDay1}
                  onValueChange={(value) => updateTeamForm("trainingDay1", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wochentag wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={`training-day1-${day}`} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={teamForm.trainingTime1}
                  onChange={(event) => updateTeamForm("trainingTime1", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Trainingstag 2 (optional)</Label>
              <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
                <Select
                  value={teamForm.trainingDay2 || "none"}
                  onValueChange={(value) => {
                    const newValue = value === "none" ? "" : value;
                    updateTeamForm("trainingDay2", newValue);
                    if (value === "none") {
                      updateTeamForm("trainingTime2", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optionaler Wochentag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein zweiter Termin</SelectItem>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={`training-day2-${day}`} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={teamForm.trainingTime2}
                  onChange={(event) => updateTeamForm("trainingTime2", event.target.value)}
                  disabled={!teamForm.trainingDay2}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Heimspieltermin (optional)</Label>
              <div className="grid gap-2 sm:grid-cols-[2fr,1fr]">
                <Select
                  value={teamForm.homeMatchDay || "none"}
                  onValueChange={(value) => {
                    const newValue = value === "none" ? "" : value;
                    updateTeamForm("homeMatchDay", newValue);
                    if (value === "none") {
                      updateTeamForm("homeMatchTime", "");
                      updateTeamForm("homeMatchLocation", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wochentag auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Kein Heimspieltermin</SelectItem>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={`home-match-${day}`} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="time"
                  value={teamForm.homeMatchTime}
                  onChange={(event) => updateTeamForm("homeMatchTime", event.target.value)}
                  disabled={!teamForm.homeMatchDay}
                />
              </div>
              <Input
                value={teamForm.homeMatchLocation}
                onChange={(event) => updateTeamForm("homeMatchLocation", event.target.value)}
                placeholder="Spielort, z. B. Sporthalle Musterstadt"
                disabled={!teamForm.homeMatchDay}
              />
            </div>
          </div>
          <DialogFooterPrimitive className="sm:justify-start">
            <Button onClick={handleSaveTeam} className="bg-gradient-primary hover:bg-primary-hover">
              {editingTeamId ? "Änderungen speichern" : "Mannschaft speichern"}
            </Button>
          </DialogFooterPrimitive>
        </DialogContent>
      </Dialog>
    </div>
  );
};
