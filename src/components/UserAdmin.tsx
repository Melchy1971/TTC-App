import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Search, Mail, Phone, Shield, Crown, User, MoreVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type UserProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  user_roles: { role: string }[];
};

export const UserAdmin = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        user_roles: (rolesData || []).filter(role => role.user_id === profile.user_id)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Fehler",
        description: "Benutzer konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return Crown;
      case "captain": return Shield;
      case "trainer": return User;
      default: return User;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-gradient-primary text-primary-foreground",
      moderator: "bg-gradient-secondary text-secondary-foreground", 
      substitute: "bg-yellow-500 text-white",
      player: "bg-muted text-muted-foreground"
    };
    return colors[role as keyof typeof colors] || colors.player;
  };

  const getStatusBadge = (status: string) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800";
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email || 'Unbekannter Benutzer';
  };

  const getUserRole = (user: UserProfile) => {
    return user.user_roles[0]?.role || 'player';
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // First, delete existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) throw deleteError;

      // Then insert the new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole as any }]);
      
      if (insertError) throw insertError;

      toast({
        title: "Erfolg",
        description: "Rolle wurde aktualisiert.",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Fehler",
        description: "Rolle konnte nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const displayName = getUserDisplayName(user);
    const userRole = getUserRole(user);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || userRole === roleFilter;
    return matchesSearch && matchesRole;
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
          <h1 className="text-3xl font-bold text-foreground">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie Vereinsmitglieder und deren Berechtigungen</p>
        </div>
        <Button className="bg-gradient-primary hover:bg-primary-hover shadow-sport">
          <UserPlus className="w-4 h-4 mr-2" />
          Neues Mitglied
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Mitglied suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Rolle filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rollen</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="player">Spieler</SelectItem>
            <SelectItem value="substitute">Ersatzspieler</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mitglieder ({filteredUsers.length})</CardTitle>
          <CardDescription>Übersicht aller Vereinsmitglieder</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => {
              const displayName = getUserDisplayName(user);
              const userRole = getUserRole(user);
              const RoleIcon = getRoleIcon(userRole);
              
              return (
                <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{displayName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{displayName}</h3>
                        <Badge className={getRoleBadge(userRole)}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {userRole === "admin" ? "Admin" : 
                           userRole === "moderator" ? "Moderator" :
                           userRole === "substitute" ? "Ersatzspieler" : "Spieler"}
                        </Badge>
                        <Badge className={getStatusBadge(user.status)} variant="outline">
                          {user.status === "active" ? "Aktiv" : 
                           user.status === "pending" ? "Ausstehend" : "Inaktiv"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {user.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {user.email}
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Mitglied seit {new Date(user.created_at).toLocaleDateString('de-DE')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Rolle ändern
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rolle zuweisen</DialogTitle>
                          <DialogDescription>
                            Rolle für {displayName} ändern
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Neue Rolle</Label>
                            <Select 
                              defaultValue={userRole}
                              onValueChange={(value) => handleRoleChange(user.user_id, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrator</SelectItem>
                                <SelectItem value="moderator">Moderator (Mannschaftsführer)</SelectItem>
                                <SelectItem value="player">Spieler</SelectItem>
                                <SelectItem value="substitute">Ersatzspieler</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Gesamt Mitglieder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registrierte Benutzer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Aktive Spieler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Verfügbare Mitglieder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ausstehende Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Benötigen Bestätigung</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};