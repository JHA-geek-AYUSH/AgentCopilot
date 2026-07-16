"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandInput } from "@/components/command-input";
import { cn } from "@/lib/utils";

const layers = [
  {
    title: "Interface Layer",
    description: "Intent capture, prompts, and agent handoffs.",
    label: "Connect agents from anywhere",
    icon: Network,
  },
  {
    title: "Model Router",
    description: "Route work across tools, apps, and LLMs.",
    label: "Run on any LLM",
    icon: Zap,
  },
  {
    title: "Simulation Engine",
    description: "Preview outcomes before actions execute.",
    label: "Simulation Engine",
    icon: BrainCircuit,
  },
  {
    title: "Memory Graph",
    description: "Persistent context with scoped recall.",
    label: "Persistent Memory",
    icon: Layers3,
  },
  {
    title: "Guard Layer",
    description: "Checks every output before it reaches a user.",
    label: "Hallucination and PII Guard",
    icon: ShieldCheck,
  },
  {
    title: "Execution Plane",
    description: "Runs tasks across apps with clear observability.",
    label: "Cross-App Execution",
    icon: TerminalSquare,
  },
];

const featureCards = [
  {
    title: "Persistent Memory",
    description: "Every task can inherit the right context, preferences, and working history without leaking what should stay scoped.",
    stat: "24k",
    meta: "recall vectors",
  },
  {
    title: "Cross-App Execution",
    description: "Compose app actions, file work, API calls, and developer workflows from one agent command surface.",
    stat: "36",
    meta: "tool routes",
  },
  {
    title: "Developer Control",
    description: "Inspect plans, approve risky steps, and keep the agent operating inside predictable execution rails.",
    stat: "100%",
    meta: "reviewable",
  },
];

function LogoMark() {
  return (
    <div className="relative size-9 rounded-xl border border-white/15 bg-white text-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.16)]">
      <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-zinc-950" />
      <div className="absolute left-2 top-2 size-2 rounded-full bg-zinc-950" />
      <div className="absolute bottom-2 right-2 size-2 rounded-full bg-zinc-950" />
    </div>
  );
}

function VectorField() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_50%_34%,black,transparent_74%)]" />
      <svg className="absolute inset-x-0 top-20 h-[560px] w-full opacity-60" viewBox="0 0 1440 560" fill="none">
        <path d="M-48 404C150 178 326 466 526 250C722 38 854 302 1018 154C1136 48 1266 72 1500 214" stroke="url(#traceA)" strokeWidth="1.2" />
        <path d="M-28 298C168 178 290 194 448 310C614 430 724 420 846 286C974 146 1090 164 1238 280C1350 368 1420 354 1506 302" stroke="url(#traceB)" strokeWidth="1" strokeDasharray="8 12" />
        <path d="M94 518C314 418 452 514 630 394C810 274 904 322 1052 430C1164 512 1274 494 1416 408" stroke="url(#traceC)" strokeWidth="1" />
        <defs>
          <linearGradient id="traceA" x1="0" x2="1440" y1="0" y2="0">
            <stop stopColor="#fb7185" stopOpacity="0" />
            <stop offset="0.46" stopColor="#fb7185" />
            <stop offset="1" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="traceB" x1="0" x2="1440" y1="0" y2="0">
            <stop stopColor="#a78bfa" stopOpacity="0" />
            <stop offset="0.54" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="traceC" x1="0" x2="1440" y1="0" y2="0">
            <stop stopColor="#2dd4bf" stopOpacity="0" />
            <stop offset="0.5" stopColor="#2dd4bf" />
            <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute left-[9%] top-[23%] h-28 w-px rotate-45 bg-gradient-to-b from-transparent via-rose-300/35 to-transparent" />
      <div className="absolute right-[12%] top-[18%] h-40 w-px -rotate-45 bg-gradient-to-b from-transparent via-teal-200/30 to-transparent" />
      <div className="absolute bottom-16 left-[18%] size-1.5 rounded-full bg-rose-300/70 shadow-[0_0_22px_rgba(251,113,133,0.8)]" />
      <div className="absolute bottom-28 right-[28%] size-1 rounded-full bg-teal-200/70 shadow-[0_0_22px_rgba(45,212,191,0.8)]" />
      <div className="absolute left-1/2 top-20 h-[640px] w-[640px] -translate-x-1/2 rounded-full border border-white/[0.04]" />
      <div className="absolute left-1/2 top-40 h-[420px] w-[420px] -translate-x-1/2 rounded-full border border-rose-300/[0.06]" />
    </div>
  );
}

