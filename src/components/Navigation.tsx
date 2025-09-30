import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, Calendar, Settings, Trophy, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation = ({ currentPage, onPageChange }: NavigationProps) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data && data.role === 'admin') {
        setIsAdmin(true);
      }
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: Home, requiresAdmin: false },
    { id: "matches", label: "Spielplan", icon: Calendar, requiresAdmin: false },
    { id: "admin", label: "Admin-Bereich", icon: Shield, requiresAdmin: true },
    { id: "settings", label: "Einstellungen", icon: Settings, requiresAdmin: false },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.requiresAdmin || isAdmin);

  return (
    <Card className="h-full bg-gradient-to-b from-neutral-950 via-neutral-900 to-red-950 border-r border-red-900 shadow-sport text-white">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-accent">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TT Verein</h1>
            <p className="text-sm text-white/70">Manager</p>
          </div>
        </div>

        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`w-full justify-start gap-3 h-12 transition-colors ${
                  isActive
                    ? "bg-gradient-primary text-white shadow-sport"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </Card>
  );
};