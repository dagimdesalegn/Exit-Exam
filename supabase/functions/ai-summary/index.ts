// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DEEPSEEK_API_KEY = (globalThis as any).Deno?.env?.get('DEEPSEEK_API_KEY') || '';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Supabase JS adds x-client-info and apikey headers automatically.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function cleanModelText(value: string): string {
  return String(value || "")
    .replace(/[\*#]/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1].length > 0))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  const { question } = await req.json() as { question?: string };
  if (!question) {
    return jsonResponse({ error: 'Missing question' }, 400);
  }

  // Limit context length for DeepSeek
  const limitedQuestion = question.slice(0, 2000);

  if (!DEEPSEEK_API_KEY) {
    return jsonResponse({ error: 'DeepSeek API key is not configured' }, 500);
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an Exit Exam Computer Science tutor. Answer only Computer Science exit exam related questions. Use clear plain text with short lines. Do not use markdown symbols like * or #. Keep responses concise, practical, and exam-oriented.',
        },
        { role: 'user', content: limitedQuestion },
      ],
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return jsonResponse({ error: 'DeepSeek API error', detail: errorText.slice(0, 400) }, 500);
  }

  const data = await response.json();
  const summary = cleanModelText(data.choices?.[0]?.message?.content || '');

  return jsonResponse({ summary });
});