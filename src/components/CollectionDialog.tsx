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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collection } from '@/types/database';
import { FolderPlus, Palette } from 'lucide-react';

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
  onSave: () => void;
}

const ICON_OPTIONS = ['📁', '🎨', '💻', '📝', '🚀', '⭐', '🔥', '💡', '🎯', '📚', '🛠️', '🎪', '🌟', '💎', '🏆'];
const COLOR_OPTIONS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6b7280'];

export function CollectionDialog({ open, onOpenChange, collection, onSave }: CollectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6366f1');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!collection;

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || '');
      setIcon(collection.icon);
      setColor(collection.color);
      setIsPublic(collection.is_public);
    } else {
      setName('');
      setDescription('');
      setIcon('📁');
      setColor('#6366f1');
      setIsPublic(false);
    }
    setError(null);
  }, [collection, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Collection name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/collections/${collection.id}` : '/api/collections';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
          color,
          is_public: isPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save collection');
      }

      onSave();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-zinc-100">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            {isEditing ? 'Edit Collection' : 'Create Collection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon & Name Row */}
          <div className="flex gap-3">
            {/* Icon Selector */}
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Icon</Label>
              <div className="relative">
                <button
                  type="button"
                  className="w-12 h-12 rounded-xl text-2xl flex items-center justify-center border border-zinc-700 hover:border-zinc-600 transition-colors"
                  style={{ backgroundColor: color + '20' }}
                >
                  {icon}
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="name" className="text-zinc-400 text-xs">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Collection"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          {/* Icon Options */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs">Choose Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    icon === i 
                      ? 'bg-indigo-600 ring-2 ring-indigo-400' 
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Color Options */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs flex items-center gap-1">
              <Palette className="w-3 h-3" /> Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-400 text-xs">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this collection about?"
              rows={2}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
            />
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-zinc-200">Make Public</p>
              <p className="text-xs text-zinc-500">Others can view this collection</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`w-11 h-6 rounded-full transition-colors ${
                isPublic ? 'bg-indigo-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 p-2 rounded">{error}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

