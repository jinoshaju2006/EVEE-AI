import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"];

type CloudflareImageResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: { image?: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;
    const requestedRatio = body?.aspectRatio || "1:1";

    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2048) {
      return Response.json({ error: "Enter an image prompt (maximum 2,048 characters)." }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      return Response.json(
        { error: "Image generation is not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to the Vercel environment variables." },
        { status: 503 }
      );
    }

    const ratio = ALLOWED_RATIOS.includes(requestedRatio) ? requestedRatio : "1:1";
    // FLUX.1 Schnell has no native aspect-ratio or resolution input; pass the composition as prompt guidance.
    const composedPrompt = `${prompt.trim()}\nComposition: create the image in a ${ratio} aspect-ratio composition.`;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`
        },
        body: JSON.stringify({ prompt: composedPrompt, steps: 4 }),
        signal: AbortSignal.timeout(180000)
      }
    );

    const raw = await response.text();
    let data: CloudflareImageResponse = {};
    try {
      data = JSON.parse(raw) as CloudflareImageResponse;
    } catch {
      return Response.json({ error: "Cloudflare returned an unreadable response. Please try again later." }, { status: 502 });
    }

    if (!response.ok || data.success === false) {
      const detail = data.errors?.map(item => item.message).filter(Boolean).join("; ") || "Image generation request failed.";
      const status = response.status === 429 ? 429 : response.status >= 400 && response.status < 500 ? response.status : 502;
      return Response.json(
        { error: response.status === 429 ? "Cloudflare's free daily AI allowance or rate limit has been reached. Please try again after the limit resets." : `Cloudflare image error (${response.status}): ${detail.slice(0, 500)}` },
        { status }
      );
    }

    const imageData = data.result?.image;
    if (!imageData) {
      return Response.json({ error: "Cloudflare did not return an image. Please try again." }, { status: 502 });
    }

    return Response.json({
      image: `data:image/jpeg;base64,${imageData}`,
      text: "Image generated with Cloudflare FLUX.1 Schnell."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
