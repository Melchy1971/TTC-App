import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Download,
  Edit2,
  Megaphone,
  Printer,
  Trash2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommunicationMessage {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

interface CommunicationEvent {
  id: number;
  title: string;
  date: string;
  description: string;
  location: string;
}

interface RatingEntry {
  id: number;
  name: string;
  team: string;
  qttr: number;
  ttr: number;
}

const initialMessages: CommunicationMessage[] = [
  {
    id: 1,
    title: "Neue Trainingszeiten",
    content:
      "Ab Dezember gelten neue Trainingszeiten für die Herrenmannschaften. Bitte beachtet die Übersicht im Mitgliederbereich.",
    createdAt: "15.11.2024",
  },
  {
    id: 2,
    title: "Weihnachtsfeier",
    content:
      "Unsere Vereinsweihnachtsfeier findet am 21.12. im Vereinsheim statt. Meldet euch bis zum 05.12. bei Jana an.",
    createdAt: "12.11.2024",
  },
];

const initialEvents: CommunicationEvent[] = [
  {
    id: 1,
    title: "Vorstandssitzung",
    date: "28.11.2024",
    description: "Planung Rückrunde und Nachwuchsarbeit",
    location: "Clubraum",
  },
  {
    id: 2,
    title: "Jugendturnier",
    date: "14.12.2024",
    description: "Vereinsinternes Ranglistenturnier für die Jugend",
    location: "Sporthalle Mitte",
  },
];

const qttrList: RatingEntry[] = [
  { id: 1, name: "Lara Hoffmann", team: "Damen I", qttr: 1623, ttr: 1601 },
  { id: 2, name: "Felix Brandt", team: "Herren I", qttr: 1878, ttr: 1860 },
  { id: 3, name: "Mia Keller", team: "Jugend U18", qttr: 1432, ttr: 1420 },
  { id: 4, name: "Jonas Weber", team: "Herren II", qttr: 1695, ttr: 1684 },
  { id: 5, name: "Noah Fischer", team: "Jugend U15", qttr: 1342, ttr: 1330 },
];

export const Communication = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [events, setEvents] = useState(initialEvents);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [messageForm, setMessageForm] = useState({
    title: "",
    content: "",
  });
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    description: "",
    location: "",
  });

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) {
          setRoleLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role", error);
        }

        if (data?.role) {
          setUserRole(data.role);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error loading user role", error);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRole();
  }, []);

  const hasBoardAccess = userRole === "admin" || userRole === "vorstand";

  const renderRestrictedCard = (
    title: string,
    description: string,
    Icon: LucideIcon,
  ) => (
    <Card className="shadow-sport">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Sie benötigen die Rolle "Vorstand" oder "Admin", um diesen Bereich zu sehen.
        </p>
      </CardContent>
    </Card>
  );

  const handleSaveMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageForm.title.trim() || !messageForm.content.trim()) {
      return;
    }

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === editingMessageId
            ? { ...message, title: messageForm.title, content: messageForm.content }
            : message,
        ),
      );
    } else {
      setMessages((prev) => [
        {
          id: Date.now(),
          title: messageForm.title,
          content: messageForm.content,
          createdAt: new Date().toLocaleDateString("de-DE"),
        },
        ...prev,
      ]);
    }

    setMessageForm({ title: "", content: "" });
    setEditingMessageId(null);
  };

  const handleEditMessage = (id: number) => {
    const message = messages.find((entry) => entry.id === id);
    if (!message) return;

    setMessageForm({ title: message.title, content: message.content });
    setEditingMessageId(id);
  };

  const handleDeleteMessage = (id: number) => {
    setMessages((prev) => prev.filter((message) => message.id !== id));
    if (editingMessageId === id) {
      setMessageForm({ title: "", content: "" });
      setEditingMessageId(null);
    }
  };

  const handleSaveEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.date.trim()) {
      return;
    }

    if (editingEventId) {
      setEvents((prev) =>
        prev.map((item) =>
          item.id === editingEventId
            ? {
                ...item,
                title: eventForm.title,
                date: eventForm.date,
                description: eventForm.description,
                location: eventForm.location,
              }
            : item,
        ),
      );
    } else {
      setEvents((prev) => [
        {
          id: Date.now(),
          title: eventForm.title,
          date: eventForm.date,
          description: eventForm.description,
          location: eventForm.location,
        },
        ...prev,
      ]);
    }

    setEventForm({ title: "", date: "", description: "", location: "" });
    setEditingEventId(null);
  };

  const handleEditEvent = (id: number) => {
    const event = events.find((entry) => entry.id === id);
    if (!event) return;

    setEventForm({
      title: event.title,
      date: event.date,
      description: event.description,
      location: event.location,
    });
    setEditingEventId(id);
  };

  const handleDeleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((item) => item.id !== id));
    if (editingEventId === id) {
      setEventForm({ title: "", date: "", description: "", location: "" });
      setEditingEventId(null);
    }
  };

  const handleDownloadList = () => {
    const csvHeader = "Name;Team;QTTR;TTR\n";
    const csvRows = qttrList
      .map((entry) => `${entry.name};${entry.team};${entry.qttr};${entry.ttr}`)
      .join("\n");
    const csvContent = `${csvHeader}${csvRows}`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `qttr_ttr_liste_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UsersRound className="w-8 h-8 text-primary" />
          Kommunikation
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Im Kommunikationsbereich verwaltet der Vorstand Informationen für alle Mitglieder.
          Nachrichten und Termine lassen sich zentral pflegen, während jedes Mitglied Zugriff
          auf die aktuelle QTTR/TTR-Liste hat.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {roleLoading ? (
          <>
            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Vorstands-Nachrichten
                </CardTitle>
                <CardDescription>
                  Lade Berechtigungen...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
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
                  Lade Berechtigungen...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : hasBoardAccess ? (
          <>
            <Card className="shadow-sport">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Vorstands-Nachrichten
                </CardTitle>
                <CardDescription>
                  Legen Sie neue Mitteilungen an oder aktualisieren Sie bestehende Nachrichten.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSaveMessage}>
                  <div className="space-y-2">
                    <Label htmlFor="message-title">Titel</Label>
                    <Input
                      id="message-title"
                      value={messageForm.title}
                      onChange={(event) => setMessageForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="z.B. Trainingszeiten aktualisiert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message-content">Inhalt</Label>
                    <Textarea
                      id="message-content"
                      value={messageForm.content}
                      onChange={(event) =>
                        setMessageForm((prev) => ({ ...prev, content: event.target.value }))
                      }
                      placeholder="Beschreiben Sie die wichtigsten Punkte..."
                      rows={4}
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
                      {editingMessageId ? "Nachricht aktualisieren" : "Nachricht speichern"}
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
                            <p className="text-xs text-muted-foreground">veröffentlicht am {message.createdAt}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => handleEditMessage(message.id)}
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
                  Planen Sie Termine und informieren Sie alle Mitglieder über wichtige Ereignisse.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSaveEvent}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-title">Eventtitel</Label>
                      <Input
                        id="event-title"
                        value={eventForm.title}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="z.B. Saisonauftakt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-date">Datum</Label>
                      <Input
                        id="event-date"
                        type="date"
                        value={eventForm.date}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, date: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-location">Ort</Label>
                      <Input
                        id="event-location"
                        value={eventForm.location}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))}
                        placeholder="Sporthalle, Vereinsheim..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-description">Beschreibung</Label>
                      <Textarea
                        id="event-description"
                        value={eventForm.description}
                        onChange={(event) =>
                          setEventForm((prev) => ({ ...prev, description: event.target.value }))
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
                        setEventForm({ title: "", date: "", description: "", location: "" });
                      }}>
                        Abbrechen
                      </Button>
                    )}
                    <Button type="submit" className="bg-gradient-secondary hover:bg-primary-hover">
                      {editingEventId ? "Event aktualisieren" : "Event speichern"}
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <Card key={event.id} className="border border-border/60">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.date).toLocaleDateString("de-DE", {
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
                              onClick={() => handleEditEvent(event.id)}
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
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.description || "Keine Beschreibung hinterlegt."}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {renderRestrictedCard(
              "Vorstands-Nachrichten",
              "Legen Sie neue Mitteilungen an oder aktualisieren Sie bestehende Nachrichten.",
              Megaphone,
            )}
            {renderRestrictedCard(
              "Vereins-Events",
              "Planen Sie Termine und informieren Sie alle Mitglieder über wichtige Ereignisse.",
              Calendar,
            )}
          </>
        )}
      </div>

      <Card className="shadow-sport">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            QTTR/TTR-Liste für Mitglieder
          </CardTitle>
          <CardDescription>
            Mitglieder können die aktuelle Rangliste einsehen und nach Bedarf herunterladen oder
            ausdrucken.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={handleDownloadList} className="gap-2">
              <Download className="w-4 h-4" />
              Als CSV herunterladen
            </Button>
            <Button variant="outline" onClick={handlePrintList} className="gap-2">
              <Printer className="w-4 h-4" />
              Liste drucken
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>QTTR</TableHead>
                <TableHead>TTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qttrList.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>{entry.team}</TableCell>
                  <TableCell>{entry.qttr}</TableCell>
                  <TableCell>{entry.ttr}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableCaption>Stand: {new Date().toLocaleDateString("de-DE")}</TableCaption>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
