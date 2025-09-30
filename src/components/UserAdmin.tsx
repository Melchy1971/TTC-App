import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Search, Mail, Phone, Shield, Crown, User, UsersRound } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type UserProfile = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  member_number: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  birthday: string | null;
  photo_url: string | null;
  status: string | null;
  created_at: string;
  user_roles: { role: string }[];
};

type ProfileFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mobile: string;
  member_number: string;
  street: string;
  postal_code: string;
  city: string;
  birthday: string;
  status: string;
};

type DialogMode = "create" | "edit";

type AppRole = Database["public"]["Enums"]["app_role"];
type NormalizedRole = "player" | "captain" | "vorstand" | "admin";

export const UserAdmin = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("edit");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<NormalizedRole[]>(["player"]);
  const [formState, setFormState] = useState<ProfileFormState>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mobile: "",
    member_number: "",
    street: "",
    postal_code: "",
    city: "",
    birthday: "",
    status: "pending"
  });
  const [isSaving, setIsSaving] = useState(false);
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

  const roleOptions = useMemo(() => ([
    {
      value: "player" as NormalizedRole,
      label: "Mitglied",
      description: "Basisrolle für alle registrierten Mitglieder",
      icon: User
    },
    {
      value: "captain" as NormalizedRole,
      label: "Mannschaftsführer",
      description: "Verwalten Mannschaften und Spieltermine",
      icon: Shield
    },
    {
      value: "vorstand" as NormalizedRole,
      label: "Vorstand",
      description: "Leitet den Verein und gibt neue Mitglieder frei",
      icon: UsersRound
    },
    {
      value: "admin" as NormalizedRole,
      label: "Administrator",
      description: "Hat Zugriff auf alle Verwaltungsfunktionen",
      icon: Crown
    }
  ]), []);

  const statusOptions = useMemo(() => ([
    { value: "pending", label: "Ausstehend" },
    { value: "active", label: "Aktiv" },
    { value: "inactive", label: "Inaktiv" }
  ]), []);

  const normalizeRole = (role?: AppRole | null): NormalizedRole => {
    if (!role) return "player";
    if (role === "moderator") return "captain";
    return role as NormalizedRole;
  };

  const denormalizeRole = (role: NormalizedRole): AppRole => {
    if (role === "captain") return "moderator";
    return role as AppRole;
  };

  const getRoleIcon = (role: NormalizedRole) => {
    switch (role) {
      case "admin":
        return Crown;
      case "vorstand":
        return UsersRound;
      case "captain":
        return Shield;
      default:
        return User;
    }
  };

  const getRoleBadge = (role: NormalizedRole) => {
    const colors = {
      admin: "bg-gradient-primary text-primary-foreground",
      vorstand: "bg-gradient-to-r from-amber-500 to-amber-600 text-white",
      captain: "bg-gradient-secondary text-secondary-foreground",
      player: "bg-muted text-muted-foreground"
    };
    return colors[role as keyof typeof colors] || colors.player;
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") {
      return "bg-green-100 text-green-800";
    }
    if (status === "inactive") {
      return "bg-slate-100 text-slate-700";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  const getStatusLabel = (status: string) => {
    if (status === "active") return "Aktiv";
    if (status === "inactive") return "Inaktiv";
    return "Ausstehend";
  };

  const getRoleLabel = (role: NormalizedRole) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      vorstand: "Vorstand",
      captain: "Mannschaftsführer",
      player: "Mitglied"
    };
    return labels[role] || "Mitglied";
  };

  const getUserDisplayName = (user: UserProfile) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email || 'Unbekannter Benutzer';
  };

  const getUserRoles = (user: UserProfile): NormalizedRole[] => {
    const normalized = (user.user_roles || []).map(role => normalizeRole(role.role));
    if (!normalized.includes("player")) {
      normalized.push("player");
    }
    return Array.from(new Set(normalized));
  };

  const persistRoles = async (userId: string, roles: NormalizedRole[]) => {
    const normalizedRoles = roles.length > 0 ? roles : ["player"];
    const finalRoles = Array.from(new Set([...normalizedRoles, "player"]));

    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert(finalRoles.map(role => ({ user_id: userId, role: denormalizeRole(role) })));

    if (insertError) throw insertError;
  };

  const pendingUsers = useMemo(
    () => users.filter(user => (user.status || "pending") === "pending"),
    [users]
  );

  const resetDialogState = () => {
    setSelectedUser(null);
    setSelectedRoles(["player"]);
    setFormState({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      mobile: "",
      member_number: "",
      street: "",
      postal_code: "",
      city: "",
      birthday: "",
      status: "pending"
    });
    setIsSaving(false);
  };

  const prepareDialogForUser = (user: UserProfile | null, mode: DialogMode) => {
    setDialogMode(mode);
    if (user) {
      setSelectedUser(user);
      setSelectedRoles(getUserRoles(user));
      setFormState({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        mobile: user.mobile || "",
        member_number: user.member_number || "",
        street: user.street || "",
        postal_code: user.postal_code || "",
        city: user.city || "",
        birthday: user.birthday ? user.birthday.split("T")[0] : "",
        status: user.status || "pending"
      });
    } else {
      resetDialogState();
    }
    setIsDialogOpen(true);
  };

  const handleRoleToggle = (role: NormalizedRole, checked: boolean) => {
    setSelectedRoles(prev => {
      if (role === "player") {
        return prev;
      }
      if (checked) {
        return Array.from(new Set([...prev, role]));
      }
      return prev.filter(r => r !== role);
    });
  };

  const handleFormChange = (field: keyof ProfileFormState) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState(prev => ({ ...prev, [field]: event.target.value }));
  };

  const handleStatusChange = (value: string) => {
    setFormState(prev => ({ ...prev, status: value }));
  };

  const handleSelectPendingUser = (userId: string) => {
    const user = users.find(u => u.id === userId) || null;
    if (user) {
      prepareDialogForUser(user, "create");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetDialogState();
    }
  };

  const handleProfileSubmit = async () => {
    if (!selectedUser) {
      toast({
        title: "Kein Mitglied ausgewählt",
        description: "Bitte wählen Sie ein Mitglied aus, das bearbeitet werden soll.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formState.first_name || null,
          last_name: formState.last_name || null,
          email: formState.email || null,
          phone: formState.phone || null,
          mobile: formState.mobile || null,
          member_number: formState.member_number || null,
          street: formState.street || null,
          postal_code: formState.postal_code || null,
          city: formState.city || null,
          birthday: formState.birthday || null,
          status: formState.status
        })
        .eq('id', selectedUser.id);

      if (updateError) throw updateError;

      await persistRoles(selectedUser.user_id, selectedRoles);

      toast({
        title: dialogMode === "create" ? "Mitglied freigegeben" : "Profil aktualisiert",
        description:
          dialogMode === "create"
            ? "Das Mitglied wurde erfolgreich freigegeben und aktualisiert."
            : "Die Profilinformationen wurden gespeichert.",
      });

      handleDialogClose(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Fehler",
        description: "Das Profil konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const displayName = getUserDisplayName(user);
    const userRoles = getUserRoles(user);
    const matchesSearch = displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === "all" || userRoles.includes(roleFilter);
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
        <Button
          className="bg-gradient-primary hover:bg-primary-hover shadow-sport"
          onClick={() => prepareDialogForUser(pendingUsers[0] ?? null, "create")}
        >
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
            <SelectItem value="vorstand">Vorstand</SelectItem>
            <SelectItem value="captain">Mannschaftsführer</SelectItem>
            <SelectItem value="player">Mitglied</SelectItem>
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
              const userRoles = getUserRoles(user);
              const userStatus = user.status || "pending";
              const initials = displayName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "MB";

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-accent transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  role="button"
                  tabIndex={0}
                  onClick={() => prepareDialogForUser(user, "edit")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      prepareDialogForUser(user, "edit");
                    }
                  }}
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold mr-2">{displayName}</h3>
                        {userRoles.map((role) => {
                          const RoleIcon = getRoleIcon(role);
                          return (
                            <Badge key={`${user.id}-${role}`} className={getRoleBadge(role)}>
                              <RoleIcon className="w-3 h-3 mr-1" />
                              {getRoleLabel(role)}
                            </Badge>
                          );
                        })}
                        <Badge className={getStatusBadge(userStatus)} variant="outline">
                          {getStatusLabel(userStatus)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        prepareDialogForUser(user, "edit");
                      }}
                    >
                      Profil bearbeiten
                    </Button>
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
            <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Verfügbare Mitglieder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ausstehende Anfragen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => (u.status || 'pending') === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Benötigen Bestätigung</p>
          </CardContent>
        </Card>


      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Neues Mitglied freigeben" : "Mitgliedsprofil bearbeiten"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "create"
                ? "Weisen Sie einem neu registrierten Mitglied die richtigen Rollen zu und schalten Sie es frei."
                : "Aktualisieren Sie die Profildaten und Rollen des Mitglieds."}
            </DialogDescription>
          </DialogHeader>

          {dialogMode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="pending-member">Registrierte Mitglieder</Label>
              {pendingUsers.length > 0 ? (
                <Select
                  value={selectedUser?.id ?? pendingUsers[0].id}
                  onValueChange={handleSelectPendingUser}
                >
                  <SelectTrigger id="pending-member">
                    <SelectValue placeholder="Mitglied auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {getUserDisplayName(user)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Aktuell warten keine neuen Mitglieder auf ihre Freigabe.
                </div>
              )}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-6 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname</Label>
                  <Input
                    id="first_name"
                    value={formState.first_name}
                    onChange={handleFormChange('first_name')}
                    placeholder="Vorname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname</Label>
                  <Input
                    id="last_name"
                    value={formState.last_name}
                    onChange={handleFormChange('last_name')}
                    placeholder="Nachname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formState.email}
                    onChange={handleFormChange('email')}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_number">Mitgliedsnummer</Label>
                  <Input
                    id="member_number"
                    value={formState.member_number}
                    onChange={handleFormChange('member_number')}
                    placeholder="z. B. 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formState.phone}
                    onChange={handleFormChange('phone')}
                    placeholder="Festnetz"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobil</Label>
                  <Input
                    id="mobile"
                    value={formState.mobile}
                    onChange={handleFormChange('mobile')}
                    placeholder="Mobilnummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input
                    id="street"
                    value={formState.street}
                    onChange={handleFormChange('street')}
                    placeholder="Straße und Hausnummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">PLZ</Label>
                  <Input
                    id="postal_code"
                    value={formState.postal_code}
                    onChange={handleFormChange('postal_code')}
                    placeholder="z. B. 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ort</Label>
                  <Input
                    id="city"
                    value={formState.city}
                    onChange={handleFormChange('city')}
                    placeholder="Wohnort"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthday">Geburtstag</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={formState.birthday}
                    onChange={handleFormChange('birthday')}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formState.status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rollen</Label>
                  <p className="text-xs text-muted-foreground">
                    Die Basisrolle "Mitglied" bleibt immer aktiv.
                  </p>
                  <div className="grid gap-2">
                    {roleOptions.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <Checkbox
                          id={`role-${option.value}`}
                          checked={selectedRoles.includes(option.value)}
                          onCheckedChange={(checked) => handleRoleToggle(option.value, Boolean(checked))}
                          disabled={option.value === 'player'}
                        />
                        <div className="space-y-1">
                          <Label htmlFor={`role-${option.value}`} className="flex items-center gap-2 text-sm font-medium">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Abbrechen
            </Button>
            <Button
              className="bg-gradient-primary hover:bg-primary-hover"
              onClick={handleProfileSubmit}
              disabled={
                isSaving ||
                !selectedUser ||
                (dialogMode === 'create' && pendingUsers.length === 0)
              }
            >
              {isSaving ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
