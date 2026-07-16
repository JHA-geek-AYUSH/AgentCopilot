'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ListTodo,
  Brain,
  Code2,
  User,
  Settings,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

const navItems = [
  {
    label: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
  },
  {
    label: 'Agent',
    href: '/agent',
    icon: Bot,
  },
  {
    label: 'Memory',
    href: '/memory',
    icon: Brain,
  },
  {
    label: 'Dev',
    href: '/dev',
    icon: Code2,
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 bottom-0 w-20 z-40 flex flex-col border-r border-white/10 bg-[#08090a]/92 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex flex-col items-center py-6 gap-2">
          <Link href="/">
            <div className="relative size-10 rounded-xl border border-white/15 bg-white text-zinc-950 shadow-[0_0_28px_rgba(255,255,255,0.12)] cursor-pointer hover:scale-105 transition-transform duration-200" title="Go to home">
              <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-zinc-950" />
              <div className="absolute left-2.5 top-2.5 size-1.5 rounded-full bg-zinc-950" />
              <div className="absolute bottom-2.5 right-2.5 size-1.5 rounded-full bg-zinc-950" />
            </div>
          </Link>
        </div>

        <Separator className="mx-auto w-12 bg-white/10" />

        <nav className="flex-1 flex flex-col items-center py-6 gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'icon' }),
                        'size-12 rounded-xl transition-all duration-200 flex items-center justify-center',
                        isActive
                          ? 'bg-teal-300/10 text-teal-200 ring-1 ring-teal-200/20 hover:bg-teal-300/15'
                          : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                      )}
                    />
                  }
                >
                  <Icon className="size-5" />
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>
                  <p className="text-sm font-medium">{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="flex flex-col items-center py-6 gap-2 border-t border-white/10">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/profile"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-12 rounded-xl text-zinc-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center'
                  )}
                />
              }
            >
              <Settings className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              <p className="text-sm font-medium">Settings</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
