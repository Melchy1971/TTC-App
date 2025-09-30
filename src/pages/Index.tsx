import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { Teams } from "@/components/Teams";
import { IcsImport } from "@/components/IcsImport";
import { UserAdmin } from "@/components/UserAdmin";
import { TrainingPlanner } from "@/components/TrainingPlanner";
import { SubstituteRequests } from "@/components/SubstituteRequests";
import { AuthPage } from "@/components/AuthPage";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "teams":
        return <Teams />;
      case "training":
        return <TrainingPlanner />;
      case "substitutes":
        return <SubstituteRequests />;
      case "import":
        return <IcsImport />;
      case "userAdmin":
        return <UserAdmin />;
      case "matches":
        return <div className="p-8"><h1 className="text-3xl font-bold">Spielplan - Coming Soon</h1></div>;
      case "tournaments":
        return <div className="p-8"><h1 className="text-3xl font-bold">Turniere - Coming Soon</h1></div>;
      case "settings":
        return <div className="p-8"><h1 className="text-3xl font-bold">Einstellungen - Coming Soon</h1></div>;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="w-64 h-screen">
          <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center p-4 border-b">
            <h1 className="text-xl font-semibold">TTC Vereinsverwaltung</h1>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
          <div className="p-8">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;