function LayerStack({
  activeLayer,
  onSelect,
}: {
  activeLayer: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative mx-auto flex flex-col lg:flex-row min-h-[640px] lg:min-h-[720px] w-full max-w-[760px] items-center justify-center">
      {/* Wrapper to scale down the actual stack on smaller screens to prevent visual overflow */}
      <div className="relative flex items-center justify-center w-full min-h-[460px] lg:min-h-[520px] scale-[0.8] min-[400px]:scale-[0.85] min-[480px]:scale-90 sm:scale-100 transition-transform origin-center">
        <div className="absolute left-1/2 top-16 h-[460px] lg:h-[520px] w-px -translate-x-1/2 bg-gradient-to-b from-white/0 via-white/24 to-white/0" />
        <div className="absolute left-1/2 top-16 h-[460px] lg:h-[520px] w-[360px] lg:w-[400px] -translate-x-1/2 rounded-full border border-rose-300/10 blur-sm" />

        <div className="relative h-[440px] w-[360px] sm:w-[430px]">
          {layers.map((layer, index) => {
            const Icon = layer.icon;
            const isActive = activeLayer === index;
            const offset = index * 58;

            return (
              <button
                key={layer.title}
                type="button"
                onClick={() => onSelect(index)}
                className={cn(
                  "group absolute left-1/2 top-0 h-24 w-56 -translate-x-1/2 -rotate-45 rounded-[22px] border transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70 sm:h-28 sm:w-72",
                  isActive
                    ? "z-20 border-rose-200/70 bg-white shadow-[0_0_38px_rgba(251,113,133,0.38),0_24px_80px_rgba(255,255,255,0.18)] scale-[1.03]"
                    : "z-10 border-white/14 bg-white/28 shadow-[0_22px_50px_rgba(0,0,0,0.22)] backdrop-blur-md hover:border-white/32 hover:bg-white/38"
                )}
                style={{ transform: `translateX(-50%) translateY(${offset}px) rotate(-45deg)` }}
                aria-label={layer.title}
              >
                <span
                  className={cn(
                    "absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 rotate-45 items-center justify-center rounded-2xl border transition-colors",
                    isActive
                      ? "border-zinc-950/10 bg-zinc-950 text-white"
                      : "border-white/20 bg-zinc-950/35 text-white/80 group-hover:bg-zinc-950/55"
                  )}
                >
                  <Icon className="size-5" />
                </span>
              </button>
            );
          })}
        </div>

        <div className="absolute left-[calc(50%+128px)] top-[104px] z-30 hidden w-64 flex-col gap-[36px] lg:flex">
          {layers.slice(0, 4).map((layer, index) => (
            <button
              key={layer.label}
              type="button"
              onClick={() => onSelect(index)}
              className="group flex items-center gap-5 text-left"
            >
              <span className={cn("h-px w-16 transition-colors", activeLayer === index ? "bg-rose-200" : "bg-white/18")} />
              <span className={cn("text-sm font-medium transition-colors", activeLayer === index ? "text-white" : "text-white/46 group-hover:text-white/72")}>
                {layer.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer detail box: absolute on desktop, relative with top-margin on mobile */}
      <div className="relative mt-6 lg:mt-0 lg:absolute lg:bottom-0 lg:right-2 z-40 w-full max-w-md rounded-[28px] border border-white/10 bg-zinc-950/72 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
        <div className="mb-4 flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-rose-300">
          <span className="h-4 w-1 rounded-full bg-rose-300" />
          Layer {String(activeLayer + 1).padStart(2, "0")}
        </div>
        <h3 className="text-2xl font-sans font-semibold tracking-normal text-white">{layers[activeLayer].title}</h3>
        <p className="mt-3 text-sm leading-6 text-zinc-300">{layers[activeLayer].description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Live detection", "Scoped memory", "Action audit"].map((item) => (
            <span key={item} className="rounded-full border border-rose-200/20 bg-rose-200/8 px-3 py-1.5 text-xs font-medium text-rose-100">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignalStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ["Agent runtime", "Online"],
        ["Memory graph", "Synced"],
        ["Tool bridge", "Ready"],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
            <span className="size-2 rounded-full bg-teal-300 shadow-[0_0_16px_rgba(45,212,191,0.7)]" />
            {label}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}

function FeaturePanel({
  title,
  description,
  stat,
  meta,
}: {
  title: string;
  description: string;
  stat: string;
  meta: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-200/70 to-transparent" />
      <div className="flex items-start justify-between gap-5">
        <div>
          <h3 className="text-lg font-semibold tracking-normal text-white">{title}</h3>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{description}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-semibold text-teal-200">{stat}</div>
          <div className="mt-1 text-[0.68rem] uppercase tracking-[0.2em] text-zinc-500">{meta}</div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeLayer, setActiveLayer] = useState(4);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const interval = window.setInterval(() => {
      if (!mountedRef.current) return;
      setActiveLayer((current) => (current + 1) % layers.length);
    }, 2600);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, []);

  const installCommand = "bun install agentos";

  return (
    <main className="min-h-screen overflow-hidden bg-[#080706] text-white">
      <section id="platform" className="relative min-h-screen border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_38%,rgba(251,113,133,0.18),transparent_34%),radial-gradient(circle_at_72%_34%,rgba(45,212,191,0.12),transparent_30%),radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.06),transparent_45%),linear-gradient(115deg,#080706_0%,#171014_46%,#0b0b0d_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,6,0.92)_0%,rgba(8,7,6,0.42)_42%,rgba(8,7,6,0.84)_100%)]" />
        <VectorField />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8 lg:px-10">
          <header className="flex h-20 items-center justify-between border-b border-white/[0.06]">
            <Link href="/" className="flex items-center gap-3">
              <LogoMark />
              <span className="text-xl font-semibold tracking-normal">agentos</span>
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-400 md:flex" />

            <div className="flex items-center gap-3">
              <Link href="/chat" className="hidden rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:text-white sm:inline-flex">
                Agent Studio
              </Link>
              <Link href="/chat">
                <Button className="h-9 rounded-full bg-rose-200 px-5 text-sm font-semibold text-zinc-950 hover:bg-rose-100">
                  Launch
                </Button>
              </Link>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:py-8">
            <div className="max-w-2xl">


              <div className="mb-5 flex items-center gap-3 text-[0.74rem] font-bold uppercase tracking-[0.34em] text-rose-300">
                <Sparkles className="size-4" />
                Personal AI Agent Platform
              </div>

              <h1 className="max-w-3xl text-5xl font-sans font-semibold leading-[0.98] tracking-[-0.015em] text-white sm:text-6xl lg:text-7xl animate-fade-in">
                Take your agent OS to production, faster.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-300">
                AgentOS turns commands into observable work across apps, memory, tools, and developer environments with layered control from prompt to execution.
              </p>

              <div className="mt-9 max-w-2xl">
                <CommandInput
                  placeholder="Ask AgentOS to plan, code, search, or automate..."
                  onSubmit={(value) => console.log("Command:", value)}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/chat">
                  <Button className="h-12 rounded-full bg-rose-200 px-7 text-base font-semibold text-zinc-950 hover:bg-rose-100">
                    Start building
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(installCommand);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 1800);
                    } catch (error) {
                      console.error("Failed to copy install command:", error);
                    }
                  }}
                  className="flex h-12 items-center justify-between gap-5 rounded-full border border-white/10 bg-white/[0.045] px-5 font-mono text-sm text-zinc-300 transition-colors hover:border-white/24 hover:text-white"
                >
                  <span>{installCommand}</span>
                  {copied ? <ClipboardCheck className="size-4 text-teal-200" /> : <Copy className="size-4" />}
                </button>
              </div>

              <div className="mt-8">
                <SignalStrip />
              </div>
            </div>

            <LayerStack activeLayer={activeLayer} onSelect={setActiveLayer} />
          </div>
        </div>
      </section>

      <section id="features" className="relative bg-[#0b0b0d] px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="text-[0.74rem] font-bold uppercase tracking-[0.32em] text-teal-200">Vector Workspace</div>
            <h2 className="mt-4 text-3xl font-sans font-semibold tracking-normal text-white sm:text-4xl">
              Built as layers, not black boxes.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
              The interface now surfaces the agent stack as inspectable elements, so the product feels active, technical, and ready for real work.
            </p>
          </div>

          <div className="grid gap-4">
            {featureCards.map((feature) => (
              <FeaturePanel key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#080706] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-semibold text-zinc-200">AgentOS</span>
          </div>
          <div className="flex flex-wrap gap-4">
            {["Memory", "Tools", "Dev", "Agent"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="size-3.5 text-teal-200" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
