import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Search, Plus, Edit, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Match = {
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
};

export const MatchSchedule = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserRole();
    fetchMatches();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('date', { ascending: true }) as { data: Match[] | null; error: any };
      
      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Fehler",
        description: "Spiele konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async (matchId: string, homeScore: number, awayScore: number) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({ 
          home_score: homeScore, 
          away_score: awayScore,
          status: 'completed'
        } as any)
        .eq('id', matchId);
      
      if (error) throw error;
      
      toast({
        title: "Erfolg",
        description: "Ergebnis wurde gespeichert.",
      });
      
      fetchMatches();
      setEditingMatch(null);
    } catch (error) {
      console.error('Error saving result:', error);
      toast({
        title: "Fehler",
        description: "Ergebnis konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const canEdit = userRole === 'admin' || userRole === 'moderator';

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.team.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.opponent.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Spielplan</h1>
          <p className="text-muted-foreground">Verwalten Sie alle Spiele und Ergebnisse</p>
        </div>
        {canEdit && (
          <Button className="bg-gradient-primary hover:bg-primary-hover shadow-sport">
            <Plus className="w-4 h-4 mr-2" />
            Spiel hinzufügen
          </Button>
        )}
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Spiel suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Spiele ({filteredMatches.length})</CardTitle>
          <CardDescription>Übersicht aller Spiele</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div key={match.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(match.date).toLocaleDateString('de-DE')} um {match.time}
                    </span>
                    <Badge variant={match.status === 'completed' ? 'default' : 'outline'}>
                      {match.status === 'completed' ? 'Abgeschlossen' : 'Ausstehend'}
                    </Badge>
                  </div>
                  <div className="font-semibold text-lg">
                    {match.team} vs {match.opponent}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {match.location}
                  </div>
                  {match.home_score !== null && match.away_score !== null && (
                    <div className="mt-2 font-bold text-lg">
                      Ergebnis: {match.home_score}:{match.away_score}
                    </div>
                  )}
                </div>

                {canEdit && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setEditingMatch(match)}>
                        {match.home_score !== null ? <Edit className="w-4 h-4 mr-2" /> : <Trophy className="w-4 h-4 mr-2" />}
                        {match.home_score !== null ? 'Bearbeiten' : 'Ergebnis eintragen'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ergebnis eintragen</DialogTitle>
                        <DialogDescription>
                          {match.team} vs {match.opponent}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="homeScore">{match.team}</Label>
                            <Input
                              id="homeScore"
                              type="number"
                              defaultValue={match.home_score || 0}
                              min="0"
                            />
                          </div>
                          <div>
                            <Label htmlFor="awayScore">{match.opponent}</Label>
                            <Input
                              id="awayScore"
                              type="number"
                              defaultValue={match.away_score || 0}
                              min="0"
                            />
                          </div>
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => {
                            const homeScore = parseInt((document.getElementById('homeScore') as HTMLInputElement).value);
                            const awayScore = parseInt((document.getElementById('awayScore') as HTMLInputElement).value);
                            handleSaveResult(match.id, homeScore, awayScore);
                          }}
                        >
                          Speichern
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
