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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Prompt, Category, Tag, Collection, Source, SOURCE_INFO } from '@/types/database';
import { Star, X, Plus, Folder } from 'lucide-react';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: Prompt | null;
  categories: Category[];
  collections: Collection[];
  existingTags: Tag[];
  onSave: (data: {
    title: string;
    content: string;
    source: Source;
    category_id?: string;
    collection_id?: string;
    effectiveness_score?: number;
    tags?: string[];
    is_favorite?: boolean;
    change_notes?: string;
  }) => void;
}

export function PromptDialog({
  open,
  onOpenChange,
  prompt,
  categories,
  collections,
  existingTags,
  onSave,
}: PromptDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState<Source>('chatgpt');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [collectionId, setCollectionId] = useState<string>('none');
  const [effectivenessScore, setEffectivenessScore] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [changeNotes, setChangeNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!prompt;

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setContent(prompt.content);
      setSource(prompt.source);
      setCategoryId(prompt.category_id || 'none');
      setCollectionId(prompt.collection_id || 'none');
      setEffectivenessScore(prompt.effectiveness_score || 0);
      setSelectedTags(prompt.tags?.map(t => t.name) || []);
      setIsFavorite(prompt.is_favorite);
      setChangeNotes('');
    } else {
      setTitle('');
      setContent('');
      setSource('chatgpt');
      setCategoryId('none');
      setCollectionId('none');
      setEffectivenessScore(0);
      setSelectedTags([]);
      setIsFavorite(false);
      setChangeNotes('');
    }
  }, [prompt, open]);

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        source,
        category_id: categoryId === 'none' ? undefined : categoryId,
        collection_id: collectionId === 'none' ? undefined : collectionId,
        effectiveness_score: effectivenessScore || undefined,
        tags: selectedTags,
        is_favorite: isFavorite,
        change_notes: isEditing ? changeNotes : undefined,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-zinc-100">
            {isEditing ? 'Edit Prompt' : 'Add New Prompt'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your prompt a memorable name..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-zinc-300">Prompt Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your prompt here..."
              className="min-h-[200px] bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm"
              required
            />
          </div>

          {/* Source & Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as Source)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {Object.entries(SOURCE_INFO).map(([key, info]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {info.icon} {info.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="none" className="text-zinc-500">
                    No category
                  </SelectItem>
                  {categories.map((cat) => (
                    <SelectItem 
                      key={cat.id} 
                      value={cat.id}
                      className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                    >
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collection */}
          <div className="space-y-2">
            <Label className="text-zinc-300 flex items-center gap-2">
              <Folder className="w-4 h-4" /> Collection
            </Label>
            <Select value={collectionId} onValueChange={setCollectionId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Add to collection..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="none" className="text-zinc-500">
                  No collection
                </SelectItem>
                {collections.map((coll) => (
                  <SelectItem 
                    key={coll.id} 
                    value={coll.id}
                    className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
                  >
                    {coll.icon} {coll.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Effectiveness Score */}
          <div className="space-y-2">
            <Label className="text-zinc-300">
              Effectiveness Score: {effectivenessScore || 'Not rated'}
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setEffectivenessScore(score === effectivenessScore ? 0 : score)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      score <= effectivenessScore
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-600 hover:text-zinc-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedTags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  #{tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddTag}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {/* Existing tags suggestions */}
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {existingTags
                  .filter(t => !selectedTags.includes(t.name))
                  .slice(0, 10)
                  .map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs cursor-pointer border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                      onClick={() => setSelectedTags([...selectedTags, tag.name])}
                    >
                      #{tag.name}
                    </Badge>
                  ))}
              </div>
            )}
          </div>

          {/* Change Notes (only for editing) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="changeNotes" className="text-zinc-300">
                Change Notes (for version history)
              </Label>
              <Input
                id="changeNotes"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="What did you change?"
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          )}

          {/* Favorite Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors"
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>{isFavorite ? 'Favorited' : 'Add to favorites'}</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
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
              disabled={saving || !title.trim() || !content.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Prompt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

