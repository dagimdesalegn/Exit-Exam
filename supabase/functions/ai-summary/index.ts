// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get("origin") || "";
  const allowedOriginList = String(Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const defaultDevOrigins = ["http://localhost:8000", "http://127.0.0.1:8000"];
  const effectiveAllowed = allowedOriginList.length ? allowedOriginList : defaultDevOrigins;

  const allowOrigin = effectiveAllowed.includes(requestOrigin)
    ? (requestOrigin || "*")
    : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, origin, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
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

      const prompt = `You are an exit-exam tutor. Produce a clear, student-friendly summary for this question.\n\nReturn EXACTLY this section format:\nCore Concept:\n- ...\n\nKey Facts & Formulas:\n- ...\n\nStep-by-Step Solution Idea:\n1. ...\n2. ...\n3. ...\n\nWorked Example:\n- ...\n\nCommon Mistakes:\n- ...\n\nQuick Revision:\n- ...\n- ...\n- ...\n- ...\n- ...\n\nRules:\n- Be concise but complete.\n- Use plain language.\n- Keep facts accurate and exam-focused.\n- If a formula is used, define symbols.\n\nCourse: ${question.course}\nQuestion: ${question.question}`;

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
      const summaryRaw = payload?.choices?.[0]?.message?.content || "No summary returned.";
      const summary = normalizeSummary(summaryRaw);

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
        results.push({ questionId: question.id, ok: true, summary });
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

function normalizeSummary(value: string) {
  const text = String(value || "").trim();
  if (!text) {
    return "Core Concept:\n- AI did not return content. Please try again.";
  }

  const hasCore = /core\s*concept\s*:/i.test(text);
  const hasFacts = /key\s*facts\s*&\s*formulas\s*:/i.test(text);
  const hasSteps = /step-by-step\s*solution\s*idea\s*:/i.test(text);
  const hasExample = /worked\s*example\s*:/i.test(text);
  const hasMistakes = /common\s*mistakes\s*:/i.test(text);
  const hasRevision = /quick\s*revision\s*:/i.test(text);

  if (hasCore && hasFacts && hasSteps && hasExample && hasMistakes && hasRevision) {
    return text;
  }

  return [
    "Core Concept:",
    `- ${text}`,
    "",
    "Key Facts & Formulas:",
    "- Extract the main definitions and formulas from the concept above.",
    "",
    "Step-by-Step Solution Idea:",
    "1. Identify what the question asks.",
    "2. Select the correct concept/formula.",
    "3. Apply carefully and verify units/logic.",
    "",
    "Worked Example:",
    "- Build a small example using the same method.",
    "",
    "Common Mistakes:",
    "- Skipping assumptions or sign/units checks.",
    "",
    "Quick Revision:",
    "- Know the core definition.",
    "- Memorize the key formula.",
    "- Practice one similar question.",
    "- Recheck final result for reasonableness.",
    "- Repeat with a second variation.",
  ].join("\n");
}
