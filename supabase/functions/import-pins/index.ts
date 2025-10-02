import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PinData {
  date: string;
  homeTeam: string;
  awayTeam: string;
  spielpin: string;
  spielpartiePin: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { pins } = await req.json();

    if (!pins || !Array.isArray(pins)) {
      return new Response(
        JSON.stringify({ error: "Invalid pins data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let successful = 0;
    let failed = 0;

    for (const pin of pins as PinData[]) {
      try {
        console.log(`Processing pin: ${pin.date} - ${pin.homeTeam} vs ${pin.awayTeam}`);
        
        // Find all matches on this date
        const { data: matches, error: matchError } = await supabase
          .from("matches")
          .select("id, team, opponent, date")
          .eq("date", pin.date);

        if (matchError) {
          console.error("Error finding matches:", matchError);
          failed++;
          continue;
        }

        if (!matches || matches.length === 0) {
          console.error(`No matches found for date ${pin.date}. Please import the match schedule first.`);
          failed++;
          continue;
        }

        // Find exact match with home and away team (flexible matching)
        const exactMatch = matches.find(m => {
          const homeMatch = 
            m.team.toLowerCase().includes(pin.homeTeam.toLowerCase()) ||
            pin.homeTeam.toLowerCase().includes(m.team.toLowerCase());
          const awayMatch = 
            m.opponent.toLowerCase().includes(pin.awayTeam.toLowerCase()) ||
            pin.awayTeam.toLowerCase().includes(m.opponent.toLowerCase());
          return homeMatch && awayMatch;
        });

        if (!exactMatch) {
          console.error(
            `No exact match found for ${pin.homeTeam} vs ${pin.awayTeam}. ` +
            `Available: ${matches.map(m => `${m.team} vs ${m.opponent}`).join(', ')}`
          );
          failed++;
          continue;
        }

        console.log(`Match found: ID ${exactMatch.id}`);

        // Upsert pins
        const { error: insertError } = await supabase
          .from("match_pins")
          .upsert({
            match_id: exactMatch.id,
            spielpin: pin.spielpin,
            spielpartie_pin: pin.spielpartiePin,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "match_id",
          });

        if (insertError) {
          console.error("Error inserting pin:", insertError);
          failed++;
          continue;
        }

        console.log(`Successfully imported pin for match ${exactMatch.id}`);
        successful++;
      } catch (error) {
        console.error("Error processing pin:", error);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        successful,
        failed,
        total: pins.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in import-pins function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
