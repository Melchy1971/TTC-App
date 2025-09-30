export type TeamMember = {
  id: string;
  name: string;
  email: string;
  rating: number;
  playStyle?: string;
  availability?: string;
  isCaptain?: boolean;
};

export type BaseTeamMember = Omit<TeamMember, "isCaptain">;

export type TrainingSlot = {
  day: string;
  time: string;
};

export type HomeMatchInfo = {
  day: string;
  time: string;
  location: string;
};

export type Team = {
  id: string;
  name: string;
  league: string;
  division?: string;
  trainingSlots: TrainingSlot[];
  homeMatch?: HomeMatchInfo;
  members: TeamMember[];
};

export type Season = {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  isCurrent?: boolean;
};

export type SeasonState = {
  teams: Team[];
  availableMembers: TeamMember[];
};

export type SeasonDefinition = {
  teams: Team[];
  assignments: Record<string, string[]>;
  captains: Record<string, string>;
};
