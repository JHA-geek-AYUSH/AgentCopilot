'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  UploadCloud,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent, NandaStatus } from '@/lib/agents/types';

const STATUS_STYLE: Record<NandaStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  publishing: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  published: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  unpublished: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

interface PublishLinks {
  locator: string;
  cardUrl: string;
  directoryUrl: string;
}

function deriveLinks(agent: Agent): PublishLinks | null {
  if (!agent.nandaRegistryUrl || !agent.slug) return null;
  let domain = 'agentos.app';
  try {
    domain = new URL(agent.nandaRegistryUrl).hostname;
  } catch {
    /* keep default */
  }
  return {
    locator: `urn:ai:domain:${domain}:agent:${agent.slug}`,
    cardUrl: `${agent.nandaRegistryUrl}/agents/${agent.slug}/card`,
    directoryUrl: `${agent.nandaRegistryUrl}/agents/${agent.slug}`,
  };
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-muted/50 px-2 py-1 text-xs">
          {value}
        </code>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export interface PublishPanelProps {
  agent: Agent;
  onChange: (agent: Agent) => void;
}

export function PublishPanel({ agent, onChange }: PublishPanelProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [links, setLinks] = useState<PublishLinks | null>(deriveLinks(agent));
  const [choice, setChoice] = useState<'public' | 'unlisted'>(
    agent.visibility === 'unlisted' ? 'unlisted' : 'public'
  );

  const isPublished = agent.nandaStatus === 'published';

  const publish = async () => {
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: choice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Publish failed');
      onChange(data.agent as Agent);
      setLinks({
        locator: data.locator,
        cardUrl: data.cardUrl,
        directoryUrl: data.directoryUrl,
      });
      if (data.warning) setWarning(data.warning);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agent.id}/publish`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unpublish failed');
      onChange(data.agent as Agent);
      setLinks(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unpublish failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">NANDA</span>
        <Badge className={cn('text-[10px]', STATUS_STYLE[agent.nandaStatus])}>
          {agent.nandaStatus}
        </Badge>
      </div>

      {!isPublished && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChoice('public')}
              className={cn(
                'flex items-center gap-2 rounded-lg border-2 p-2 text-left text-xs transition-all',
                choice === 'public'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-primary/50'
              )}
            >
              <Globe className="size-4" />
              <span>
                Public
                <span className="block text-[10px] text-muted-foreground">
                  Listed in directory
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setChoice('unlisted')}
              className={cn(
                'flex items-center gap-2 rounded-lg border-2 p-2 text-left text-xs transition-all',
                choice === 'unlisted'
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 hover:border-primary/50'
              )}
            >
              <Eye className="size-4" />
              <span>
                Unlisted
                <span className="block text-[10px] text-muted-foreground">
                  Resolvable by link
                </span>
              </span>
            </button>
          </div>
          <Button size="sm" className="w-full" onClick={publish} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <UploadCloud className="size-4 mr-2" />
            )}
            Publish to NANDA
          </Button>
        </>
      )}

      {isPublished && links && (
        <div className="space-y-2">
          <CopyRow label="Locator" value={links.locator} />
          <CopyRow label="Card URL" value={links.cardUrl} />
          <div className="flex items-center gap-2">
            <a
              href={links.directoryUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View in directory <ExternalLink className="size-3" />
            </a>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={unpublish}
            disabled={busy}
          >
            {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
            Unpublish
          </Button>
        </div>
      )}

      {warning && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-400">
          <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
          {warning}
        </p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
