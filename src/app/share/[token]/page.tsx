'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Copy, 
  Check, 
  Star, 
  Sparkles,
  ExternalLink,
  FolderOpen,
  User
} from 'lucide-react';

interface SharedPrompt {
  id: string;
  title: string;
  content: string;
  source: string;
  effectiveness_score: number | null;
  created_at: string;
  category?: { id: string; name: string; icon: string };
  tags?: { id: string; name: string }[];
}

interface SharedCollection {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
  prompt_count: number;
}

const SOURCE_INFO: Record<string, { label: string; icon: string }> = {
  chatgpt: { label: 'ChatGPT', icon: '🤖' },
  gemini: { label: 'Gemini', icon: '✨' },
  claude: { label: 'Claude', icon: '🧠' },
  nano_banana: { label: 'Nano Banana', icon: '🍌' },
  cursor: { label: 'Cursor', icon: '💻' },
  other: { label: 'Other', icon: '📝' },
};

export default function SharedCollectionPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [collection, setCollection] = useState<SharedCollection | null>(null);
  const [prompts, setPrompts] = useState<SharedPrompt[]>([]);
  const [owner, setOwner] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('This collection is not available or has been unshared.');
          } else {
            setError('Failed to load collection');
          }
          return;
        }
        
        const data = await res.json();
        setCollection(data.collection);
        setPrompts(data.prompts);
        setOwner(data.owner);
      } catch (err) {
        setError('Failed to load collection');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchCollection();
    }
  }, [token]);

  const handleCopy = async (prompt: SharedPrompt) => {
    await navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard flex items-center justify-center">
        <div className="animate-pulse text-zinc-400 flex items-center gap-3">
          <Sparkles className="w-6 h-6 animate-spin" />
          Loading collection...
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-dashboard flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-10 h-10 text-zinc-600" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Collection Not Found</h1>
          <p className="text-zinc-500 mb-6">{error}</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="btn-primary-gradient"
          >
            Go to PromptVault
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#232339]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="PromptVault" className="h-10 w-auto" />
            </a>
            <Button
              onClick={() => window.location.href = '/login'}
              className="btn-primary-gradient"
            >
              Get PromptVault
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Collection Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: collection.color + '30' }}
            >
              {collection.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">{collection.name}</h1>
              {collection.description && (
                <p className="text-zinc-400 mt-1">{collection.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-zinc-500">
            <span className="flex items-center gap-1">
              <FolderOpen className="w-4 h-4" />
              {collection.prompt_count} prompts
            </span>
            {owner && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Shared by {owner.email}
              </span>
            )}
          </div>
        </div>

        {/* Prompts Grid */}
        {prompts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500">This collection is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prompts.map((prompt) => {
              const sourceInfo = SOURCE_INFO[prompt.source] || SOURCE_INFO.other;
              const isCopied = copiedId === prompt.id;
              
              return (
                <Card 
                  key={prompt.id} 
                  className="bg-[#1a1a2e] border-[#3f3f5a] hover:border-[#5f5f7a] transition-all"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{sourceInfo.icon}</span>
                          <h3 className="font-semibold text-zinc-100 truncate">
                            {prompt.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge 
                            variant="outline" 
                            className="border-zinc-700 text-zinc-400"
                          >
                            {sourceInfo.label}
                          </Badge>
                          {prompt.category && (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                              {prompt.category.icon} {prompt.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-sm text-zinc-400 line-clamp-3 leading-relaxed">
                      {prompt.content}
                    </p>
                    
                    {prompt.tags && prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {prompt.tags.slice(0, 4).map((tag) => (
                          <Badge 
                            key={tag.id} 
                            variant="outline"
                            className="text-xs px-2 py-0 border-zinc-700 text-zinc-500"
                          >
                            #{tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {renderStars(prompt.effectiveness_score)}
                      </div>
                      
                      <Button
                        size="sm"
                        variant={isCopied ? "default" : "outline"}
                        onClick={() => handleCopy(prompt)}
                        className={`h-7 text-xs ${
                          isCopied 
                            ? 'bg-emerald-600 hover:bg-emerald-600 text-white' 
                            : 'border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 text-center p-8 bg-[#1a1a2e] rounded-2xl border border-[#3f3f5a]">
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">
            Want to save these prompts?
          </h2>
          <p className="text-zinc-400 mb-6">
            Create your own PromptVault to organize, version, and share your best prompts.
          </p>
          <Button
            onClick={() => window.location.href = '/login'}
            className="btn-primary-gradient px-8"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get Started Free
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-zinc-500 text-sm">
          <p>Powered by <a href="/" className="text-indigo-400 hover:underline">PromptVault</a></p>
        </div>
      </footer>
    </div>
  );
}

