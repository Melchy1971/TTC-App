import type { BaseTeamMember, Season, SeasonDefinition, SeasonState, TeamMember } from "@/types/team";

export const clubMembers: BaseTeamMember[] = [
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

export const seasonTemplates: Record<string, SeasonDefinition> = {
  "2025-26": {
    teams: [
      {
        id: "team-1",
        name: "Herren I",
        league: "Verbandsliga Süd",
        division: "Staffel A",
        trainingSlots: [
          { day: "Dienstag", time: "19:30" },
          { day: "Donnerstag", time: "19:00" }
        ],
        homeMatch: { day: "Samstag", time: "18:00", location: "Heimhalle Süd" },
        members: []
      },
      {
        id: "team-2",
        name: "Herren II",
        league: "Bezirksliga",
        division: "Staffel B",
        trainingSlots: [
          { day: "Montag", time: "20:00" },
          { day: "Donnerstag", time: "20:00" }
        ],
        homeMatch: { day: "Freitag", time: "19:30", location: "Sportzentrum Mitte" },
        members: []
      },
      {
        id: "team-3",
        name: "Damen I",
        league: "Bezirksoberliga",
        division: "Staffel Süd",
        trainingSlots: [
          { day: "Mittwoch", time: "19:00" },
          { day: "Freitag", time: "18:30" }
        ],
        homeMatch: { day: "Sonntag", time: "11:00", location: "TTC Arena" },
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
        trainingSlots: [
          { day: "Dienstag", time: "19:30" },
          { day: "Donnerstag", time: "19:00" }
        ],
        homeMatch: { day: "Samstag", time: "18:00", location: "Heimhalle Süd" },
        members: []
      },
      {
        id: "team-2",
        name: "Herren II",
        league: "Bezirksliga",
        division: "Staffel B",
        trainingSlots: [
          { day: "Montag", time: "20:00" },
          { day: "Donnerstag", time: "20:00" }
        ],
        homeMatch: { day: "Freitag", time: "19:00", location: "Sportzentrum Mitte" },
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

export const initialSeasons: Season[] = [
  { id: "2025-26", label: "Saison 2025/26", startYear: 2025, endYear: 2026, isCurrent: true },
  { id: "2024-25", label: "Saison 2024/25", startYear: 2024, endYear: 2025 }
];

export const createSeasonState = (definition: SeasonDefinition): SeasonState => {
  const teams = definition.teams.map((team) => {
    const assignedIds = definition.assignments[team.id] || [];
    const members = assignedIds
      .map((memberId) => {
        const baseMember = clubMembers.find((member) => member.id === memberId);
        if (!baseMember) return undefined;
        return {
          ...baseMember,
          isCaptain: definition.captains[team.id] === memberId
        } satisfies TeamMember;
      })
      .filter(Boolean) as TeamMember[];

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

export const createInitialSeasonStates = (): Record<string, SeasonState> =>
  Object.fromEntries(
    Object.entries(seasonTemplates).map(([seasonId, definition]) => [
      seasonId,
      createSeasonState(definition)
    ])
  ) as Record<string, SeasonState>;

export const initialSeasonStates = createInitialSeasonStates();
