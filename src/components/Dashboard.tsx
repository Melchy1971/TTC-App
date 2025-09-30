import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Trophy, TrendingUp, Upload } from "lucide-react";

export const Dashboard = () => {
  const stats = [
    { 
      title: "Aktive Mannschaften", 
      value: "6", 
      description: "Herren, Damen & Jugend",
      icon: Users,
      color: "bg-gradient-primary"
    },
    { 
      title: "Nächste Spiele", 
      value: "12", 
      description: "Diese Woche",
      icon: Calendar,
      color: "bg-gradient-secondary"
    },
    { 
      title: "Siege diese Saison", 
      value: "24", 
      description: "+15% zur Vorsaison",
      icon: Trophy,
      color: "bg-gradient-primary"
    },
    { 
      title: "Vereinsranking", 
      value: "#3", 
      description: "Bezirksliga",
      icon: TrendingUp,
      color: "bg-gradient-secondary"
    }
  ];

  const upcomingMatches = [
    { team: "Herren I", opponent: "TTC Musterstadt", date: "Sa, 30.11", time: "15:00" },
    { team: "Damen I", opponent: "SV Beispiel", date: "So, 01.12", time: "10:00" },
    { team: "Herren II", opponent: "TSV Nordstadt", date: "So, 01.12", time: "14:30" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Willkommen zurück! Hier ist eine Übersicht über Ihren Verein.</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-hover shadow-sport">
          <Upload className="w-4 h-4 mr-2" />
          ICS Import
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-sport transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`w-8 h-8 rounded-md ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Kommende Spiele
            </CardTitle>
            <CardDescription>Die nächsten Begegnungen dieser Woche</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMatches.map((match, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">{match.team}</div>
                    <div className="text-sm text-muted-foreground">vs {match.opponent}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{match.date}</div>
                    <div className="text-sm text-muted-foreground">{match.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Letzte Ergebnisse
            </CardTitle>
            <CardDescription>Aktuelle Spielergebnisse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div>
                  <div className="font-medium">Herren I</div>
                  <div className="text-sm text-muted-foreground">vs TTC Altstadt</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">9:2</div>
                  <div className="text-sm text-muted-foreground">Sieg</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <div>
                  <div className="font-medium">Damen I</div>
                  <div className="text-sm text-muted-foreground">vs SC Westend</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">4:8</div>
                  <div className="text-sm text-muted-foreground">Niederlage</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};