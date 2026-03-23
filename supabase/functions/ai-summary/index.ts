// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const DEEPSEEK_API_KEY = (globalThis as any).Deno?.env?.get('DEEPSEEK_API_KEY') || '';

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const { question } = await req.json() as { question?: string };
  if (!question) {
    return new Response('Missing question', {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Limit context length for DeepSeek
  const limitedQuestion = question.slice(0, 2000);

  if (!DEEPSEEK_API_KEY) {
    return new Response('DeepSeek API key is not configured', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
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
        { role: 'system', content: 'Explain this exam question clearly for a student. Use short sections with concise bullet points and keep the answer under 140 words.' },
        { role: 'user', content: limitedQuestion },
      ],
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    return new Response('DeepSeek API error', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content || '';

  return new Response(JSON.stringify({ summary }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});