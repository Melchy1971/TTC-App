import { useState, useEffect, FormEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Edit2, Megaphone, Trash2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BoardMessage {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export const BoardPanel = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [messageForm, setMessageForm] = useState({
    title: "",
    content: "",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    event_date: "",
    description: "",
    location: "",
  });

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    fetchEvents();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('board_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Fehler",
        description: "Nachrichten konnten nicht geladen werden.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('club_events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Fehler",
        description: "Events konnten nicht geladen werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageForm.title.trim() || !messageForm.content.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Pflichtfelder aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (editingMessageId) {
        const { error } = await supabase
          .from('board_messages')
          .update({
            title: messageForm.title,
            content: messageForm.content,
          })
          .eq('id', editingMessageId);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Nachricht wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('board_messages')
          .insert({
            title: messageForm.title,
            content: messageForm.content,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Nachricht wurde erstellt.",
        });
      }

      setMessageForm({ title: "", content: "" });
      setEditingMessageId(null);
      fetchMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleEditMessage = (message: BoardMessage) => {
    setMessageForm({ title: message.title, content: message.content });
    setEditingMessageId(message.id);
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('board_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Nachricht wurde gelöscht.",
      });

      fetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Fehler",
        description: "Nachricht konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  const handleSaveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.event_date.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie Titel und Datum aus.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      if (editingEventId) {
        const { error } = await supabase
          .from('club_events')
          .update({
            title: eventForm.title,
            event_date: eventForm.event_date,
            description: eventForm.description || null,
            location: eventForm.location || null,
          })
          .eq('id', editingEventId);

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Event wurde aktualisiert.",
        });
      } else {
        const { error } = await supabase
          .from('club_events')
          .insert({
            title: eventForm.title,
            event_date: eventForm.event_date,
            description: eventForm.description || null,
            location: eventForm.location || null,
            author_id: user.id,
          });

        if (error) throw error;

        toast({
          title: "Erfolg",
          description: "Event wurde erstellt.",
        });
      }

      setEventForm({ title: "", event_date: "", description: "", location: "" });
      setEditingEventId(null);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Fehler",
        description: "Event konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const handleEditEvent = (event: ClubEvent) => {
    setEventForm({
      title: event.title,
      event_date: event.event_date.split('T')[0],
      description: event.description || "",
      location: event.location || "",
    });
    setEditingEventId(event.id);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('club_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Event wurde gelöscht.",
      });

      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Fehler",
        description: "Event konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Vorstand-Bereich
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Verwalten Sie Vorstands-Nachrichten und Vereins-Events. Diese werden automatisch im Kommunikationsbereich für alle Mitglieder angezeigt.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sport">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Vorstands-Nachrichten
            </CardTitle>
            <CardDescription>
              Erstellen und verwalten Sie Nachrichten für alle Mitglieder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={handleSaveMessage}>
              <div className="space-y-2">
                <Label htmlFor="message-title">Titel*</Label>
                <Input
                  id="message-title"
                  value={messageForm.title}
                  onChange={(e) => setMessageForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="z.B. Trainingszeiten aktualisiert"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message-content">Inhalt*</Label>
                <Textarea
                  id="message-content"
                  value={messageForm.content}
                  onChange={(e) =>
                    setMessageForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Beschreiben Sie die wichtigsten Punkte..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingMessageId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingMessageId(null);
                    setMessageForm({ title: "", content: "" });
                  }}>
                    Abbrechen
                  </Button>
                )}
                <Button type="submit" className="bg-gradient-primary hover:bg-primary-hover">
                  {editingMessageId ? "Aktualisieren" : "Speichern"}
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {messages.map((message) => (
                <Card key={message.id} className="border border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{message.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => handleEditMessage(message)}
                          aria-label="Nachricht bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteMessage(message.id)}
                          aria-label="Nachricht löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {message.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sport">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Vereins-Events
            </CardTitle>
            <CardDescription>
              Planen Sie Termine und informieren Sie alle Mitglieder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={handleSaveEvent}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Titel*</Label>
                  <Input
                    id="event-title"
                    value={eventForm.title}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Saisonauftakt"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-date">Datum*</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event-location">Ort</Label>
                  <Input
                    id="event-location"
                    value={eventForm.location}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Sporthalle, Vereinsheim..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-description">Beschreibung</Label>
                  <Textarea
                    id="event-description"
                    value={eventForm.description}
                    onChange={(e) =>
                      setEventForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    placeholder="Was erwartet die Teilnehmenden?"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {editingEventId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingEventId(null);
                    setEventForm({ title: "", event_date: "", description: "", location: "" });
                  }}>
                    Abbrechen
                  </Button>
                )}
                <Button type="submit" className="bg-gradient-secondary hover:bg-primary-hover">
                  {editingEventId ? "Aktualisieren" : "Speichern"}
                </Button>
              </div>
            </form>

            <div className="space-y-3">
              {events.map((event) => (
                <Card key={event.id} className="border border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.event_date).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => handleEditEvent(event)}
                          aria-label="Event bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEvent(event.id)}
                          aria-label="Event löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {event.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
