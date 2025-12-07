'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Prompt, SOURCE_INFO } from '@/types/database';
import { 
  Star, 
  StarOff, 
  Copy, 
  MoreVertical, 
  Edit, 
  Trash2, 
  History,
  ExternalLink
} from 'lucide-react';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onViewVersions: (prompt: Prompt) => void;
}

export function PromptCard({ 
  prompt, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onViewVersions 
}: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  
  const sourceInfo = SOURCE_INFO[prompt.source] || SOURCE_INFO.other;
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    
    // Increment use count
    fetch(`/api/prompts/${prompt.id}`, { method: 'POST' }).catch(console.error);
    
    setTimeout(() => setCopied(false), 2000);
  };

  const renderStars = (score: number | null) => {
    if (!score) return null;
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
      </div>
    );
  };

  return (
    <Card className="group relative bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-200 hover:shadow-lg hover:shadow-zinc-900/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg flex-shrink-0">{sourceInfo.icon}</span>
              <h3 className="font-semibold text-zinc-100 prompt-card-title flex-1 min-w-0">
                {prompt.title}
              </h3>
              {prompt.is_favorite && (
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Badge 
                variant="outline" 
                className="border-zinc-700 text-zinc-400"
                style={{ borderColor: sourceInfo.color + '40', color: sourceInfo.color }}
              >
                {sourceInfo.label}
              </Badge>
              {prompt.category && (
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                  {prompt.category.icon} {prompt.category.name}
                </Badge>
              )}
              <span className="text-zinc-600">v{prompt.current_version}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
              <DropdownMenuItem 
                onClick={() => onEdit(prompt)}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onToggleFavorite(prompt.id, !prompt.is_favorite)}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
              >
                {prompt.is_favorite ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onViewVersions(prompt)}
                className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100"
              >
                <History className="mr-2 h-4 w-4" />
                Version history
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(prompt.id)}
                className="text-red-400 focus:bg-red-950 focus:text-red-300"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 overflow-hidden">
        <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed break-words">
          {prompt.content}
        </p>
        
        {/* Tags */}
        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {prompt.tags.slice(0, 4).map((tag) => (
              <Badge 
                key={tag.id} 
                variant="outline"
                className="text-xs px-2 py-0 border-zinc-700 text-zinc-500 hover:border-zinc-600 truncate max-w-[120px]"
              >
                #{tag.name}
              </Badge>
            ))}
            {prompt.tags.length > 4 && (
              <Badge 
                variant="outline"
                className="text-xs px-2 py-0 border-zinc-700 text-zinc-500"
              >
                +{prompt.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {renderStars(prompt.effectiveness_score)}
            {prompt.use_count > 0 && (
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Used {prompt.use_count}x
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={handleCopy}
            className={`h-7 text-xs ${
              copied 
                ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                : 'border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Copy className="w-3 h-3 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

