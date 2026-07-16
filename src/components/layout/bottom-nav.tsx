'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ListTodo,
  Brain,
  Code2,
  User,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="relative">
      <div className="fixed bottom-0 inset-x-0 h-16 bg-[#08090a]/88 backdrop-blur-xl border-t border-white/10 [mask-image:linear-gradient(to_top,black,transparent)]" />
      <nav className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger>
                <Link
                  href={item.href}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                    'size-12 rounded-2xl transition-all duration-200 flex items-center justify-center',
                    isActive
                      ? 'bg-teal-300/10 text-teal-200 ring-1 ring-teal-200/20'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
                  )}
                >
                  <Icon className="size-5 transition-transform duration-200" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8}>
                <p className="text-xs font-medium">{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
