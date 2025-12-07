'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Prompt, PromptVersion } from '@/types/database';
import { Star, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: Prompt | null;
}

export function VersionHistoryDialog({
  open,
  onOpenChange,
  prompt,
}: VersionHistoryDialogProps) {
  if (!prompt) return null;

  const versions = prompt.versions || [];

  const renderStars = (score: number | null) => {
    if (!score) return <span className="text-zinc-500 text-sm">Not rated</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= Math.ceil(score / 2)
                ? 'fill-amber-400 text-amber-400'
                : 'text-zinc-600'
            }`}
          />
        ))}
        <span className="ml-1 text-xs text-zinc-500">{score}/10</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Version History: {prompt.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {versions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No version history available</p>
            ) : (
              versions.map((version: PromptVersion, index: number) => (
                <div key={version.id}>
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
                    {/* Version Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={index === 0 ? "default" : "outline"}
                          className={index === 0 
                            ? "bg-indigo-600 text-white" 
                            : "border-zinc-700 text-zinc-400"
                          }
                        >
                          v{version.version_number}
                          {index === 0 && " (current)"}
                        </Badge>
                        {renderStars(version.effectiveness_score)}
                      </div>
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Change Notes */}
                    {version.change_notes && (
                      <p className="text-sm text-zinc-400 italic">
                        "{version.change_notes}"
                      </p>
                    )}

                    {/* Content Preview */}
                    <div className="bg-zinc-900 rounded p-3 font-mono text-sm text-zinc-300 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {version.content}
                    </div>
                  </div>

                  {index < versions.length - 1 && (
                    <div className="flex items-center gap-2 py-2">
                      <Separator className="flex-1 bg-zinc-800" />
                      <span className="text-xs text-zinc-600">
                        ↑ Updated
                      </span>
                      <Separator className="flex-1 bg-zinc-800" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

