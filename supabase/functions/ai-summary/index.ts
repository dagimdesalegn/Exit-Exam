import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Replace with your DeepSeek API key
const DEEPSEEK_API_KEY = Deno.env.get('sk-1420505bef404377984d02e34eb67620');

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        124 x 11
        DeepSeek AI API key — https://platform.deepseek.com
        DEEPSEEK_API_KEY=sk-1420505bef404377984d02e34eb67620
        HERE IS MY API KEY N ALSO app.js?v=20260323-35:182 ReferenceError: streak is not defined
        at renderWeeklyContributionStrip (app.js?v=20260323-35:2548:34)
        at renderHomeDashboard (app.js?v=20260323-35:2322:3)
        at loadEverything (app.js?v=20260323-35:596:3)
        at async handleSession (app.js?v=20260323-35:555:3)
        at async boot (app.js?v=20260323-35:200:3)
        
        Read app.js, lines 2500 to 
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

  const { question } = await req.json();
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

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'Summarize this question for a student in 2-3 sentences.' },
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
