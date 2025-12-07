'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PromptCard } from '@/components/PromptCard';
import { PromptDialog } from '@/components/PromptDialog';
import { VersionHistoryDialog } from '@/components/VersionHistoryDialog';
import { CollectionDialog } from '@/components/CollectionDialog';
import { ShareCollectionDialog } from '@/components/ShareCollectionDialog';
import { Prompt, Category, Tag, Collection, Source, SOURCE_INFO } from '@/types/database';
import { 
  Search, 
  Plus, 
  Star, 
  Sparkles,
  Filter,
  LayoutGrid,
  List,
  Vault,
  LogOut,
  User,
  FolderPlus,
  Folder,
  MoreHorizontal,
  Edit,
  Trash2,
  Share2,
  Globe
} from 'lucide-react';

export default function Home() {
  const supabase = createClient();
  
  // User state
  const [user, setUser] = useState<{ email?: string } | null>(null);
  
  // State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dialogs
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionPrompt, setVersionPrompt] = useState<Prompt | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingCollection, setSharingCollection] = useState<Collection | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase.auth]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Fetch data
  const fetchPrompts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('query', searchQuery);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter);
      if (collectionFilter !== 'all') params.set('collection_id', collectionFilter);
      if (showFavorites) params.set('is_favorite', 'true');
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));

      const res = await fetch(`/api/prompts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    }
  }, [searchQuery, sourceFilter, categoryFilter, collectionFilter, showFavorites, selectedTags]);

  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchPrompts(), fetchCategories(), fetchTags(), fetchCollections()])
      .finally(() => setLoading(false));
  }, [fetchPrompts]);

  // Handlers
  const handleSavePrompt = async (data: {
    title: string;
    content: string;
    source: Source;
    category_id?: string;
    collection_id?: string;
    effectiveness_score?: number;
    tags?: string[];
    is_favorite?: boolean;
    change_notes?: string;
  }) => {
    try {
      const url = editingPrompt ? `/api/prompts/${editingPrompt.id}` : '/api/prompts';
      const method = editingPrompt ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to save prompt');

      await fetchPrompts();
      await fetchTags(); // Refresh tags in case new ones were created
      setEditingPrompt(null);
    } catch (err) {
      console.error('Error saving prompt:', err);
      alert('Failed to save prompt');
    }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    try {
      const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete prompt');
      await fetchPrompts();
    } catch (err) {
      console.error('Error deleting prompt:', err);
      alert('Failed to delete prompt');
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const res = await fetch(`/api/prompts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: isFavorite }),
      });
      if (!res.ok) throw new Error('Failed to update prompt');
      await fetchPrompts();
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const handleViewVersions = async (prompt: Prompt) => {
    // Fetch full prompt with versions
    try {
      const res = await fetch(`/api/prompts/${prompt.id}`);
      if (res.ok) {
        const data = await res.json();
        setVersionPrompt(data.prompt);
        setVersionDialogOpen(true);
      }
    } catch (err) {
      console.error('Error fetching versions:', err);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setPromptDialogOpen(true);
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Collection handlers
  const handleEditCollection = (collection: Collection) => {
    setEditingCollection(collection);
    setCollectionDialogOpen(true);
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Delete this collection? Prompts will be moved to "All Prompts".')) return;
    
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCollections();
        if (collectionFilter === id) {
          setCollectionFilter('all');
        }
      }
    } catch (err) {
      console.error('Error deleting collection:', err);
    }
  };

  const handleShareCollection = (collection: Collection) => {
    setSharingCollection(collection);
    setShareDialogOpen(true);
  };

  // Stats
  const stats = {
    total: prompts.length,
    favorites: prompts.filter(p => p.is_favorite).length,
    thisWeek: prompts.filter(p => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(p.created_at) > weekAgo;
    }).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dashboard flex items-center justify-center">
        <div className="animate-pulse text-zinc-400 flex items-center gap-3">
          <Sparkles className="w-6 h-6 animate-spin" />
          Loading your prompts...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dashboard text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#232339]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.svg" 
                alt="PromptVault Icon" 
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-xl font-bold text-zinc-100">PromptVault</h1>
                <p className="text-xs text-zinc-500">Your prompt engineering companion</p>
              </div>
            </div>

            {/* Right Side - Add Prompt + User Menu */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  setEditingPrompt(null);
                  setPromptDialogOpen(true);
                }}
                className="btn-primary-gradient"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Prompt
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <p className="text-xs text-zinc-500">Signed in as</p>
                  <p className="text-sm text-zinc-300 truncate max-w-[200px]">
                    {user?.email || 'User'}
                  </p>
                </div>
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/billing'}
                  className="text-amber-400 focus:bg-amber-950 focus:text-amber-300 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-950 focus:text-red-300 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Collections Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Collections
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingCollection(null);
                setCollectionDialogOpen(true);
              }}
              className="text-zinc-400 hover:text-zinc-100 h-7 px-2"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {/* All Prompts */}
            <button
              onClick={() => setCollectionFilter('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                collectionFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              📚 All Prompts
              <span className="ml-2 text-xs opacity-70">{prompts.length}</span>
            </button>
            
            {/* Collections */}
            {collections.map((collection) => (
              <div key={collection.id} className="flex-shrink-0 group relative">
                <button
                  onClick={() => setCollectionFilter(collection.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    collectionFilter === collection.id
                      ? 'text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                  style={{
                    backgroundColor: collectionFilter === collection.id ? collection.color : undefined,
                  }}
                >
                  <span>{collection.icon}</span>
                  <span className="max-w-[120px] truncate">{collection.name}</span>
                  {collection.is_public && collection.share_token && (
                    <Globe className="w-3 h-3 text-emerald-400" />
                  )}
                  <span className="text-xs opacity-70">{collection.prompt_count || 0}</span>
                </button>
                
                {/* Collection Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                    <DropdownMenuItem
                      onClick={() => handleShareCollection(collection)}
                      className="text-zinc-300 focus:bg-zinc-800 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                      {collection.is_public && collection.share_token && (
                        <Globe className="w-3 h-3 ml-auto text-emerald-400" />
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleEditCollection(collection)}
                      className="text-zinc-300 focus:bg-zinc-800 cursor-pointer"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="text-red-400 focus:bg-red-950 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-zinc-100">{stats.total}</div>
            <div className="text-sm text-zinc-500">Total Prompts</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-amber-400">{stats.favorites}</div>
            <div className="text-sm text-zinc-500">Favorites</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="text-3xl font-bold text-emerald-400">{stats.thisWeek}</div>
            <div className="text-sm text-zinc-500">Added This Week</div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-lg"
            />
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Source Filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px] bg-zinc-900 border-zinc-800 text-zinc-100">
                <Filter className="w-4 h-4 mr-2 text-zinc-500" />
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all" className="text-zinc-300">All Sources</SelectItem>
                {Object.entries(SOURCE_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key} className="text-zinc-300">
                    {info.icon} {info.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-800 text-zinc-100">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all" className="text-zinc-300">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-zinc-300">
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Favorites Toggle */}
            <Button
              variant={showFavorites ? "default" : "outline"}
              onClick={() => setShowFavorites(!showFavorites)}
              className={showFavorites 
                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                : "border-zinc-700 text-zinc-400 hover:text-zinc-100"
              }
            >
              <Star className={`w-4 h-4 mr-2 ${showFavorites ? 'fill-current' : ''}`} />
              Favorites
            </Button>

            {/* View Toggle */}
            <div className="ml-auto">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="bg-zinc-900 border border-zinc-800">
                  <TabsTrigger value="grid" className="data-[state=active]:bg-zinc-800">
                    <LayoutGrid className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-zinc-800">
                    <List className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Tags Filter */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 15).map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className={`cursor-pointer transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                  onClick={() => toggleTag(tag.name)}
                >
                  #{tag.name}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="text-zinc-500 hover:text-zinc-300 h-6 px-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 mb-8 text-red-400">
            {error}
          </div>
        )}

        {/* Empty State */}
        {prompts.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">No prompts yet</h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
              Start building your prompt library! Add your first prompt to begin improving your prompt engineering skills.
            </p>
            <Button 
              onClick={() => {
                setEditingPrompt(null);
                setPromptDialogOpen(true);
              }}
              className="btn-primary-gradient"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Prompt
            </Button>
          </div>
        )}

        {/* Prompts Grid/List */}
        {prompts.length > 0 && (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-4'
          }>
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={prompt}
                onEdit={handleEdit}
                onDelete={handleDeletePrompt}
                onToggleFavorite={handleToggleFavorite}
                onViewVersions={handleViewVersions}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <PromptDialog
        open={promptDialogOpen}
        onOpenChange={(open) => {
          setPromptDialogOpen(open);
          if (!open) setEditingPrompt(null);
        }}
        prompt={editingPrompt}
        categories={categories}
        collections={collections}
        existingTags={tags}
        onSave={handleSavePrompt}
      />

      <VersionHistoryDialog
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
        prompt={versionPrompt}
      />

      <CollectionDialog
        open={collectionDialogOpen}
        onOpenChange={(open) => {
          setCollectionDialogOpen(open);
          if (!open) setEditingCollection(null);
        }}
        collection={editingCollection}
        onSave={() => {
          fetchCollections();
        }}
      />

      <ShareCollectionDialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) setSharingCollection(null);
        }}
        collection={sharingCollection}
        onUpdate={() => {
          fetchCollections();
        }}
      />
    </div>
  );
}
