import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CloudflareEditResponse = {
  success?: boolean;
  errors?: Array<{ message?: string }>;
  result?: { image?: string };
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const prompt = form.get("prompt");
    const image = form.get("image");

    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 2048) {
      return Response.json({ error: "Enter an edit instruction (maximum 2,048 characters)." }, { status: 400 });
    }
    if (!(image instanceof File)) {
      return Response.json({ error: "Choose an image to edit." }, { status: 400 });
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      return Response.json({ error: "Upload a JPG, PNG, or WebP image." }, { status: 400 });
    }
    if (image.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Image must be 8 MB or smaller." }, { status: 413 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      return Response.json({ error: "Image editing is not configured. Check the Cloudflare account settings in Vercel." }, { status: 503 });
    }

    const imageBase64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          image_b64: imageBase64,
          strength: 0.7,
          num_steps: 20
        }),
        signal: AbortSignal.timeout(180000)
      }
    );

    const raw = await response.text();
    let data: CloudflareEditResponse = {};
    try {
      data = JSON.parse(raw) as CloudflareEditResponse;
    } catch {
      return Response.json({ error: "Cloudflare returned an unreadable response. Please try again." }, { status: 502 });
    }
    if (!response.ok || data.success === false) {
      const detail = data.errors?.map(item => item.message).filter(Boolean).join("; ") || "Image editing request failed.";
      const status = response.status === 429 ? 429 : response.status >= 400 && response.status < 500 ? response.status : 502;
      return Response.json({ error: response.status === 429 ? "The image service is busy or its usage limit has been reached. Please try again later." : `Cloudflare image editing error (${response.status}): ${detail.slice(0, 400)}` }, { status });
    }

    const imageData = data.result?.image;
    if (!imageData) {
      return Response.json({ error: "The image service returned no edited image. Please try again." }, { status: 502 });
    }
    return Response.json({ image: `data:image/png;base64,${imageData}`, text: "Your image has been edited." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image editing failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
