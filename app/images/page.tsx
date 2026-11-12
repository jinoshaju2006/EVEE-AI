"use client";

import { useState } from "react";
import { ArrowLeft, Download, Image as ImageIcon, LoaderCircle, Sparkles, WandSparkles } from "lucide-react";

const ratios = ["1:1", "4:5", "5:4", "3:2", "2:3", "3:4", "4:3", "9:16", "16:9", "21:9"];

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    setImage("");
    setDescription("");
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), aspectRatio })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Image generation failed.");
      if (!result.image) throw new Error("The image provider returned no image. Please try again.");
      setImage(result.image);
      setDescription(result.text || "Your image is ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 md:px-8" style={{ background: "radial-gradient(ellipse at 50% -15%, #34205b55 0%, transparent 45%), #090b12" }}>
      <div className="mx-auto max-w-5xl">
        <a href="/" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><ArrowLeft size={16}/> Back to EVEE AI</a>
        <div className="mt-8 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/20"><ImageIcon size={21}/></div>
          <div><p className="text-[10px] font-semibold tracking-[.24em] text-violet-300">EVEE AI WORKSPACE</p><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Image Studio</h1></div>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Turn a description into original artwork. Describe the image you want, choose a format and generate.</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.9fr)]">
          <section className="glass glow rounded-2xl p-4 md:p-6">
            <label htmlFor="image-prompt" className="text-sm font-medium">Describe your image</label>
            <textarea id="image-prompt" value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={2048} rows={7} placeholder="A cinematic photograph of a dark metallic sports car on a rain-soaked city street at night, dramatic reflections, premium automotive advertising..." className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-[#090b12]/80 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"/>
            <div className="mt-1 text-right text-[10px] text-slate-600">{prompt.length}/2048</div>

            <div className="mt-5">
              <label className="text-sm font-medium">Aspect ratio</label>
              <div className="mt-2 flex flex-wrap gap-2">{ratios.map(ratio => <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} className={`rounded-lg border px-3 py-2 text-xs transition ${aspectRatio === ratio ? "border-violet-400/60 bg-violet-500/20 text-violet-100" : "border-white/10 bg-white/[.03] text-slate-400 hover:bg-white/[.07]"}`}>{ratio}</button>)}</div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[.03] p-3">
              <p className="text-xs font-medium text-slate-300">Generation model</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">FLUX.1 Schnell · Standard output size. Aspect ratio is guided through your prompt.</p>
            </div>

            <button type="button" onClick={generate} disabled={!prompt.trim() || busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <><LoaderCircle size={17} className="animate-spin"/> Generating image…</> : <><WandSparkles size={17}/> Generate image</>}</button>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">{error}</p>}
          </section>

          <section className="glass flex min-h-[420px] flex-col rounded-2xl p-4 md:p-6">
            <div className="flex items-center justify-between"><h2 className="text-sm font-medium">Your creation</h2><span className="text-[10px] text-slate-500">Preview</span></div>
            <div className="mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-[#090b12]/65 p-3">
              {image ? <div className="relative inline-block max-w-full"><img src={image} alt="AI-generated artwork" className="max-h-[650px] max-w-full rounded-lg object-contain"/><img src="/evee-ai-watermark.svg" alt="EVEE AI watermark" aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 w-[16%] min-w-[54px] max-w-[100px] opacity-35 drop-shadow-[0_1px_5px_rgba(0,0,0,.8)]"/></div> : busy ? <div className="text-center"><LoaderCircle size={30} className="mx-auto animate-spin text-violet-300"/><p className="mt-3 text-sm text-slate-300">Creating your image</p><p className="mt-1 text-xs text-slate-600">This can take a little while.</p></div> : <div className="max-w-xs text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Sparkles size={24}/></div><p className="mt-4 text-sm font-medium text-slate-300">Your image will appear here</p><p className="mt-2 text-xs leading-5 text-slate-600">Enter a prompt and select Generate image to get started.</p></div>}
            </div>
            {image && <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 flex-1 text-xs text-slate-400">{description}</p><a href={image} download={`evee-ai-image-${Date.now()}.png`} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"><Download size={14}/> Save image</a></div>}
          </section>
        </div>
        <p className="mt-8 text-center text-[10px] tracking-wide text-slate-700">EVEE AI · YOUR INTELLIGENCE. WITHOUT LIMITS. · BY EVO</p>
      </div>
    </main>
  );
}
