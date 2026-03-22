// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !deepseekApiKey) {
      return json({ error: "Missing env vars. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEEPSEEK_API_KEY." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let questionIds: string[] = [];
    const body = await req.json().catch(() => ({}));

    if (body.questionId) {
      questionIds = [String(body.questionId)];
    } else {
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

      await supabase
        .from("questions")
        .update({ status: "processing", updated_at: new Date().toISOString() })
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
            ai_summary: `DeepSeek error: ${errorText}`,
            updated_at: new Date().toISOString(),
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", question.id);

      if (updateError) {
        results.push({ questionId: question.id, ok: false, error: updateError.message });
      } else {
        results.push({ questionId: question.id, ok: true });
      }
    }

    return json({ processed: results.length, results });
  } catch (error) {
    return json({ error: error.message || "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
