'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Play,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublishPanel } from './publish-panel';
import type { Agent } from '@/lib/agents/types';

export interface MyAgentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bump to force a reload (e.g. after saving / importing an agent). */
  refreshKey?: number;
}

export function MyAgentsDrawer({
  open,
  onOpenChange,
  refreshKey = 0,
}: MyAgentsDrawerProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (res.ok) setAgents(data.agents ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, refreshKey, load]);

  const patchAgent = (updated: Agent) =>
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

  const runAgent = async (id: string) => {
    setRunningId(id);
    setRunResults((prev) => ({ ...prev, [id]: '' }));
    try {
      const res = await fetch(`/api/agents/${id}/run`, { method: 'POST' });
      const data = await res.json();
      setRunResults((prev) => ({
        ...prev,
        [id]: res.ok
          ? data.result || `Run ${data.status}`
          : data.error || 'Run failed',
      }));
    } catch (e) {
      setRunResults((prev) => ({
        ...prev,
        [id]: e instanceof Error ? e.message : 'Run failed',
      }));
    } finally {
      setRunningId(null);
    }
  };

  const deleteAgent = async (id: string) => {
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    if (res.ok) setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="size-4" /> My Agents
            <Badge variant="secondary" className="ml-auto">
              {agents.length}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Saved agents you can run, publish to NANDA, or delete.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {!loading && agents.length === 0 && (
            <div className="text-center py-12">
              <div className="size-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                <Inbox className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No saved agents yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure a task and choose “Save as Agent”.
              </p>
            </div>
          )}

          {agents.map((agent) => {
            const expanded = expandedId === agent.id;
            return (
              <div
                key={agent.id}
                className="rounded-xl border border-border/50 bg-card/60"
              >
                <button
                  className="flex w-full items-start gap-2 p-3 text-left"
                  onClick={() => setExpandedId(expanded ? null : agent.id)}
                >
                  {expanded ? (
                    <ChevronDown className="size-4 mt-0.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 mt-0.5 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {agent.name}
                      </span>
                      {agent.nandaStatus === 'published' && (
                        <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          published
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {agent.description || agent.taskTemplate}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <code className="text-[10px] text-muted-foreground">
                        {agent.slug}
                      </code>
                      {agent.requiredApps.slice(0, 3).map((app) => (
                        <Badge
                          key={app}
                          variant="outline"
                          className="text-[9px] px-1 py-0"
                        >
                          {app}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="space-y-3 border-t border-border/50 p-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => runAgent(agent.id)}
                        disabled={runningId === agent.id}
                      >
                        {runningId === agent.id ? (
                          <Loader2 className="size-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="size-4 mr-2" />
                        )}
                        Run
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteAgent(agent.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {runResults[agent.id] && (
                      <div className="rounded-lg bg-muted/40 p-2.5 text-xs whitespace-pre-wrap max-h-40 overflow-auto">
                        {runResults[agent.id]}
                      </div>
                    )}

                    <PublishPanel agent={agent} onChange={patchAgent} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
