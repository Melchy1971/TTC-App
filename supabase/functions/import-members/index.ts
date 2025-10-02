import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  member_number?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  birthday?: string;
  temporary_password: string;
  role?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { members }: { members: MemberData[] } = await req.json();

    const results = {
      successful: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    for (const member of members) {
      try {
        // Create auth user with temporary password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: member.email,
          password: member.temporary_password,
          email_confirm: true,
          user_metadata: {
            first_name: member.first_name,
            last_name: member.last_name,
            requires_password_change: true,
          },
        });

        if (authError) throw authError;

        // Update profile with additional data
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            phone: member.phone,
            mobile: member.mobile,
            member_number: member.member_number,
            street: member.street,
            postal_code: member.postal_code,
            city: member.city,
            birthday: member.birthday,
            requires_password_change: true,
          })
          .eq("user_id", authData.user.id);

        if (profileError) throw profileError;

        // Assign additional roles if specified (player role is added by trigger)
        if (member.role && member.role !== 'player') {
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({
              user_id: authData.user.id,
              role: member.role,
            });

          if (roleError) throw roleError;
        }

        results.successful.push(member.email);
      } catch (error: any) {
        results.failed.push({
          email: member.email,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in import-members:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
