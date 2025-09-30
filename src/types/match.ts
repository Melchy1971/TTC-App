export type MatchSource = "supabase" | "ics";

export interface Match {
  id: string;
  team: string;
  opponent: string;
  date: string;
  time: string;
  location: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  created_at: string;
  description?: string | null;
  source?: MatchSource;
  icsUid?: string;
}
