// PromptVault Database Types

export type Source = 'chatgpt' | 'gemini' | 'claude' | 'nano_banana' | 'cursor' | 'other';

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  prompt_count?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  parent_id: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  is_auto_generated: boolean;
  created_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  content: string;
  change_notes: string | null;
  effectiveness_score: number | null;
  created_at: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  source: Source;
  category_id: string | null;
  collection_id: string | null;
  effectiveness_score: number | null;
  use_count: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  current_version: number;
  // Relations (when joined)
  category?: Category;
  collection?: Collection;
  tags?: Tag[];
  versions?: PromptVersion[];
}

export interface PromptTag {
  prompt_id: string;
  tag_id: string;
}

// API Request/Response Types
export interface CreatePromptRequest {
  title: string;
  content: string;
  source: Source;
  category_id?: string;
  collection_id?: string;
  effectiveness_score?: number;
  tags?: string[]; // Tag names
  is_favorite?: boolean;
}

export interface UpdatePromptRequest {
  title?: string;
  content?: string;
  source?: Source;
  category_id?: string;
  collection_id?: string;
  effectiveness_score?: number;
  is_favorite?: boolean;
  change_notes?: string; // For version control
}

export interface SearchPromptsRequest {
  query?: string;
  source?: Source;
  category_id?: string;
  collection_id?: string;
  tags?: string[];
  is_favorite?: boolean;
  limit?: number;
  offset?: number;
}

// Collection Request Types
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_public?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_public?: boolean;
}

// Source display info
export const SOURCE_INFO: Record<Source, { label: string; color: string; icon: string }> = {
  chatgpt: { label: 'ChatGPT', color: '#10a37f', icon: '🤖' },
  gemini: { label: 'Gemini', color: '#4285f4', icon: '✨' },
  claude: { label: 'Claude', color: '#d4a574', icon: '🧠' },
  nano_banana: { label: 'Nano Banana', color: '#ffd700', icon: '🍌' },
  cursor: { label: 'Cursor', color: '#7c3aed', icon: '💻' },
  other: { label: 'Other', color: '#6b7280', icon: '📝' },
};

