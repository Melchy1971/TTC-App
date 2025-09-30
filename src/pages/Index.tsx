import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/components/Dashboard";
import { AuthPage } from "@/components/AuthPage";
import { MatchSchedule } from "@/components/MatchSchedule";
import { AdminPanel } from "@/components/AdminPanel";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Settings } from "@/components/Settings";
import { Communication } from "@/components/Communication";

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
      case "matches":
        return <MatchSchedule />;
      case "admin":
        return <AdminPanel />;
      case "communication":
        return <Communication />;
      case "settings":
        return user ? <Settings user={user} /> : null;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-red-950">
      <div className="flex min-h-screen">
        <div className="w-64">
          <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
        </div>
        <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-lg">
          <div className="flex justify-between items-center p-6 border-b border-red-100 bg-white/90 backdrop-blur-sm">
            <h1 className="text-2xl font-semibold text-neutral-900">TTC Vereinsverwaltung</h1>
            <Button
              variant="outline"
              className="border-red-500 text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Abmelden
            </Button>
          </div>
          <div className="p-8 flex-1 overflow-y-auto">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;