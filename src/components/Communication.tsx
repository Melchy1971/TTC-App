import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Megaphone,
  UsersRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QttrDownloadSection } from "./QttrDownloadSection";

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

export const Communication = () => {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);

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
    }
  };

  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => a.event_date.localeCompare(b.event_date));
  }, [events]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <UsersRound className="w-8 h-8 text-primary" />
          Kommunikation
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Im Kommunikationsbereich finden Sie alle aktuellen Nachrichten und Termine des Vereins.
          Informationen werden vom Vorstand gepflegt und sind hier zentral für alle Mitglieder einsehbar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5" />
                Vorstands-Nachrichten
              </CardTitle>
              <CardDescription>
                Aktuelle Mitteilungen und Informationen vom Vorstand.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aktuell keine Nachrichten vorhanden.
                </p>
              ) : (
                messages.map((message) => (
                  <Card key={message.id} className="border border-border/60">
                    <CardHeader className="pb-2">
                      <div>
                        <CardTitle className="text-lg">{message.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {new Date(message.created_at).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {message.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sport">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Vereins-Events
              </CardTitle>
              <CardDescription>
                Kommende Termine und Veranstaltungen im Überblick.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aktuell keine Events geplant.
                </p>
              ) : (
                upcomingEvents.map((event) => (
                  <Card key={event.id} className="border border-border/60">
                    <CardHeader className="pb-2">
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
                    </CardHeader>
                    {event.description && (
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <QttrDownloadSection />
    </div>
  );
};
