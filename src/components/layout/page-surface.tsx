import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSurfaceProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  fullHeight?: boolean;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: "teal" | "rose" | "amber" | "blue" | "zinc";
  pulse?: boolean;
}

const toneClasses = {
  teal: "text-teal-200 bg-teal-300/10 border-teal-200/20",
  rose: "text-rose-200 bg-rose-300/10 border-rose-200/20",
  amber: "text-amber-200 bg-amber-300/10 border-amber-200/20",
  blue: "text-blue-200 bg-blue-300/10 border-blue-200/20",
  zinc: "text-zinc-200 bg-white/[0.045] border-white/10",
};

export function PageSurface({
  children,
  className,
  contentClassName,
  fullHeight,
}: PageSurfaceProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#08090a] text-foreground",
        fullHeight ? "h-full" : "min-h-screen",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(251,113,133,0.12),transparent_30%),radial-gradient(circle_at_84%_16%,rgba(45,212,191,0.1),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.035),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_48%_18%,black,transparent_72%)]" />
      <div className={cn("relative z-10", fullHeight ? "h-full" : "min-h-screen", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.28em] text-teal-200">
              {eyebrow}
            </div>
          )}
          <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function StatTile({ label, value, tone = "zinc", pulse }: StatTileProps) {
  return (
    <div className={cn("rounded-[8px] border px-4 py-3 backdrop-blur", toneClasses[tone])}>
      <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] opacity-75">
        <span className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-normal text-white">{value}</div>
    </div>
  );
}
