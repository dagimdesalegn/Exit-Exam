// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Use OpenRouter for AI - free tier available
// Alternative: Use Groq, Claude, or other APIs
const OPENROUTER_API_KEY = (globalThis as any).Deno?.env?.get('OPENROUTER_API_KEY') || 'free-tier';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    .replace(/[\*#@]/g, "")
    .replace(/(^|\n)\s*[-•]+\s*/g, "$1")
    .replace(/\s-\s/g, " ")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
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

  // Limit context length
  const limitedQuestion = question.slice(0, 2000);

  try {
    // Try using OpenRouter with free model (Meta Llama 2)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://exit-exam.local',
        'X-Title': 'Exit Exam',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-2-7b-chat:free',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Exit Exam Computer Science tutor. Provide clear, concise answers in plain text. Keep responses short, practical, and well-organized. Do not use markdown formatting.',
          },
          { role: 'user', content: limitedQuestion },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const summary = cleanModelText(data.choices?.[0]?.message?.content || '');
      if (summary) {
        return jsonResponse({ summary });
      }
    }

    // Fallback: Use simple text generation with knowledge base
    const fallbackAnswer = generateSmartAnswer(limitedQuestion);
    return jsonResponse({ summary: fallbackAnswer });

  } catch (error) {
    // Fallback to smart answer generator
    const fallbackAnswer = generateSmartAnswer(limitedQuestion);
    return jsonResponse({ summary: fallbackAnswer });
  }
});

// Smart fallback answer generator with CS knowledge base
function generateSmartAnswer(question: string): string {
  const lowerQ = question.toLowerCase();
  
  // CS concepts knowledge base
  const responses: Record<string, string> = {
    'algorithm': 'An algorithm is a step-by-step procedure for solving a problem. Good algorithms are efficient, correct, and well-documented. Time complexity matters for performance.',
    'data structure': 'Data structures organize data for efficient access and modification. Common types: arrays, linked lists, trees, graphs, hash tables. Choose based on your access patterns.',
    'database': 'Databases store and manage data using ACID properties. SQL databases are relational, NoSQL offers flexibility. Indexing improves query performance significantly.',
    'network': 'Networks connect computers using protocols like TCP/IP. OSI model has 7 layers. Network performance depends on bandwidth, latency, and packet loss.',
    'security': 'Security involves authentication, authorization, encryption, and auditing. Always validate input, use HTTPS, hash passwords, and keep systems updated.',
    'object oriented': 'OOP uses classes, inheritance, polymorphism, and encapsulation. Objects encapsulate data and methods. Inheritance enables code reuse through hierarchies.',
    'functional programming': 'Functional programming emphasizes pure functions and immutability. Avoids side effects. Functions are first-class citizens. Enables easier reasoning about code.',
    'api': 'APIs allow software components to communicate. REST uses HTTP methods and URLs. Always validate requests, handle errors gracefully, and document thoroughly.',
    'testing': 'Testing verifies software correctness. Unit tests check individual functions. Integration tests check component interactions. Always test edge cases and error conditions.',
    'version control': 'Git tracks code changes over time. Commits should be atomic with clear messages. Branches enable parallel development. Pull requests facilitate code review.',
  };

  // Find relevant response
  for (const [key, answer] of Object.entries(responses)) {
    if (lowerQ.includes(key)) {
      return answer;
    }
  }

  // Default response
  return `That's a great Exit Exam Computer Science question. In the context of your studies: Break down complex problems into smaller parts. Understand the fundamentals deeply. Practice writing clean, efficient code. Review common patterns and best practices. Good luck with your exam preparation.`;
}