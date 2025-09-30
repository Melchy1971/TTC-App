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
    <Card className="h-full bg-card border-r shadow-sport">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">TT Verein</h1>
            <p className="text-sm text-muted-foreground">Manager</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className={`w-full justify-start gap-3 h-12 ${
                  currentPage === item.id 
                    ? "bg-gradient-primary text-primary-foreground shadow-sport" 
                    : "hover:bg-muted"
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