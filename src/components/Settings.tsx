import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SettingsProps {
  user: User;
}

interface ProfileFormData {
  first_name: string;
  last_name: string;
  member_number: string;
  street: string;
  postal_code: string;
  city: string;
  email: string;
  phone: string;
  mobile: string;
  birthday: string;
  photo_url: string;
}

const emptyProfile: ProfileFormData = {
  first_name: "",
  last_name: "",
  member_number: "",
  street: "",
  postal_code: "",
  city: "",
  email: "",
  phone: "",
  mobile: "",
  birthday: "",
  photo_url: ""
};

export const Settings = ({ user }: SettingsProps) => {
  const [formData, setFormData] = useState<ProfileFormData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone, member_number, street, postal_code, city, mobile, birthday, photo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        toast({
          title: "Fehler",
          description: "Das Profil konnte nicht geladen werden.",
          variant: "destructive"
        });
      }

      if (data) {
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          member_number: data.member_number || "",
          street: data.street || "",
          postal_code: data.postal_code || "",
          city: data.city || "",
          email: data.email || user.email || "",
          phone: data.phone || "",
          mobile: data.mobile || "",
          birthday: data.birthday ? data.birthday.substring(0, 10) : "",
          photo_url: data.photo_url || ""
        });
      } else {
        setFormData({
          ...emptyProfile,
          email: user.email || ""
        });
      }

      setLoading(false);
    };

    fetchProfile();
  }, [toast, user]);

  const handleChange = (field: keyof ProfileFormData) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    const updatePayload = {
      first_name: formData.first_name || null,
      last_name: formData.last_name || null,
      email: formData.email || null,
      phone: formData.phone || null,
      member_number: formData.member_number || null,
      street: formData.street || null,
      postal_code: formData.postal_code || null,
      city: formData.city || null,
      mobile: formData.mobile || null,
      birthday: formData.birthday || null,
      photo_url: formData.photo_url || null,
      updated_at: new Date().toISOString()
    };

    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingProfile?.id) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            status: "active",
            ...updatePayload,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }
      }

      toast({
        title: "Gespeichert",
        description: "Dein Profil wurde erfolgreich aktualisiert."
      });
    } catch (error) {
      console.error("Error updating profile", error);
      toast({
        title: "Fehler",
        description: "Das Profil konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }

    setSaving(false);
  };

  const initials = [formData.first_name, formData.last_name]
    .filter(Boolean)
    .map((name) => name[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || (user.email?.[0]?.toUpperCase() || "M");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground">Aktualisiere deine persönlichen Daten und Kontaktdetails.</p>
      </div>

      <Card className="bg-white/90 backdrop-blur-sm shadow-sport">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            {formData.photo_url ? (
              <AvatarImage src={formData.photo_url} alt="Profilfoto" />
            ) : (
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle className="text-2xl">Mein Profil</CardTitle>
            <CardDescription>Pflege deine persönlichen Daten.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name">Vorname</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={handleChange("first_name")}
                  placeholder="Max"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nachname</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={handleChange("last_name")}
                  placeholder="Mustermann"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member_number">Mitgliedsnummer</Label>
                <Input
                  id="member_number"
                  value={formData.member_number}
                  onChange={handleChange("member_number")}
                  placeholder="12345"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Geburtstag</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange("birthday")}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={formData.street}
                  onChange={handleChange("street")}
                  placeholder="Hauptstraße 1"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange("postal_code")}
                  placeholder="12345"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={handleChange("city")}
                  placeholder="Musterstadt"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="max@beispiel.de"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange("phone")}
                  placeholder="0123 456789"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Handy</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={handleChange("mobile")}
                  placeholder="0170 1234567"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="photo_url">Foto-URL</Label>
                <Input
                  id="photo_url"
                  value={formData.photo_url}
                  onChange={handleChange("photo_url")}
                  placeholder="https://..."
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || saving}
                className="bg-gradient-primary hover:bg-primary-hover shadow-sport"
              >
                {saving ? "Speichern..." : "Änderungen speichern"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
