
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { email } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400, headers: corsHeaders }
      );
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const publicClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Search Supabase Auth users server-side.
    let page = 1;
    const perPage = 1000;
    let found = false;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("Auth user lookup failed:", error.message);

        return Response.json(
          { error: "Unable to verify the account. Please try again." },
          { status: 500, headers: corsHeaders }
        );
      }

      found = data.users.some(
        (user) => user.email?.toLowerCase() === normalizedEmail
      );

      if (found || data.users.length < perPage) break;

      page++;
    }

    if (!found) {
      return Response.json(
        {
          exists: false,
          error: "No account found with this email address.",
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Only request recovery after the Auth account is found.
    const { error: resetError } =
      await publicClient.auth.resetPasswordForEmail(normalizedEmail);

    if (resetError) {
      console.error("Recovery request failed:", resetError.message);

      return Response.json(
        { error: "Could not send the reset code. Please try again." },
        { status: 400, headers: corsHeaders }
      );
    }

    return Response.json(
      { exists: true, message: "Reset code requested successfully." },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Password recovery error:", error);

    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
});
