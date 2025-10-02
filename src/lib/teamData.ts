import type { BaseTeamMember, Season, SeasonDefinition, SeasonState, TeamMember } from "@/types/team";

// Beispiel-Struktur für Club-Mitglieder
// { id: "m1", name: "Max Mustermann", email: "max@ttc-example.de", rating: 1850, playStyle: "Offensiv" }
export const clubMembers: BaseTeamMember[] = [];

// Beispiel-Struktur für Season Templates mit leeren Zuordnungen
export const seasonTemplates: Record<string, SeasonDefinition> = {
  "2025-26": {
    teams: [],
    assignments: {},
    captains: {}
  },
  "2024-25": {
    teams: [],
    assignments: {},
    captains: {}
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
