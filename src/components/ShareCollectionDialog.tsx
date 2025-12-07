'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collection } from '@/types/database';
import { Link2, Copy, Check, Globe, Lock, Loader2 } from 'lucide-react';

interface ShareCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: Collection | null;
  onUpdate: () => void;
}

export function ShareCollectionDialog({ 
  open, 
  onOpenChange, 
  collection,
  onUpdate 
}: ShareCollectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isShared = collection?.is_public && collection?.share_token;

  useEffect(() => {
    if (collection?.share_token) {
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/share/${collection.share_token}`);
    } else {
      setShareUrl(null);
    }
  }, [collection]);

  const handleEnableSharing = async () => {
    if (!collection) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/collections/${collection.id}/share`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to enable sharing');
      }

      const data = await res.json();
      setShareUrl(data.shareUrl);
      onUpdate();
    } catch (err) {
      setError('Failed to enable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableSharing = async () => {
    if (!collection) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/collections/${collection.id}/share`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to disable sharing');
      }

      setShareUrl(null);
      onUpdate();
    } catch (err) {
      setError('Failed to disable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!collection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#232339] border-[#3f3f5a] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <Link2 className="w-5 h-5 text-indigo-400" />
            Share Collection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Collection Info */}
          <div className="flex items-center gap-3 p-3 bg-[#1a1a2e] rounded-lg">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: collection.color + '30' }}
            >
              {collection.icon}
            </div>
            <div>
              <h3 className="font-medium text-zinc-100">{collection.name}</h3>
              <p className="text-xs text-zinc-500">
                {collection.prompt_count || 0} prompts
              </p>
            </div>
          </div>

          {/* Share Status */}
          <div className="space-y-3">
            {isShared ? (
              <>
                {/* Share URL */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <Globe className="w-4 h-4" />
                    <span>Public link enabled</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl || ''}
                      readOnly
                      className="bg-[#1a1a2e] border-[#3f3f5a] text-zinc-300 text-sm"
                    />
                    <Button
                      onClick={handleCopy}
                      className={`shrink-0 ${
                        copied 
                          ? 'bg-emerald-600 hover:bg-emerald-600' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <p className="text-xs text-zinc-500">
                  Anyone with this link can view and copy prompts from this collection.
                </p>

                {/* Disable Button */}
                <Button
                  onClick={handleDisableSharing}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-red-900 text-red-400 hover:bg-red-950 hover:text-red-300"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 mr-2" />
                  )}
                  Disable Sharing
                </Button>
              </>
            ) : (
              <>
                {/* Not shared yet */}
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-zinc-500" />
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">
                    This collection is private. Enable sharing to create a public link.
                  </p>
                  
                  <Button
                    onClick={handleEnableSharing}
                    disabled={loading}
                    className="btn-primary-gradient w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating link...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Enable Public Sharing
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 p-2 rounded">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

