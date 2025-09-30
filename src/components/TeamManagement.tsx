import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogFooterPrimitive, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Crown, Flag, Layers, Plus, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  name: string;
  email: string;
  rating: number;
  playStyle?: string;
  availability?: string;
  isCaptain?: boolean;
};

type Team = {
  id: string;
  name: string;
  league: string;
  division: string;
  trainingDay: string;
  homeMatch?: string;
  members: Member[];
};

type Season = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isCurrent?: boolean;
};

type SeasonState = {
  teams: Team[];
  availableMembers: Member[];
};

type SeasonDefinition = {
  teams: Team[];
  assignments: Record<string, string[]>;
  captains: Record<string, string>;
};

const clubMembers: Omit<Member, "isCaptain">[] = [
  { id: "m1", name: "Max Mustermann", email: "max@ttc-example.de", rating: 1850, playStyle: "Offensiv" },
  { id: "m2", name: "Laura Schneider", email: "laura@ttc-example.de", rating: 1725, playStyle: "Variabel" },
  { id: "m3", name: "Felix Hartmann", email: "felix@ttc-example.de", rating: 1680, playStyle: "Block" },
  { id: "m4", name: "Anna Krüger", email: "anna@ttc-example.de", rating: 1610, playStyle: "Allround" },
  { id: "m5", name: "Jonas Richter", email: "jonas@ttc-example.de", rating: 1585, playStyle: "Topspin" },
  { id: "m6", name: "Miriam Vogel", email: "miriam@ttc-example.de", rating: 1520, playStyle: "Schnitt" },
  { id: "m7", name: "David Seidel", email: "david@ttc-example.de", rating: 1490, playStyle: "Allround" },
  { id: "m8", name: "Nina Albrecht", email: "nina@ttc-example.de", rating: 1455, playStyle: "Block" },
  { id: "m9", name: "Tim Berger", email: "tim@ttc-example.de", rating: 1410, playStyle: "Variabel" },
  { id: "m10", name: "Sophie Lehmann", email: "sophie@ttc-example.de", rating: 1380, playStyle: "Offensiv" },
  { id: "m11", name: "Leon Hofmann", email: "leon@ttc-example.de", rating: 1355, playStyle: "Topspin" },
  { id: "m12", name: "Clara Weiß", email: "clara@ttc-example.de", rating: 1320, playStyle: "Allround" }
];

const seasonTemplates: Record<string, SeasonDefinition> = {
  "2025-26": {
    teams: [
      {
        id: "team-1",
        name: "Herren I",
        league: "Verbandsliga Süd",
        division: "Staffel A",
        trainingDay: "Dienstag 19:30",
        homeMatch: "Samstag 18:00",
        members: []
      },
      {
        id: "team-2",
        name: "Herren II",
        league: "Bezirksliga",
        division: "Staffel B",
        trainingDay: "Donnerstag 20:00",
        homeMatch: "Freitag 19:30",
        members: []
      },
      {
        id: "team-3",
        name: "Damen I",
        league: "Bezirksoberliga",
        division: "Staffel Süd",
        trainingDay: "Mittwoch 19:00",
        homeMatch: "Sonntag 11:00",
        members: []
      }
    ],
    assignments: {
      "team-1": ["m1", "m2", "m3", "m5"],
      "team-2": ["m4", "m7", "m8", "m9"],
      "team-3": ["m6", "m10", "m11"]
    },
    captains: {
      "team-1": "m1",
      "team-2": "m4",
      "team-3": "m6"
    }
  },
  "2024-25": {
    teams: [
      {
        id: "team-1",
        name: "Herren I",
        league: "Verbandsliga Süd",
        division: "Staffel A",
        trainingDay: "Dienstag 19:30",
        homeMatch: "Samstag 18:00",
        members: []
      },
      {
        id: "team-2",
        name: "Herren II",
        league: "Bezirksliga",
        division: "Staffel B",
        trainingDay: "Donnerstag 19:30",
        homeMatch: "Freitag 19:00",
        members: []
      }
    ],
    assignments: {
      "team-1": ["m1", "m2", "m3", "m4"],
      "team-2": ["m5", "m7", "m8", "m9", "m12"]
    },
    captains: {
      "team-1": "m2",
      "team-2": "m5"
    }
  }
};

const initialSeasons: Season[] = [
  { id: "2025-26", label: "Saison 2025/26", startYear: 2025, endYear: 2026, isCurrent: true },
  { id: "2024-25", label: "Saison 2024/25", startYear: 2024, endYear: 2025 }
];

const createSeasonState = (definition: SeasonDefinition): SeasonState => {
  const teams = definition.teams.map((team) => {
    const assignedIds = definition.assignments[team.id] || [];
    const members = assignedIds
      .map((memberId) => {
        const baseMember = clubMembers.find((member) => member.id === memberId);
        if (!baseMember) return undefined;
        return {
          ...baseMember,
          isCaptain: definition.captains[team.id] === memberId
        } satisfies Member;
      })
      .filter(Boolean) as Member[];

    return {
      ...team,
      members
    };
  });

  const assignedMembers = new Set(
    Object.values(definition.assignments).flat()
  );

  const availableMembers = clubMembers
    .filter((member) => !assignedMembers.has(member.id))
    .map((member) => ({ ...member }));

  return {
    teams,
    availableMembers
  };
};

