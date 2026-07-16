'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Lock, Eye, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Agent, RunMode, Visibility } from '@/lib/agents/types';

const SUGGESTED_APPS = [
  'gmail',
  'github',
  'slack',
  'googlecalendar',
  'notion',
  'linear',
  'twitter',
  'jira',
];

const VISIBILITY_OPTIONS: {
  value: Visibility;
  label: string;
  icon: typeof Lock;
  hint: string;
}[] = [
  { value: 'private', label: 'Private', icon: Lock, hint: 'Only you' },
  { value: 'unlisted', label: 'Unlisted', icon: Eye, hint: 'Resolvable by link' },
  { value: 'public', label: 'Public', icon: Globe, hint: 'Listed in directory' },
];

export interface SaveAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: {
    taskTemplate: string;
    runMode: RunMode;
    runConfig: Record<string, number>;
    /** Apps detected from the run, used to pre-fill requiredApps. */
    suggestedApps?: string[];
  };
  onSaved: (agent: Agent) => void;
}

export function SaveAgentDialog({
  open,
  onOpenChange,
  defaults,
  onSaved,
}: SaveAgentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [requiredApps, setRequiredApps] = useState<string[]>(
    defaults.suggestedApps ?? []
  );
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleApp = (app: string) => {
    setRequiredApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !defaults.taskTemplate.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          taskTemplate: defaults.taskTemplate,
          runMode: defaults.runMode,
          runConfig: defaults.runConfig,
          requiredApps,
          tags: tagsText
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          visibility,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save agent');
      onSaved(data.agent as Agent);
      // Reset for next time.
      setName('');
      setDescription('');
      setTagsText('');
      setRequiredApps(defaults.suggestedApps ?? []);
      setVisibility('private');
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save as Agent</DialogTitle>
          <DialogDescription>
            Persist this task as a reusable agent you can run, publish to NANDA,
            or share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input
              placeholder="e.g. Gmail Client Monitor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              placeholder="What does this agent do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[64px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Task template
            </label>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-xs text-muted-foreground line-clamp-3">
              {defaults.taskTemplate || 'No task configured yet.'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Required apps
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_APPS.map((app) => {
                const active = requiredApps.includes(app);
                return (
                  <button
                    key={app}
                    type="button"
                    onClick={() => toggleApp(app)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {app}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tags (comma separated)
            </label>
            <Input
              placeholder="email, productivity"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Visibility
            </label>
            <div className="grid grid-cols-3 gap-2">
              {VISIBILITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = visibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={cn(
                      'rounded-lg border-2 p-2.5 text-left transition-all',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-primary/50'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4 mb-1',
                        active ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <p className="text-xs font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.hint}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30">
              {error}
            </Badge>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !defaults.taskTemplate.trim()}
          >
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            Save Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
