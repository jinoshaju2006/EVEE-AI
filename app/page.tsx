"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUp, Bot, Check, ChevronDown, Command, Copy, Menu, MessageSquarePlus, PanelLeftClose, Plus, Search, Settings2, Sparkles, Square, WandSparkles, X } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; id: string };
const starterPrompts = [
  { icon: "✦", title: "Learn something new", text: "Explain a complex topic in simple terms with examples." },
  { icon: "⌘", title: "Write or create", text: "Help me write something clear, engaging and professional." },
  { icon: "⌁", title: "Build with code", text: "Help me plan and build a modern web application." },
  { icon: "◎", title: "Think it through", text: "Help me analyse a problem and find practical solutions." }
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState<"gemini" | "openai">("gemini");
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [copied, setCopied] = useState("");
  const [history, setHistory] = useState<{ id: string; title: string; messages: Message[] }[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => {
    try { const saved = localStorage.getItem("evee-local-chats"); if (saved) setHistory(JSON.parse(saved)); } catch {}
  }, []);

  function saveConversation(next: Message[]) {
    if (!next.length) return;
    const id = next[0].id;
    const item = { id, title: next.find(m => m.role === "user")?.content.slice(0, 48) || "New chat", messages: next };
    setHistory(old => {
      const updated = [item, ...old.filter(c => c.id !== id)].slice(0, 30);
      try { localStorage.setItem("evee-local-chats", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function newChat() { aborter.current?.abort(); setMessages([]); setInput(""); setBusy(false); }
  function openChat(id: string) { const item = history.find(c => c.id === id); if (item) setMessages(item.messages); setSidebar(false); }

  async function send(text = input) {
    const value = text.trim();
    if (!value || busy) return;
    const user: Message = { role: "user", content: value, id: crypto.randomUUID() };
    const next = [...messages, user];
    const assistant: Message = { role: "assistant", content: "", id: crypto.randomUUID() };
    setMessages([...next, assistant]); setInput(""); setBusy(true);
    const controller = new AbortController(); aborter.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), provider }),
        signal: controller.signal
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed." }));
        throw new Error(err.error || "AI request failed.");
      }
      if (!response.body) throw new Error("Streaming is not supported by this response.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let result = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        result += decoder.decode(chunk, { stream: true });
        setMessages(current => current.map(m => m.id === assistant.id ? { ...m, content: result } : m));
      }
      const completed = [...next, { ...assistant, content: result }];
      setMessages(completed); saveConversation(completed);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        const errorMessage = (e as Error).message || "Something went wrong.";
        setMessages(current => current.map(m => m.id === assistant.id ? { ...m, content: `⚠️ ${errorMessage}` } : m));
      }
    } finally { setBusy(false); aborter.current = null; }
  }

  function stop() { aborter.current?.abort(); setBusy(false); }
  async function copy(id: string, content: string) { await navigator.clipboard.writeText(content); setCopied(id); setTimeout(() => setCopied(""), 1500); }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: "radial-gradient(ellipse at 65% -15%, #34205b55 0%, transparent 45%), #090b12" }}>
      {sidebar && <button aria-label="Close menu" onClick={() => setSidebar(false)} className="fixed inset-0 z-30 bg-black/60 md:hidden" />}
      <aside className={`glass fixed md:relative z-40 md:z-10 inset-y-0 left-0 w-[278px] flex flex-col p-4 border-y-0 border-l-0 transition-transform duration-300 ${sidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl grid place-items-center bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/20"><Sparkles size={19}/></div><div><div className="font-bold tracking-[.16em] text-[15px]">EVEE <span className="text-violet-300">AI</span></div><div className="text-[9px] tracking-[.22em] text-slate-500">BY EVO</div></div></div>
          <button onClick={() => setSidebar(false)} className="md:hidden text-slate-400"><X size={18}/></button>
        </div>
        <button onClick={newChat} className="mt-7 flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-violet-950/40 hover:brightness-110"><Plus size={17}/> New chat <span className="ml-auto text-xs opacity-60">⌘ K</span></button>
        <div className="mt-7 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Workspace</div>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"><Search size={16}/> Search chats</button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"><WandSparkles size={16}/> Explore</button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"><Settings2 size={16}/> Settings <span className="ml-auto text-[10px] text-slate-600">SOON</span></button>
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Recent conversations</div>
          {history.map(chat => <button key={chat.id} onClick={() => openChat(chat.id)} className="w-full truncate rounded-lg px-3 py-2.5 text-left text-xs text-slate-400 hover:bg-white/5 hover:text-white"><MessageSquarePlus size={14} className="mr-2 inline-block"/>{chat.title}</button>)}
          {!history.length && <p className="px-3 py-2 text-xs text-slate-600">Your chats will appear here.</p>}
        </div>
        <div className="glass rounded-xl p-3"><div className="flex items-center gap-2 text-xs font-semibold"><div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"/> EVEE systems</div><p className="mt-1 text-[10px] text-slate-500">Connect an AI provider to start chatting.</p></div>
        <div className="mt-3 flex items-center gap-3 rounded-xl p-2"><div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-blue-500 text-xs font-bold">E</div><div><div className="text-xs font-medium">EVO user</div><div className="text-[10px] text-slate-500">Local preview</div></div><PanelLeftClose size={16} className="ml-auto text-slate-600"/></div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex h-[68px] items-center justify-between border-x-0 border-t-0 px-4 md:px-7">
          <div className="flex items-center gap-3"><button onClick={() => setSidebar(true)} className="text-slate-400 md:hidden"><Menu size={20}/></button><div className="text-sm font-semibold">EVEE <span className="text-violet-300">AI</span></div><span className="hidden sm:block text-xs text-slate-600">/</span><span className="hidden sm:block text-xs text-slate-400">Workspace</span></div>
          <div className="flex items-center gap-2"><div className="relative"><select aria-label="AI provider" value={provider} onChange={e => setProvider(e.target.value as "gemini" | "openai")} className="glass appearance-none rounded-lg py-2 pl-3 pr-8 text-xs text-slate-300 outline-none"><option value="gemini">Gemini</option><option value="openai">OpenAI compatible</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-500"/></div><div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/5 px-3 py-2 text-[10px] text-slate-500"><Command size={12}/> Private preview</div></div>
        </header>

        <section className="flex-1 overflow-y-auto px-4 pb-40 pt-8 md:px-8">
          <div className="mx-auto max-w-[820px]">
            {messages.length === 0 ? <div className="flex min-h-[60vh] flex-col justify-center">
              <div className="mb-7 flex items-center gap-2"><div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 grid place-items-center"><Sparkles size={16}/></div><span className="text-xs font-semibold tracking-[.2em] text-violet-200">A NEW KIND OF INTELLIGENCE</span></div>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.13] tracking-tight md:text-6xl">Your ideas deserve<br/><span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">more intelligence.</span></h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400 md:text-base">Meet EVEE AI. Think clearly, create boldly and turn ambitious ideas into reality.</p>
              <div className="mt-12 grid gap-3 sm:grid-cols-2">{starterPrompts.map(p => <button key={p.title} onClick={() => setInput(p.text)} className="glass glow rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30"><div className="mb-3 text-lg text-violet-300">{p.icon}</div><div className="text-sm font-medium">{p.title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{p.text}</div></button>)}</div>
            </div> : <div className="space-y-8 pt-5">{messages.map(m => <article key={m.id} className={m.role === "user" ? "flex justify-end" : "flex gap-3 md:gap-4"}>
              {m.role === "assistant" && <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500"><Bot size={17}/></div>}
              <div className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-md border border-violet-400/15 bg-violet-500/15 px-4 py-3 text-sm leading-7" : "min-w-0 flex-1 pt-1"}>
                {m.role === "assistant" ? <><div className="markdown text-sm text-slate-200"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || (busy ? " " : "")}</ReactMarkdown>{!m.content && busy && <span className="inline-block h-4 w-1 animate-pulse bg-violet-300"/>}</div>{m.content && <div className="mt-3 flex gap-2"><button onClick={() => copy(m.id, m.content)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-slate-500 hover:bg-white/5 hover:text-slate-200">{copied === m.id ? <Check size={13}/> : <Copy size={13}/>} {copied === m.id ? "Copied" : "Copy"}</button></div>}</> : m.content}
              </div>
            </article>)}</div>}
            <div ref={bottom}/>
          </div>
        </section>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090b12] via-[#090b12f5] to-transparent px-4 pb-5 pt-12 md:px-8">
          <div className="mx-auto max-w-[820px]">
            <div className="glass glow rounded-[22px] p-3">
              <textarea ref={textarea} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message EVEE AI..." rows={2} className="max-h-40 min-h-[54px] w-full resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600"/>
              <div className="flex items-center justify-between px-1 pt-1"><div className="flex items-center gap-2 text-[10px] text-slate-600"><Sparkles size={13} className="text-violet-400"/> AI can make mistakes. Verify important information.</div><div className="flex items-center gap-2">{busy ? <button onClick={stop} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20" aria-label="Stop generating"><Square size={14}/></button> : <button onClick={() => send()} disabled={!input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-950/40 transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send message"><ArrowUp size={18}/></button>}</div></div>
            </div>
            <p className="mt-3 text-center text-[10px] tracking-wide text-slate-700">EVEE AI · YOUR INTELLIGENCE. WITHOUT LIMITS. · BY EVO</p>
          </div>
        </div>
      </main>
    </div>
  );
}