const initialSeasonStates = Object.fromEntries(
  Object.entries(seasonTemplates).map(([seasonId, definition]) => [
    seasonId,
    createSeasonState(definition)
  ])
) as Record<string, SeasonState>;

export const TeamManagement = () => {
  const { toast } = useToast();
  const [seasonStates, setSeasonStates] = useState<Record<string, SeasonState>>(initialSeasonStates);
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

  const selectedSeason = seasonList.find((season) => season.id === selectedSeasonId);
  const selectedState = seasonStates[selectedSeasonId];

  const filteredAvailableMembers = useMemo(() => {
    if (!selectedState) return [];
    if (!availableSearch) return selectedState.availableMembers;
    return selectedState.availableMembers.filter((member) =>
      `${member.name} ${member.email}`
        .toLowerCase()
        .includes(availableSearch.toLowerCase())
    );
  }, [availableSearch, selectedState]);

  const handleAssignMember = (teamId: string, memberId: string) => {
    if (!selectedState) return;

    setSeasonStates((prev) => {
      const season = prev[selectedSeasonId];
      if (!season) return prev;

      const memberToAssign = season.availableMembers.find((member) => member.id === memberId);
      if (!memberToAssign) return prev;

      const updatedTeams = season.teams.map((team) => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          members: [...team.members, { ...memberToAssign, isCaptain: false }]
        };
      });

      const updatedAvailable = season.availableMembers.filter((member) => member.id !== memberId);

      toast({
        title: "Mitglied zugeordnet",
        description: `${memberToAssign.name} wurde ${season.teams.find((team) => team.id === teamId)?.name ?? "der Mannschaft"} hinzugefügt.`
      });

      return {
        ...prev,
        [selectedSeasonId]: {
          teams: updatedTeams,
          availableMembers: updatedAvailable
        }
      };
    });
  };

  const handleRemoveMember = (teamId: string, memberId: string) => {
    if (!selectedState) return;

    setSeasonStates((prev) => {
      const season = prev[selectedSeasonId];
      if (!season) return prev;

      const updatedTeams = season.teams.map((team) => {
        if (team.id !== teamId) return team;

        const memberToRemove = team.members.find((member) => member.id === memberId);
        if (!memberToRemove) return team;

        return {
          ...team,
          members: team.members.filter((member) => member.id !== memberId)
        };
      });

      const removedMember = season.teams
        .find((team) => team.id === teamId)
        ?.members.find((member) => member.id === memberId);

      return {
        ...prev,
        [selectedSeasonId]: {
          teams: updatedTeams,
          availableMembers: removedMember
            ? [...season.availableMembers, { ...removedMember, isCaptain: false }]
            : season.availableMembers
        }
      };
    });

    const removedMember = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    if (removedMember) {
      toast({
        title: "Mitglied entfernt",
        description: `${removedMember.name} wurde aus der Mannschaft entfernt.`
      });
    }
  };

  const handleSetCaptain = (teamId: string, memberId: string) => {
    if (!selectedState) return;

    setSeasonStates((prev) => {
      const season = prev[selectedSeasonId];
      if (!season) return prev;

      const updatedTeams = season.teams.map((team) => {
        if (team.id !== teamId) return team;
        return {
          ...team,
          members: team.members.map((member) => ({
            ...member,
            isCaptain: member.id === memberId
          }))
        };
      });

      return {
        ...prev,
        [selectedSeasonId]: {
          ...season,
          teams: updatedTeams
        }
      };
    });

    const newCaptain = selectedState.teams
      .find((team) => team.id === teamId)
      ?.members.find((member) => member.id === memberId);

    if (newCaptain) {
      toast({
        title: "Mannschaftsführer gesetzt",
        description: `${newCaptain.name} ist jetzt Mannschaftsführer${newCaptain.name.endsWith("a") ? "in" : ""}.`
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
          {selectedState?.teams.map((team) => (
            <Card key={team.id} className="shadow-sm border-border/60">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {team.name}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" /> {team.league}
                      </Badge>
                      <Badge variant="outline">{team.division}</Badge>
                      <Badge variant="outline">Training: {team.trainingDay}</Badge>
                      {team.homeMatch && (
                        <Badge variant="outline">Heimspiel: {team.homeMatch}</Badge>
                      )}
                    </CardDescription>
                  </div>
                  <Badge className="bg-secondary/10 text-secondary-foreground">
                    {team.members.length} Spieler:innen
                  </Badge>
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
                              "flex items-center gap-2"
                            )}
                            onClick={() => handleSetCaptain(team.id, member.id)}
                          >
                            <Crown className="h-4 w-4" />
                            {member.isCaptain ? "Captain" : "Als Captain setzen"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
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
                    disabled={selectedState.availableMembers.length === 0}
                    onValueChange={(value) => handleAssignMember(team.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        selectedState.availableMembers.length === 0
                          ? "Keine freien Mitglieder"
                          : "Mitglied auswählen"
                      } />
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
          ))}
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
                          value={selectedTargetTeam && selectedTargetTeam.startsWith(member.id) ? selectedTargetTeam.split(":")[1] : ""}
                          onValueChange={(teamId) => {
                            setSelectedTargetTeam(`${member.id}:${teamId}`);
                            handleAssignMember(teamId, member.id);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Zuordnung auswählen" />
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
    </div>
  );
};
