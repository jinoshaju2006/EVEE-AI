import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };
const encoder = new TextEncoder();
const LIMIT = 20;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > LIMIT;
}

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
    }
    const body = await req.json();
    const messages = body?.messages as ChatMessage[];
    const provider = body?.provider === "openai" ? "openai" : "gemini";

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return Response.json({ error: "Send between 1 and 40 messages." }, { status: 400 });
    }
    if (messages.some(m => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 20000)) {
      return Response.json({ error: "Invalid message format or message too long." }, { status: 400 });
    }

    const stream = provider === "openai" ? await streamOpenAI(messages) : await streamGemini(messages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider request failed.";
    const status = message.includes("not configured") ? 503 : message.includes("error (401)") ? 401 : message.includes("error (429)") ? 429 : 502;
    return Response.json({ error: message }, { status });
  }
}

async function streamGemini(messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured. Add GEMINI_API_KEY to the server environment.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = messages.slice(-20).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: "You are EVEE AI, a helpful AI assistant. Image creation is handled by the image-generation service, not text chat. Never claim an image was generated unless the image service returns one." }] },
    contents
  });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: requestBody,
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`Gemini error (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return parseSSE(response, data => {
    const parsed = JSON.parse(data);
    return parsed.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  });
}

async function streamOpenAI(messages: ChatMessage[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI-compatible provider is not configured. Add OPENAI_API_KEY to the server environment.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, stream: true }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`OpenAI-compatible provider error (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return parseSSE(response, data => {
    const parsed = JSON.parse(data);
    return parsed.choices?.[0]?.delta?.content || "";
  });
}

function parseSSE(response: Response, extract: (data: string) => string) {
  if (!response.body) throw new Error("Provider returned an empty stream.");
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const processFrame = (frame: string) => {
        const data = frame.split(/\r?\n/)
          .filter(line => line.startsWith("data:"))
          .map(line => line.slice(5).trimStart())
          .join("\n").trim();
        if (!data || data === "[DONE]") return;
        const text = extract(data);
        if (text) controller.enqueue(encoder.encode(text));
      };
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split(/\r?\n\r?\n/);
          buffer = frames.pop() || "";
          for (const frame of frames) processFrame(frame);
        }
        buffer += decoder.decode();
        if (buffer.trim()) processFrame(buffer);
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });
}
