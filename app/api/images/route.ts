import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1" } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4000) {
      return Response.json({ error: "Enter an image prompt (maximum 4,000 characters)." }, { status: 400 });
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) return Response.json({ error: "Image generation is not configured. Add GEMINI_API_KEY to Vercel." }, { status: 503 });

    const model = process.env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model,
        input: prompt.trim(),
        response_format: { type: "image", mime_type: "image/png", aspect_ratio: aspectRatio, image_size: "1K" }
      }),
      signal: AbortSignal.timeout(180000)
    });
    const raw = await response.text();
    if (!response.ok) {
      let detail = raw;
      try { detail = JSON.parse(raw).error?.message || raw; } catch {}
      return Response.json({ error: `Gemini image error (${response.status}): ${detail.slice(0, 700)}` }, { status: response.status });
    }
    const data = JSON.parse(raw);
    const image = data.output_image?.data || data.steps?.filter((s: any) => s.type === "model_output").flatMap((s: any) => s.content || []).find((c: any) => c.type === "image")?.data;
    if (!image) return Response.json({ error: "The image model returned no image. Check that image generation is enabled for your API key." }, { status: 502 });
    return Response.json({ image: `data:image/png;base64,${image}`, text: data.output_text || "Here is your generated image." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
