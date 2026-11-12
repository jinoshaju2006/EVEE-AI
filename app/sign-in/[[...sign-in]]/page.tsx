"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10" style={{ background: "radial-gradient(ellipse at 50% -15%, #34205b55 0%, transparent 45%), #090b12" }}>
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="text-xl font-bold tracking-[.16em]">EVEE <span className="text-violet-300">AI</span></div>
          <p className="mt-2 text-xs tracking-wide text-slate-500">YOUR INTELLIGENCE. WITHOUT LIMITS.</p>
        </div>
        <SignIn />
      </div>
    </main>
  );
}
