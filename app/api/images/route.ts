import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1" } = await req.json();

    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
      return Response.json({ error: "Enter an image prompt (maximum 4,000 characters)." }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return Response.json({ error: "Image generation is not configured. Add GEMINI_API_KEY to Vercel." }, { status: 503 });
    }

    // Use Gemini's documented generateContent image-generation endpoint.
    // This shares the same API key as EVEE chat, while keeping image generation server-side.
    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt.trim() }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: {
              aspectRatio: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"].includes(aspectRatio) ? aspectRatio : "1:1",
              imageSize: "1K"
            }
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
      return Response.json(
        { error: `Gemini image error (${response.status}): ${detail.slice(0, 700)}` },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    const data = JSON.parse(raw);
    const parts: GeminiPart[] = data.candidates?.flatMap(
      (candidate: { content?: { parts?: GeminiPart[] } }) => candidate.content?.parts || []
    ) || [];
    const imagePart = parts.find(part => part.inlineData?.data || part.inline_data?.data);
    const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
    const mimeType = imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || "image/png";
    const text = parts.map(part => part.text).filter(Boolean).join("\n");

    if (!imageData) {
      const blockReason = data.promptFeedback?.blockReason;
      const message = blockReason
        ? `The image request was blocked by Gemini safety filters (${blockReason}). Try a different prompt.`
        : "Gemini returned no image. Check that the selected image model is available for this API key.";
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({
      image: `data:${mimeType};base64,${imageData}`,
      text: text || "Here is your generated image."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
