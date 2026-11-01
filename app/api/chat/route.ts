import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = { role: "user" | "assistant"; content: string };
const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[];
    const provider = body.provider === "openai" ? "openai" : "gemini";
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 40) {
      return Response.json({ error: "Send between 1 and 40 messages." }, { status: 400 });
    }
    if (messages.some(m => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 20000)) {
      return Response.json({ error: "Invalid message format or message too long." }, { status: 400 });
    }

    const stream = provider === "openai"
      ? await streamOpenAI(messages)
      : await streamGemini(messages);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI provider request failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function streamGemini(messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured. Add GEMINI_API_KEY to the server environment.");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
    { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents }), signal: AbortSignal.timeout(90000) }
  );
  if (!response.ok) throw new Error(`Gemini error (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return parseSSE(response, data => {
    const parsed = JSON.parse(data);
    return parsed.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  });
}

async function streamOpenAI(messages: ChatMessage[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured. Add OPENAI_API_KEY to the server environment.");
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
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            const text = extract(data);
            if (text) controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });
}