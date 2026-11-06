import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

const ALLOWED_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];
const WINDOW_MS = 60_000;
const IMAGE_LIMIT = 3;
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > IMAGE_LIMIT;
}

export async function POST(req: NextRequest) {
  try {
    if (rateLimited(req)) {
      return Response.json({ error: "Image request limit reached. Wait a minute before trying again." }, { status: 429 });
    }
    const body = await req.json();
    const prompt = body?.prompt;
    const aspectRatio = body?.aspectRatio || "1:1";

    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
      return Response.json({ error: "Enter an image prompt (maximum 4,000 characters)." }, { status: 400 });
    }
    if (!ALLOWED_RATIOS.includes(aspectRatio)) {
      return Response.json({ error: "Unsupported aspect ratio. Choose one of the listed ratios." }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return Response.json({ error: "Image generation is not configured. Add GEMINI_API_KEY to the server environment." }, { status: 503 });
    }

    // Gemini image models are versioned/configurable because model availability is key/account dependent.
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: { aspectRatio, imageSize: "1K" }
          }
        }),
        signal: AbortSignal.timeout(180000)
      }
    );

    const raw = await response.text();
    if (!response.ok) {
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = parsed.error?.message || raw;
      } catch {}
      const status = [400, 401, 403, 404, 429].includes(response.status) ? response.status : 502;
      return Response.json(
        { error: `Gemini image error (${response.status}): ${detail.slice(0, 700)}` },
        { status }
      );
    }

    let data: any;
    try { data = JSON.parse(raw); }
    catch { return Response.json({ error: "Gemini returned an unreadable image response." }, { status: 502 }); }

    const parts: GeminiPart[] = data.candidates?.flatMap(
      (candidate: { content?: { parts?: GeminiPart[] } }) => candidate.content?.parts || []
    ) || [];
    const imagePart = parts.find(part => part.inlineData?.data || part.inline_data?.data);
    const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
    const mimeType = imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || "image/png";
    const text = parts.map(part => part.text).filter(Boolean).join("\n");

    if (!imageData || !/^image\/(png|jpeg|webp)$/i.test(mimeType)) {
      const blockReason = data.promptFeedback?.blockReason;
      const finishReason = data.candidates?.[0]?.finishReason;
      const message = blockReason
        ? `The image request was blocked by Gemini safety filters (${blockReason}). Try a different prompt.`
        : `Gemini did not return a supported image (finish reason: ${finishReason || "unknown"}). Check model access and API quota.`;
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({
      image: `data:${mimeType};base64,${imageData}`,
      mimeType,
      text: text || "Here is your generated image."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    const status = message.includes("timeout") || message.includes("aborted") ? 504 : 502;
    return Response.json({ error: message }, { status });
  }
}
