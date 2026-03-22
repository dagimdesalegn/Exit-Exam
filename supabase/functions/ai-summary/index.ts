// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOriginList = String(Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const allowOrigin = !allowedOriginList.length || allowedOriginList.includes(requestOrigin)
    ? (requestOrigin || "*")
    : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, origin, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const schedulerSecret = Deno.env.get("SCHEDULER_SECRET") || "";

    if (!supabaseUrl || !serviceRoleKey || !anonKey || !deepseekApiKey) {
      return json({ error: "Missing env vars. Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY." }, 500, corsHeaders);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    const callerUserId = authData?.user?.id || "";

    let questionIds: string[] = [];
    const body = await req.json().catch(() => ({}));

    if (body.questionId) {
      if (!callerUserId || authError) {
        return json({ error: "Unauthorized" }, 401, corsHeaders);
      }
      questionIds = [String(body.questionId)];
    } else {
      // Scheduler path: blocked unless correct secret header is present.
      const incomingSecret = req.headers.get("x-cron-secret") || "";
      if (!schedulerSecret || incomingSecret !== schedulerSecret) {
        return json({ error: "Forbidden" }, 403, corsHeaders);
      }

      // For scheduler usage: process due questions
      const { data: dueRows, error: dueError } = await supabase
        .from("questions")
        .select("id")
        .in("status", ["scheduled", "processing"])
        .lte("scheduled_for", new Date().toISOString())
        .limit(20);

      if (dueError) {
        throw dueError;
      }

      questionIds = (dueRows || []).map((row) => row.id);
    }

    const results = [];

    for (const questionId of questionIds) {
      const { data: question, error: qError } = await supabase
        .from("questions")
        .select("id, user_id, course, question")
        .eq("id", questionId)
        .single();

      if (qError || !question) {
        results.push({ questionId, ok: false, error: "Question not found" });
        continue;
      }

      if (body.questionId && question.user_id !== callerUserId) {
        results.push({ questionId: question.id, ok: false, error: "Forbidden" });
        continue;
      }

      await supabase
        .from("questions")
        .update({ status: "processing" })
        .eq("id", question.id);

      const prompt = `You are an exit-exam tutor. Return a concise and well-structured answer with:\n1) Core concept\n2) Key formulas or facts\n3) Practical example\n4) 3 quick revision bullets\n\nCourse: ${question.course}\nQuestion: ${question.question}`;

      const aiResp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.2,
          messages: [
            { role: "system", content: "You are a precise exam preparation assistant." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResp.ok) {
        const errorText = await aiResp.text();
        await supabase
          .from("questions")
          .update({
            status: "error",
            ai_summary: "AI provider error. Please retry shortly.",
          })
          .eq("id", question.id);

        results.push({ questionId: question.id, ok: false, error: errorText });
        continue;
      }

      const payload = await aiResp.json();
      const summary = payload?.choices?.[0]?.message?.content || "No summary returned.";

      const { error: updateError } = await supabase
        .from("questions")
        .update({
          status: "completed",
          ai_summary: summary,
        })
        .eq("id", question.id);

      if (updateError) {
        results.push({ questionId: question.id, ok: false, error: updateError.message });
      } else {
        results.push({ questionId: question.id, ok: true });
      }
    }

    return json({ processed: results.length, results }, 200, corsHeaders);
  } catch (error) {
    return json({ error: error.message || "Unknown error" }, 500, corsHeaders);
  }
});

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
